import type { Request, Response, NextFunction } from 'express';

// ── Cloudflare Turnstile verification (TODO-024) ─────────────────────────────
// Guards unauthenticated public writes (contact form, newsletter) against scripted abuse.
//
// Dormant by design until TURNSTILE_SECRET_KEY is configured: with no secret this
// middleware is a pass-through, so deploying the code before the keys exist does not
// break the forms. A boot warning makes the dormant state visible. Once the secret is set
// it fails CLOSED — a missing token, a rejected token, or Cloudflare being unreachable
// all block the request.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

if (!process.env.TURNSTILE_SECRET_KEY) {
  console.warn('⚠️  TURNSTILE_SECRET_KEY not set — captcha on public forms is DISABLED.');
}

export async function requireCaptcha(req: Request, res: Response, next: NextFunction) {
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
      signal: AbortSignal.timeout(5000),
    });
    const result = (await cf.json()) as { success?: boolean };

    if (!result.success) {
      return res.status(400).json({ data: null, error: 'Captcha verification failed. Please try again.' });
    }
    return next();
  } catch (err: any) {
    console.error('Turnstile verification error:', err.message);
    return res.status(503).json({ data: null, error: 'Captcha verification is temporarily unavailable.' });
  }
}
