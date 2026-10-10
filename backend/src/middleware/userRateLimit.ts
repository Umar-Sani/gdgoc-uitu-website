import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ── Per-user rate limiting (TODO-019) ─────────────────────────────────────────
// The global limiter in index.ts is keyed on IP. That has two blind spots:
//   - one signed-in user behind many IPs (a botnet, rotating proxies) is never counted
//     as a single actor;
//   - many users behind ONE IP (a campus NAT) all share a single bucket.
// These limiters key on the authenticated user id instead. They run *after* a request
// has been authenticated (see requireAuth), so the key is a verified identity and cannot
// be forged to dodge the limit. The IP limiter still applies on top.
//
// Counters live in process memory: correct for the single Railway instance this runs on,
// but each replica would keep its own count if the backend is ever scaled out — move to a
// shared store (Redis, TODO-052) at that point.

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const userKey = (req: Request): string => (req as any).user?.id ?? 'anonymous';

type LimiterOptions = { windowMs: number; max: number; message: string };

export function createUserLimiter({ windowMs, max, message }: LimiterOptions): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    message: { data: null, error: message },
  });
}

// Every authenticated request, any method. Env-tunable so limits can change without a
// code edit (and so tests can exercise them cheaply).
const userGeneral = createUserLimiter({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.USER_RATE_LIMIT_MAX, 600),
  message: 'You are making too many requests. Please slow down and try again shortly.',
});

// State-changing requests only (POST/PUT/PATCH/DELETE).
const userWrites = createUserLimiter({
  windowMs: 60 * 1000,
  max: num(process.env.USER_WRITE_RATE_LIMIT_MAX, 60),
  message: 'You are making changes too quickly. Please wait a moment and try again.',
});

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Called by requireAuth once req.user is set.
export function applyUserRateLimits(req: Request, res: Response, next: NextFunction) {
  userGeneral(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!WRITE_METHODS.has(req.method)) return next();
    userWrites(req, res, next);
  });
}

// ── Named, stricter limiters for content-creation routes ─────────────────────
// Mount after requireAuth/requireUsername on the specific route.
export const forumThreadLimiter = createUserLimiter({
  windowMs: 60 * 60 * 1000,
  max: num(process.env.FORUM_THREAD_LIMIT_PER_HOUR, 10),
  message: 'You have created too many threads recently. Please try again later.',
});

export const forumReplyLimiter = createUserLimiter({
  windowMs: 10 * 60 * 1000,
  max: num(process.env.FORUM_REPLY_LIMIT_PER_10MIN, 30),
  message: 'You are replying too quickly. Please wait a few minutes and try again.',
});
