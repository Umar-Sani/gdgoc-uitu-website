import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendNewsletterWelcome } from '../lib/mailer';

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
// Pass ?all=true to include inactive members (admin use)
router.get('/team', async (req: Request, res: Response) => {
  try {
    const includeAll = req.query.all === 'true';
    const result = await pool.query(`
      SELECT tm.*
      FROM content.team_members tm
      LEFT JOIN content.teams t ON tm.team_name = t.name
      ${includeAll ? '' : "WHERE tm.is_active = true OR tm.section = 'past_leader'"}
      ORDER BY
        CASE tm.section
          WHEN 'gdg_lead'    THEN 1
          WHEN 'co_lead'     THEN 2
          WHEN 'member'      THEN 3
          WHEN 'mentor'      THEN 4
          WHEN 'past_leader' THEN 5
          ELSE 6
        END ASC,
        COALESCE(t.display_order, 999) ASC,
        tm.display_order ASC
    `);
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/team
router.post('/team', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      full_name, role_title, bio, avatar_url, linkedin_url, github_url,
      display_order, is_active, section, team_name, tenure_year,
    } = req.body;

    if (!full_name || !role_title) {
      return res.status(400).json({ data: null, error: 'full_name and role_title are required' });
    }

    const result = await pool.query(
      `INSERT INTO content.team_members
        (full_name, role_title, bio, avatar_url, linkedin_url, github_url, display_order, is_active, section, team_name, tenure_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        full_name, role_title, bio ?? null, avatar_url ?? null, linkedin_url ?? null, github_url ?? null,
        display_order ?? 0, is_active ?? true, section ?? 'member', team_name ?? null, tenure_year ?? null,
      ]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/team/:id
router.patch('/team/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      full_name, role_title, bio, avatar_url, linkedin_url, github_url,
      display_order, is_active, section, team_name, tenure_year,
    } = req.body;

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
        section       = COALESCE($9, section),
        team_name     = $10,
        tenure_year   = $11,
        updated_at    = NOW()
      WHERE member_id = $12
      RETURNING *`,
      [full_name ?? null, role_title ?? null, bio ?? null, avatar_url ?? null,
       linkedin_url ?? null, github_url ?? null, display_order ?? null, is_active ?? null,
       section ?? null, team_name ?? null, tenure_year ?? null, req.params.id]
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

// ─── TEAMS (groupings members can belong to) ────────────────────────────────

// GET /api/cms/teams — list all teams
router.get('/teams', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content.teams ORDER BY display_order ASC, name ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/teams — create a team
router.post('/teams', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { name, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ data: null, error: 'Team name is required' });
    }
    const result = await pool.query(
      `INSERT INTO content.teams (name, display_order) VALUES ($1, $2) RETURNING *`,
      [name.trim(), display_order ?? 0]
    );
    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ data: null, error: 'A team with that name already exists' });
    }
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/teams/:id — rename or reorder a team
router.patch('/teams/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, display_order } = req.body;
    const newName = typeof name === 'string' ? name.trim() : null;

    await client.query('BEGIN');

    // Capture the current name first so we can cascade a rename to members (their
    // team_name is stored as plain text and would otherwise be orphaned).
    const current = await client.query(
      'SELECT name FROM content.teams WHERE team_id = $1',
      [req.params.id]
    );
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ data: null, error: 'Team not found' });
    }
    const oldName: string = current.rows[0].name;

    const result = await client.query(
      `UPDATE content.teams SET
        name          = COALESCE($1, name),
        display_order = COALESCE($2, display_order)
       WHERE team_id = $3
       RETURNING *`,
      [newName, display_order ?? null, req.params.id]
    );

    // If the name actually changed, re-tag every member that referenced the old name.
    if (newName && newName !== oldName) {
      await client.query(
        'UPDATE content.team_members SET team_name = $1, updated_at = NOW() WHERE team_name = $2',
        [newName, oldName]
      );
    }

    await client.query('COMMIT');
    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ data: null, error: 'A team with that name already exists' });
    }
    res.status(500).json({ data: null, error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/cms/teams/:id — remove a team
router.delete('/teams/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM content.teams WHERE team_id = $1', [req.params.id]);
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
    // (xmax = 0) is a Postgres trick: true on INSERT, false on UPDATE (conflict)
    const result = await pool.query(
      `INSERT INTO content.newsletter_subscribers (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
       SET is_active = TRUE, name = COALESCE($2, newsletter_subscribers.name)
       RETURNING subscriber_id, email, subscribed_at, (xmax = 0) AS is_new`,
      [email.trim().toLowerCase(), name?.trim() ?? null]
    );

    // Fire welcome email only for brand-new subscriptions
    if (result.rows[0]?.is_new) {
      sendNewsletterWelcome({ to: email.trim().toLowerCase(), name: name?.trim() }).catch(() => {});
    }

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/cms/newsletter error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/cms/featured-events
// Public — fetch active featured events
router.get('/featured-events', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        fe.id, fe.event_id, fe.title, fe.description,
        fe.image_url, fe.event_date, fe.category,
        fe.display_order, fe.is_active, fe.created_at,
        e.title AS linked_event_title,
        e.status AS linked_event_status
       FROM content.featured_events fe
       LEFT JOIN events.events e ON fe.event_id = e.event_id
       WHERE fe.is_active = TRUE
       ORDER BY fe.display_order ASC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    console.error('GET /api/cms/featured-events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/cms/featured-events/all
// Admin — fetch all featured events including inactive
router.get('/featured-events/all', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        fe.id, fe.event_id, fe.title, fe.description,
        fe.image_url, fe.event_date, fe.category,
        fe.display_order, fe.is_active, fe.created_at,
        e.title AS linked_event_title
       FROM content.featured_events fe
       LEFT JOIN events.events e ON fe.event_id = e.event_id
       ORDER BY fe.display_order ASC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/featured-events
// Admin — add a featured event
router.post('/featured-events', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      event_id, title, description,
      image_url, event_date, category, display_order,
    } = req.body;

    if (!title) {
      return res.status(400).json({ data: null, error: 'Title is required.' });
    }

    const result = await pool.query(
      `INSERT INTO content.featured_events (
        event_id, title, description, image_url,
        event_date, category, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *`,
      [
        event_id ?? null,
        title.trim(),
        description?.trim() ?? null,
        image_url?.trim() ?? null,
        event_date ?? null,
        category?.trim() ?? null,
        display_order ?? 0,
      ]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    console.error('POST /api/cms/featured-events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/featured-events/:id
// Admin — edit a featured event
router.patch('/featured-events/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      event_id, title, description,
      image_url, event_date, category,
      display_order, is_active,
    } = req.body;

    const result = await pool.query(
      `UPDATE content.featured_events SET
        event_id      = COALESCE($1, event_id),
        title         = COALESCE($2, title),
        description   = COALESCE($3, description),
        image_url     = COALESCE($4, image_url),
        event_date    = COALESCE($5, event_date),
        category      = COALESCE($6, category),
        display_order = COALESCE($7, display_order),
        is_active     = COALESCE($8, is_active)
      WHERE id = $9
      RETURNING *`,
      [
        event_id ?? null,
        title?.trim() ?? null,
        description?.trim() ?? null,
        image_url?.trim() ?? null,
        event_date ?? null,
        category?.trim() ?? null,
        display_order ?? null,
        is_active ?? null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Featured event not found.' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    console.error('PATCH /api/cms/featured-events/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/cms/featured-events/:id
// Admin — remove a featured event
router.delete('/featured-events/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM content.featured_events WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Featured event not found.' });
    }

    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

// GET /api/cms/testimonials
// Public — approved testimonials only
router.get('/testimonials', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM content.testimonials
       WHERE is_approved = TRUE
       ORDER BY COALESCE(display_order, 0) ASC, created_at DESC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    console.error('GET /api/cms/testimonials error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/cms/testimonials/all
// Admin — all submissions including pending
router.get('/testimonials/all', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM content.testimonials
       ORDER BY is_approved ASC, created_at DESC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    console.error('GET /api/cms/testimonials/all error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/cms/testimonials
// Authenticated users — submit a testimonial (starts unapproved)
router.post('/testimonials', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { author_name, author_role, quote } = req.body;

    if (!author_name?.trim() || !quote?.trim()) {
      return res.status(400).json({ data: null, error: 'Name and quote are required.' });
    }
    if (quote.trim().length < 20) {
      return res.status(400).json({ data: null, error: 'Quote must be at least 20 characters.' });
    }

    const result = await pool.query(
      `INSERT INTO content.testimonials (user_id, author_name, author_role, quote, is_approved)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING testimonial_id, created_at`,
      [userId, author_name.trim(), author_role?.trim() ?? null, quote.trim()]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/cms/testimonials/:id
// Admin — approve/reject/edit/reorder
router.patch('/testimonials/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { author_name, author_role, quote, is_approved, display_order } = req.body;

    // Build SET clause dynamically — only touch columns the caller provided,
    // and skip display_order if the column doesn't exist in the table.
    const sets: string[] = [];
    const values: any[] = [];

    if (author_name !== undefined) { sets.push(`author_name = $${sets.length + 1}`); values.push(author_name?.trim() ?? null); }
    if (author_role !== undefined) { sets.push(`author_role = $${sets.length + 1}`); values.push(author_role?.trim() ?? null); }
    if (quote      !== undefined) { sets.push(`quote       = $${sets.length + 1}`); values.push(quote?.trim() ?? null); }
    if (is_approved !== undefined) { sets.push(`is_approved = $${sets.length + 1}`); values.push(is_approved); }
    if (display_order !== undefined) { sets.push(`display_order = $${sets.length + 1}`); values.push(display_order); }

    if (sets.length === 0) {
      return res.status(400).json({ data: null, error: 'No fields to update.' });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE content.testimonials SET ${sets.join(', ')} WHERE testimonial_id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Testimonial not found.' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    console.error('PATCH /api/cms/testimonials/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/cms/testimonials/:id
// Admin only
router.delete('/testimonials/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM content.testimonials WHERE testimonial_id = $1', [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;