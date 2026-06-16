import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { sendWelcomeEmail } from '../lib/mailer';
import { validate, updateProfileSchema, updatePreferencesSchema } from '../lib/validate';

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
router.patch('/me', requireAuth, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { full_name, username, bio, skill_tags, avatar_url } = req.body;

    // Detect first-time profile completion (username was null before this update)
    const currentRow = await pool.query(
      'SELECT username, full_name FROM users.users WHERE user_id = $1',
      [userId]
    );
    const isFirstUsername = !currentRow.rows[0]?.username && username;

    const result = await pool.query(
      `UPDATE users.users SET
        full_name  = COALESCE($1, full_name),
        username   = COALESCE($2, username),
        bio        = COALESCE($3, bio),
        skill_tags = COALESCE($4, skill_tags),
        avatar_url = COALESCE($5, avatar_url),
        updated_at = NOW()
      WHERE user_id = $6
      RETURNING user_id, full_name, username, bio, skill_tags, avatar_url, is_verified`,
      [full_name ?? null, username ?? null, bio ?? null, skill_tags ?? null, avatar_url ?? null, userId]
    );

    // Fire welcome email when a user sets their username for the first time
    if (isFirstUsername) {
      const name = result.rows[0]?.full_name || currentRow.rows[0]?.full_name;
      pool.query('SELECT email FROM auth.users WHERE id = $1', [userId])
        .then(r => {
          const email = r.rows[0]?.email;
          if (email && name) {
            sendWelcomeEmail({
              to: email,
              name,
              username: username.trim().toLowerCase(),
              dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
            }).catch(() => {});
          }
        }).catch(() => {});
    }

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

const INAPP_DEFAULTS = {
  new_reply: true, mention: true, upvote_received: true,
  event_reminder: true, registration_confirmed: true,
  report_reviewed: true, system_announcement: true,
};
const EMAIL_DEFAULTS = {
  mention: true, event_reminder: true, system_announcement: true,
  new_reply: false, upvote_received: false, report_reviewed: false,
};

// GET /api/users/me/preferences
router.get('/me/preferences', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const r = await pool.query(
      'SELECT * FROM users.notification_preferences WHERE user_id = $1',
      [userId]
    );
    res.json({
      data: r.rows[0] ?? {
        user_id: userId,
        email_enabled: false,
        inapp: INAPP_DEFAULTS,
        email: EMAIL_DEFAULTS,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/users/me/preferences
// Body: { email_enabled?: boolean, inapp?: Partial<Record<type, boolean>>, email?: Partial<Record<type, boolean>> }
router.patch('/me/preferences', requireAuth, validate(updatePreferencesSchema), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { email_enabled, inapp, email: emailPrefs } = req.body;

  if (email_enabled === undefined && inapp === undefined && emailPrefs === undefined) {
    return res.status(400).json({ data: null, error: 'No valid fields to update' });
  }

  try {
    // Merge JSONB partial updates using || operator.
    // INSERT must supply NOT NULL defaults for inapp/email when not provided,
    // because passing null::jsonb into a NOT NULL column would throw a constraint error.
    const r = await pool.query(
      `INSERT INTO users.notification_preferences (user_id, email_enabled, inapp, email, updated_at)
       VALUES (
         $1,
         COALESCE($2, FALSE),
         COALESCE($3::jsonb, '{"new_reply":true,"mention":true,"upvote_received":true,"event_reminder":true,"registration_confirmed":true,"report_reviewed":true,"system_announcement":true}'::jsonb),
         COALESCE($4::jsonb, '{"mention":true,"event_reminder":true,"system_announcement":true,"new_reply":false,"upvote_received":false,"report_reviewed":false}'::jsonb),
         NOW()
       )
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = COALESCE($2, notification_preferences.email_enabled),
         inapp  = notification_preferences.inapp  || COALESCE($3::jsonb, '{}'::jsonb),
         email  = notification_preferences.email  || COALESCE($4::jsonb, '{}'::jsonb),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        email_enabled ?? null,
        inapp      ? JSON.stringify(inapp)      : null,
        emailPrefs ? JSON.stringify(emailPrefs) : null,
      ]
    );

    // Sync master email toggle with content.newsletter_subscribers
    if (email_enabled !== undefined) {
      const emailRow = await pool.query('SELECT email FROM auth.users WHERE id = $1', [userId]);
      const userEmail = emailRow.rows[0]?.email;
      if (userEmail) {
        if (email_enabled) {
          await pool.query(
            `INSERT INTO content.newsletter_subscribers (email)
             VALUES ($1) ON CONFLICT (email) DO UPDATE SET is_active = TRUE`,
            [userEmail]
          );
        } else {
          await pool.query(
            `UPDATE content.newsletter_subscribers SET is_active = FALSE WHERE email = $1`,
            [userEmail]
          );
        }
      }
    }

    res.json({ data: r.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/users/search
// Public (or authenticated) — search users by username for mentions
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.json({ data: [], error: null });
    }

    const result = await pool.query(
      `SELECT username, full_name, avatar_url 
       FROM users.users 
       WHERE username ILIKE $1 
       LIMIT 10`,
      [`${q}%`]
    );

    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;