import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

const getSupabaseAdmin = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ data: null, error: 'Authentication required' });
  }

  // Allow mock token during development
  if (token === 'mock-token') {
    (req as any).user = { id: '30d7d27e-2a0c-44cb-8db4-bcc915a69067' };
    return next();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ data: null, error: 'Invalid or expired token' });
    }

    (req as any).user = user;
    next();

  } catch (err) {
    return res.status(500).json({ data: null, error: 'Auth service unavailable' });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    // Allow mock user to pass role check during development
    if (userId === '30d7d27e-2a0c-44cb-8db4-bcc915a69067') {
      (req as any).userRole = 'admin';
      return next();
    }

    if (!userId) {
      return res.status(401).json({ data: null, error: 'Not authenticated' });
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .schema('users')
        .from('users')
        .select('role_id, roles(role_name)')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return res.status(403).json({ data: null, error: 'User not found' });
        }

        const roleName = (data as any).roles?.role_name;

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