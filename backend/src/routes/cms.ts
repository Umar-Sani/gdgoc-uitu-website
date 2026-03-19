import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────

// GET /api/cms/homepage
router.get('/homepage', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM content.homepage LIMIT 1');
    res.json({ data: result.rows[0] ?? null, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/homepage
router.patch('/homepage', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { hero_title, hero_subtitle, hero_cta_text, hero_cta_url, stats_members, stats_events, stats_projects, announcement } = req.body;

    const result = await pool.query(
      `UPDATE content.homepage SET
        hero_title    = COALESCE($1, hero_title),
        hero_subtitle = COALESCE($2, hero_subtitle),
        hero_cta_text = COALESCE($3, hero_cta_text),
        hero_cta_url  = COALESCE($4, hero_cta_url),
        stats_members = COALESCE($5, stats_members),
        stats_events  = COALESCE($6, stats_events),
        stats_projects = COALESCE($7, stats_projects),
        announcement  = COALESCE($8, announcement),
        updated_by    = $9,
        updated_at    = NOW()
      WHERE id = 1
      RETURNING *`,
      [hero_title ?? null, hero_subtitle ?? null, hero_cta_text ?? null, hero_cta_url ?? null,
       stats_members ?? null, stats_events ?? null, stats_projects ?? null, announcement ?? null, userId]
    );

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── ABOUT SECTIONS ───────────────────────────────────────────────────────────

// GET /api/cms/about
router.get('/about', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM content.about_sections ORDER BY display_order ASC');
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/about/:id
router.patch('/about/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, body } = req.body;

    const result = await pool.query(
      `UPDATE content.about_sections SET
        title      = COALESCE($1, title),
        body       = COALESCE($2, body),
        updated_by = $3,
        updated_at = NOW()
      WHERE section_id = $4
      RETURNING *`,
      [title ?? null, body ?? null, userId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Section not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────

// GET /api/cms/team
router.get('/team', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content.team_members ORDER BY display_order ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/team
router.post('/team', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { full_name, role_title, bio, avatar_url, linkedin_url, github_url, display_order } = req.body;

    if (!full_name || !role_title) {
      return res.status(400).json({ data: null, error: 'full_name and role_title are required' });
    }

    const result = await pool.query(
      `INSERT INTO content.team_members (full_name, role_title, bio, avatar_url, linkedin_url, github_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [full_name, role_title, bio ?? null, avatar_url ?? null, linkedin_url ?? null, github_url ?? null, display_order ?? 0]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/team/:id
router.patch('/team/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { full_name, role_title, bio, avatar_url, linkedin_url, github_url, display_order, is_active } = req.body;

    const result = await pool.query(
      `UPDATE content.team_members SET
        full_name     = COALESCE($1, full_name),
        role_title    = COALESCE($2, role_title),
        bio           = COALESCE($3, bio),
        avatar_url    = COALESCE($4, avatar_url),
        linkedin_url  = COALESCE($5, linkedin_url),
        github_url    = COALESCE($6, github_url),
        display_order = COALESCE($7, display_order),
        is_active     = COALESCE($8, is_active),
        updated_at    = NOW()
      WHERE member_id = $9
      RETURNING *`,
      [full_name ?? null, role_title ?? null, bio ?? null, avatar_url ?? null,
       linkedin_url ?? null, github_url ?? null, display_order ?? null, is_active ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Team member not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/cms/team/:id
router.delete('/team/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM content.team_members WHERE member_id = $1', [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GALLERY ──────────────────────────────────────────────────────────────────

// GET /api/cms/gallery
router.get('/gallery', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content.gallery ORDER BY display_order ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/gallery
router.post('/gallery', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, media_url, media_type, event_id, category, display_order } = req.body;

    if (!media_url) {
      return res.status(400).json({ data: null, error: 'media_url is required' });
    }

    const result = await pool.query(
      `INSERT INTO content.gallery (title, media_url, media_type, event_id, category, display_order, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title ?? null, media_url, media_type ?? 'image', event_id ?? null, category ?? null, display_order ?? 0, userId]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/cms/gallery/:id
router.delete('/gallery/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM content.gallery WHERE item_id = $1', [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── SPONSORS ─────────────────────────────────────────────────────────────────

// GET /api/cms/sponsors
router.get('/sponsors', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content.sponsors WHERE is_active = true ORDER BY display_order ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/sponsors
router.post('/sponsors', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { name, logo_url, website_url, tier, description, display_order } = req.body;

    if (!name) {
      return res.status(400).json({ data: null, error: 'name is required' });
    }

    const result = await pool.query(
      `INSERT INTO content.sponsors (name, logo_url, website_url, tier, description, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [name, logo_url ?? null, website_url ?? null, tier ?? 'bronze', description ?? null, display_order ?? 0]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/sponsors/:id
router.patch('/sponsors/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { name, logo_url, website_url, tier, description, display_order, is_active } = req.body;

    const result = await pool.query(
      `UPDATE content.sponsors SET
        name          = COALESCE($1, name),
        logo_url      = COALESCE($2, logo_url),
        website_url   = COALESCE($3, website_url),
        tier          = COALESCE($4, tier),
        description   = COALESCE($5, description),
        display_order = COALESCE($6, display_order),
        is_active     = COALESCE($7, is_active),
        updated_at    = NOW()
      WHERE sponsor_id = $8
      RETURNING *`,
      [name ?? null, logo_url ?? null, website_url ?? null, tier ?? null,
       description ?? null, display_order ?? null, is_active ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Sponsor not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/cms/sponsors/:id
router.delete('/sponsors/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM content.sponsors WHERE sponsor_id = $1', [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/contact
// Public — submit a contact form
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { full_name, email, subject, message } = req.body;

    if (!full_name || !email || !message) {
      return res.status(400).json({
        data: null,
        error: 'Missing required fields: full_name, email, message',
      });
    }

    const result = await pool.query(
      `INSERT INTO content.contact_submissions (sender_name, sender_email, subject, message)
      VALUES ($1, $2, $3, $4)
      RETURNING submission_id, submitted_at`,
      [full_name.trim(), email.trim().toLowerCase(), subject?.trim() ?? null, message.trim()]
    );

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/cms/contact error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/newsletter
// Public — subscribe to newsletter
router.post('/newsletter', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        data: null,
        error: 'A valid email address is required.',
      });
    }

    // Upsert — if email exists just reactivate
    const result = await pool.query(
      `INSERT INTO content.newsletter_subscribers (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
       SET is_active = TRUE, name = COALESCE($2, newsletter_subscribers.name)
       RETURNING subscriber_id, email, subscribed_at`,
      [email.trim().toLowerCase(), name?.trim() ?? null]
    );

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/cms/newsletter error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;