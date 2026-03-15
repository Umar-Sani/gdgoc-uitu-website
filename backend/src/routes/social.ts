import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/social/posts
router.get('/posts', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { status, platform, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    let query = `SELECT * FROM social.posts WHERE 1=1`;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (platform) {
      query += ` AND platform = $${paramIndex}`;
      params.push(platform);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`, params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({ data: result.rows, total, page: Number(page), limit: Number(limit), error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/social/posts/:id
router.get('/posts/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM social.posts WHERE post_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Post not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/social/posts
router.post('/posts', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { platform, caption, media_urls, tags, hashtags, scheduled_at } = req.body;

    if (!platform || !caption) {
      return res.status(400).json({ data: null, error: 'platform and caption are required' });
    }

    const result = await pool.query(
      `INSERT INTO social.posts (platform, caption, media_urls, tags, hashtags, scheduled_at, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING *`,
      [platform, caption, media_urls ?? [], tags ?? [], hashtags ?? [], scheduled_at ?? null, userId]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/social/posts/:id
router.patch('/posts/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { platform, caption, media_urls, tags, hashtags, scheduled_at, status } = req.body;

    const result = await pool.query(
      `UPDATE social.posts SET
        platform     = COALESCE($1, platform),
        caption      = COALESCE($2, caption),
        media_urls   = COALESCE($3, media_urls),
        tags         = COALESCE($4, tags),
        hashtags     = COALESCE($5, hashtags),
        scheduled_at = COALESCE($6, scheduled_at),
        status       = COALESCE($7, status),
        updated_at   = NOW()
      WHERE post_id = $8
      RETURNING *`,
      [platform ?? null, caption ?? null, media_urls ?? null, tags ?? null,
       hashtags ?? null, scheduled_at ?? null, status ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Post not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/social/posts/:id
router.delete('/posts/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM social.posts WHERE post_id = $1', [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;