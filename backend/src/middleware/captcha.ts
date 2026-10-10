import type { Request, Response, NextFunction } from 'express';

// ── Cloudflare Turnstile verification (TODO-024) ─────────────────────────────
// Guards unauthenticated public writes (contact form, newsletter) against scripted abuse.
//
// Dormant by design until TURNSTILE_SECRET_KEY is configured: with no secret this
// middleware is a pass-through, so deploying the code before the keys exist does not
// break the forms. A boot warning makes the dormant state visible. Once the secret is set
// it fails CLOSED — a missing token, a rejected token, a token minted for another action
// or hostname, or Cloudflare being unreachable all block the request.
//
// Beyond "success: true", two bindings stop a valid token being replayed somewhere else:
//   - `action`   must equal the surface the widget was rendered for ('contact', …)
//   - `hostname` must be one of OUR frontend hostnames (derived from FRONTEND_URL; set
//                TURNSTILE_HOSTNAMES=a.com,b.com to override). localhost is only allowed
//                outside production.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's documented dummy secrets (always pass / always fail / token already spent).
// They return a fixed fake hostname and action, so the binding checks are skipped for them
// — this only matters for local testing and can't weaken a real secret.
const isDummySecret = (s: string) => /^[123]x0+AA$/.test(s);

function allowedHostnames(): Set<string> {
  const out = new Set<string>();
  const override = process.env.TURNSTILE_HOSTNAMES;
  if (override) {
    override.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean).forEach((h) => out.add(h));
    return out;
  }
  try {
    if (process.env.FRONTEND_URL) out.add(new URL(process.env.FRONTEND_URL).hostname.toLowerCase());
  } catch { /* ignore malformed FRONTEND_URL */ }
  if (process.env.NODE_ENV !== 'production') {
    out.add('localhost');
    out.add('127.0.0.1');
  }
  return out;
}

if (!process.env.TURNSTILE_SECRET_KEY) {
  console.warn('⚠️  TURNSTILE_SECRET_KEY not set — captcha on public forms is DISABLED.');
}

type SiteverifyResult = { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };

// `action` names the protected surface ('contact', 'newsletter') and must match the
// `action` the frontend widget was rendered with.
export function requireCaptcha(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return next();

    const token = req.body?.captcha_token;
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
      return res.status(400).json({ data: null, error: 'Please complete the captcha and try again.' });
    }

    try {
      const form = new URLSearchParams({ secret, response: token });
      if (req.ip) form.set('remoteip', req.ip);

      const cf = await fetch(VERIFY_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(10_000),
      });
      if (!cf.ok) throw new Error(`siteverify HTTP ${cf.status}`);
      const result = (await cf.json()) as SiteverifyResult;

      if (!result.success) {
        if (result['error-codes']?.includes('invalid-input-secret')) {
          // Misconfiguration, not user error: the secret on this server is wrong.
          console.error('Turnstile: invalid-input-secret — check TURNSTILE_SECRET_KEY');
        }
        return res.status(400).json({ data: null, error: 'Captcha verification failed. Please try again.' });
      }

      if (!isDummySecret(secret)) {
        const host = (result.hostname ?? '').toLowerCase();
        if (result.action !== action || !allowedHostnames().has(host)) {
          console.warn(`Turnstile binding mismatch: action=${result.action} hostname=${host} (expected ${action})`);
          return res.status(400).json({ data: null, error: 'Captcha verification failed. Please try again.' });
        }
      }
      return next();
    } catch (err: any) {
      console.error('Turnstile verification error:', err.message);
      return res.status(503).json({ data: null, error: 'Captcha verification is temporarily unavailable.' });
    }
  };
}
