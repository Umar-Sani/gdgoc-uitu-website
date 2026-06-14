import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import eventsRouter from './routes/events';
import paymentsRouter from './routes/payments';
import forumRouter from './routes/forum';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import cmsRouter from './routes/cms';
import socialRouter from './routes/social';
import uploadRouter from './routes/upload';
import notificationsRouter from './routes/notifications';
import { pool } from './db/client';

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ── Security headers ──────────────────────────────────────────────────────────
// contentSecurityPolicy disabled — this is an API server; CSP is handled by Next.js
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Global: 300 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Too many requests, please try again later.' },
}));

// Stricter: 20 requests per minute for write-heavy endpoints (uploads, social)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Too many requests, please slow down.' },
});

// ─── IMPORTANT: Stripe webhook needs raw body for signature verification ─────
// This must be registered BEFORE express.json() middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing with size limits ─────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: true, limit: '50kb' }))

// ── Health check (pings DB) ───────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable', timestamp: new Date().toISOString() });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/events',        eventsRouter);
app.use('/api/forum',         forumRouter);
app.use('/api/payments',      paymentsRouter);
app.use('/api/users',         usersRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/cms',           cmsRouter);
app.use('/api/social',        writeLimiter, socialRouter);
app.use('/api/upload',        writeLimiter, uploadRouter);
app.use('/api/notifications', notificationsRouter);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches any error passed via next(err) — hides internal details in production
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const ref = Date.now().toString(36);
  console.error(`[error:${ref}]`, err);
  res.status(err.status ?? 500).json({
    data: null,
    error: process.env.NODE_ENV === 'production'
      ? `Something went wrong (ref: ${ref})`
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`)
})

export default app
