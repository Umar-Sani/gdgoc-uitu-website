import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /api/forum/threads ───────────────────────────────────────────────────
// Public — list threads with filters, search, pagination
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      page = '1',
      limit = '20',
      sort = 'latest',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    let query = `
        SELECT v.* FROM forum.v_thread_preview v
        JOIN forum.threads t ON v.thread_id = t.thread_id
        WHERE t.is_deleted = FALSE
    `;

    // Filter by category
    if (category && category !== 'all') {
      query += ` AND category_name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Full text search using tsv column
    if (search) {
      query += ` AND thread_id IN (
        SELECT thread_id FROM forum.threads
        WHERE tsv @@ plainto_tsquery('english', $${paramIndex})
      )`;
      params.push(search);
      paramIndex++;
    }

    // Count query for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Sorting
    if (sort === 'popular') {
        query += ` ORDER BY v.is_pinned DESC, v.upvote_count DESC, v.created_at DESC`;
    } else if (sort === 'unanswered') {
        query += ` ORDER BY v.is_pinned DESC, v.reply_count ASC, v.created_at DESC`;
    } else {
        query += ` ORDER BY v.is_pinned DESC, COALESCE(v.last_reply_at, v.created_at) DESC`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      error: null,
    });

  } catch (err: any) {
    console.error('GET /api/forum/threads error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/forum/threads/:id ───────────────────────────────────────────────
// Public — single thread with replies
router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    // Increment view count
    await pool.query(
      `UPDATE forum.threads
       SET view_count = view_count + 1
       WHERE thread_id = $1 AND is_deleted = FALSE`,
      [req.params.id]
    );

    // Fetch thread from view
    const threadResult = await pool.query(
      `SELECT * FROM forum.v_thread_preview WHERE thread_id = $1`,
      [req.params.id]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Thread not found' });
    }

    // Fetch replies with author info
    const repliesResult = await pool.query(
      `SELECT
        r.reply_id,
        r.thread_id,
        r.parent_reply_id,
        r.body,
        r.upvote_count,
        r.is_deleted,
        r.created_at,
        r.updated_at,
        u.full_name  AS author_name,
        u.avatar_url AS author_avatar,
        u.username   AS author_username
      FROM forum.replies r
      LEFT JOIN users.users u ON r.author_id = u.user_id
      WHERE r.thread_id = $1
        AND r.is_deleted = FALSE
      ORDER BY r.created_at ASC`,
      [req.params.id]
    );

    res.json({
      data: {
        thread: threadResult.rows[0],
        replies: repliesResult.rows,
      },
      error: null,
    });

  } catch (err: any) {
    console.error('GET /api/forum/threads/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads ──────────────────────────────────────────────────
// Auth required — create a new thread
router.post('/threads', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, body, category_id, tags } = req.body;
    const authorId = (req as any).user.id;

    if (!title || !body || !category_id) {
      return res.status(400).json({
        data: null,
        error: 'Missing required fields: title, body, category_id',
      });
    }

    const result = await pool.query(
      `INSERT INTO forum.threads (
        title, body, category_id, author_id, tags
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        title.trim(),
        body.trim(),
        category_id,
        authorId,
        tags ?? [],
      ]
    );

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/forum/threads error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads/:id/replies ─────────────────────────────────────
// Auth required — add a reply to a thread
router.post('/threads/:id/replies', requireAuth, async (req: Request, res: Response) => {
  try {
    const { body, parent_reply_id } = req.body;
    const authorId = (req as any).user.id;
    const threadId = req.params.id;

    if (!body) {
      return res.status(400).json({ data: null, error: 'Reply body is required' });
    }

    // Check thread exists and is not locked
    const thread = await pool.query(
      `SELECT is_locked, is_deleted FROM forum.threads WHERE thread_id = $1`,
      [threadId]
    );

    if (thread.rows.length === 0 || thread.rows[0].is_deleted) {
      return res.status(404).json({ data: null, error: 'Thread not found' });
    }

    if (thread.rows[0].is_locked) {
      return res.status(403).json({ data: null, error: 'This thread is locked' });
    }

    const result = await pool.query(
      `INSERT INTO forum.replies (
        thread_id, author_id, body, parent_reply_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [threadId, authorId, body.trim(), parent_reply_id ?? null]
    );

    // Increment reply count on thread
    await pool.query(
      `UPDATE forum.threads
       SET reply_count = reply_count + 1, updated_at = NOW()
       WHERE thread_id = $1`,
      [threadId]
    );

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/forum/threads/:id/replies error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads/:id/upvote ──────────────────────────────────────
// Auth required — upvote a thread
router.post('/threads/:id/upvote', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = req.params.id;

    // Check if already upvoted
    const existing = await pool.query(
      `SELECT upvote_id FROM forum.upvotes
       WHERE thread_id = $1 AND user_id = $2`,
      [threadId, userId]
    );

    if (existing.rows.length > 0) {
      // Remove upvote — toggle off
      await pool.query(
        `DELETE FROM forum.upvotes WHERE thread_id = $1 AND user_id = $2`,
        [threadId, userId]
      );
      await pool.query(
        `UPDATE forum.threads
         SET upvote_count = GREATEST(0, upvote_count - 1)
         WHERE thread_id = $1`,
        [threadId]
      );
      return res.json({ data: { upvoted: false }, error: null });
    }

    // Add upvote
    await pool.query(
      `INSERT INTO forum.upvotes (thread_id, user_id) VALUES ($1, $2)`,
      [threadId, userId]
    );
    await pool.query(
      `UPDATE forum.threads
       SET upvote_count = upvote_count + 1
       WHERE thread_id = $1`,
      [threadId]
    );

    res.json({ data: { upvoted: true }, error: null });

  } catch (err: any) {
    console.error('POST /api/forum/threads/:id/upvote error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/forum/search ────────────────────────────────────────────────────
// Public — full text search across threads
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, page = '1', limit = '20' } = req.query;

    if (!q) {
      return res.status(400).json({ data: null, error: 'Search query is required' });
    }

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT
        v.*,
        ts_rank(t.tsv, plainto_tsquery('english', $1)) AS rank
      FROM forum.v_thread_preview v
      JOIN forum.threads t ON v.thread_id = t.thread_id
      WHERE t.tsv @@ plainto_tsquery('english', $1)
        AND t.is_deleted = FALSE
      ORDER BY rank DESC, v.created_at DESC
      LIMIT $2 OFFSET $3`,
      [q, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM forum.threads
       WHERE tsv @@ plainto_tsquery('english', $1)
         AND is_deleted = FALSE`,
      [q]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      query: q,
      error: null,
    });

  } catch (err: any) {
    console.error('GET /api/forum/search error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/forum/categories ────────────────────────────────────────────────
// Public — list forum categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT category_id, name, color_hex
       FROM events.categories
       ORDER BY name ASC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;