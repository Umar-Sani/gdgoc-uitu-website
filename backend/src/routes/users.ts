import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/users/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT 
        u.user_id, u.email, u.full_name, u.username,
        u.avatar_url, u.bio, u.skill_tags,
        u.is_verified, u.is_active,
        u.created_at, u.last_login,
        r.role_name
      FROM users.users u
      JOIN users.roles r ON u.role_id = r.role_id
      WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found' });
    }

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { full_name, username, bio, skill_tags, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users.users SET
        full_name  = COALESCE($1, full_name),
        username   = COALESCE($2, username),
        bio        = COALESCE($3, bio),
        skill_tags = COALESCE($4, skill_tags),
        avatar_url = COALESCE($5, avatar_url),
        updated_at = NOW()
      WHERE user_id = $6
      RETURNING user_id, email, full_name, username, bio, skill_tags, avatar_url, is_verified`,
      [full_name ?? null, username ?? null, bio ?? null, skill_tags ?? null, avatar_url ?? null, userId]
    );

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/users/me/registrations
router.get('/me/registrations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT 
        r.registration_id,
        r.registered_at,
        e.event_id,
        e.title,
        e.start_datetime,
        e.end_datetime,
        e.venue,
        e.is_free,
        e.ticket_price,
        e.event_type,
        ec.name as category_name,
        ec.color_hex as category_color
      FROM events.registrations r
      JOIN events.events e ON r.event_id = e.event_id
      LEFT JOIN events.categories ec ON e.category_id = ec.category_id
      WHERE r.user_id = $1
      ORDER BY e.start_datetime DESC`,
      [userId]
    );

    res.json({ data: result.rows, error: null });

  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/recommendations/generate
router.post('/recommendations/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await pool.query(
      'CALL public.generate_ai_recommendations($1)',
      [userId]
    );

    // Fetch the generated recommendations
    const result = await pool.query(
      `SELECT 
        r.recommendation_id,
        r.score,
        r.reason,
        r.created_at,
        e.event_id,
        e.title,
        e.start_datetime,
        e.venue,
        e.is_free,
        e.ticket_price,
        e.event_type
      FROM ai_metadata.recommendations r
      JOIN events.events e ON r.event_id = e.event_id
      WHERE r.user_id = $1
      ORDER BY r.score DESC
      LIMIT 5`,
      [userId]
    );

    res.json({ data: result.rows, error: null });

  } catch (err: any) {
    console.error('POST /api/recommendations/generate error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;