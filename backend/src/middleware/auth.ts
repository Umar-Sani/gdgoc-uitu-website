import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db/client';
import { applyUserRateLimits } from './userRateLimit';

const getSupabaseAdmin = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Mock-auth bypass (local development only) ───────────────────────────────
// `Authorization: Bearer mock-token` skips Supabase and acts as a fixed admin. It is
// opt-in (ALLOW_MOCK_AUTH=true) and fails closed in two independent ways, so a single
// misconfigured variable on a hosted environment cannot expose it (TODO-013):
//   1. NODE_ENV=production + ALLOW_MOCK_AUTH=true  -> the process refuses to start.
//   2. FRONTEND_URL pointing anywhere but localhost -> bypass stays off. This catches
//      a hosted deploy where NODE_ENV was simply never set.
const WANTS_MOCK = process.env.ALLOW_MOCK_AUTH === 'true';

function frontendIsLocal(): boolean {
  const raw = process.env.FRONTEND_URL;
  if (!raw) return true; // unset -> index.ts defaults CORS to http://localhost:3000
  try {
    const host = new URL(raw).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}

if (WANTS_MOCK && process.env.NODE_ENV === 'production') {
  throw new Error(
    'ALLOW_MOCK_AUTH=true is not permitted when NODE_ENV=production. ' +
    'Remove ALLOW_MOCK_AUTH from this environment.'
  );
}

const MOCK_ENABLED = WANTS_MOCK && frontendIsLocal();

if (WANTS_MOCK && !MOCK_ENABLED) {
  console.warn('⚠️  ALLOW_MOCK_AUTH is set but FRONTEND_URL is not localhost — mock auth stays DISABLED.');
} else if (MOCK_ENABLED) {
  console.warn('⚠️  Mock auth ENABLED (ALLOW_MOCK_AUTH=true) — "Bearer mock-token" acts as an admin. Local development only.');
}

const MOCK_UUID = '30d7d27e-2a0c-44cb-8db4-bcc915a69067';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ data: null, error: 'Authentication required' });
  }

  if (MOCK_ENABLED && token === 'mock-token') {
    (req as any).user = { id: MOCK_UUID };
    return applyUserRateLimits(req, res, next);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ data: null, error: 'Invalid or expired token' });
    }

    (req as any).user = user;
    // Per-user limits key on the identity just verified above (TODO-019).
    return applyUserRateLimits(req, res, next);

  } catch (err) {
    return res.status(500).json({ data: null, error: 'Auth service unavailable' });
  }
}

export async function requireUsername(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ data: null, error: 'Not authenticated' });
  }

  if (MOCK_ENABLED && userId === MOCK_UUID) {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT username FROM users.users WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows[0]?.username) {
      return res.status(403).json({
        data: null,
        error: 'Please complete your profile setup before performing this action.',
        code: 'PROFILE_INCOMPLETE',
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ data: null, error: 'Profile check failed' });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    if (MOCK_ENABLED && userId === MOCK_UUID) {
      (req as any).userRole = 'admin';
      return next();
    }

    if (!userId) {
      return res.status(401).json({ data: null, error: 'Not authenticated' });
    }

    try {
      const result = await pool.query(
        `SELECT r.role_name
         FROM users.users u
         JOIN users.roles r ON u.role_id = r.role_id
         WHERE u.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ data: null, error: 'User not found' });
      }

      const roleName = result.rows[0].role_name;

      if (!roles.includes(roleName)) {
        return res.status(403).json({
          data: null,
          error: `Access denied. Required role: ${roles.join(' or ')}`,
        });
      }

      (req as any).userRole = roleName;
      next();

    } catch (err) {
      return res.status(500).json({ data: null, error: 'Authorization check failed' });
    }
  };
}