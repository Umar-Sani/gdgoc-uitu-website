import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole, requireUsername } from '../middleware/auth';
import { createNotification, createBulkNotification } from '../lib/notifications';
import { sendNewReplyNotification, sendMentionNotification } from '../lib/mailer';

const router = Router();

function parseMentions(text: string): string[] {
  const matches = text.match(/\B@(\w+)/g) ?? [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

function snippet(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max).trimEnd() + '…';
}

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
        SELECT 
          t.thread_id,
          t.title,
          LEFT(t.body, 150) AS body_preview,
          c.name AS category_name,
          c.color_hex AS category_color,
          t.tags,
          t.is_pinned,
          t.is_locked,
          t.view_count,
          t.upvote_count,
          t.reply_count,
          t.created_at,
          t.updated_at,
          t.author_id,
          u.full_name AS author_name,
          u.avatar_url AS author_avatar,
          (SELECT MAX(created_at) FROM forum.replies WHERE thread_id = t.thread_id AND is_deleted = FALSE) AS last_reply_at,
          (
            SELECT COALESCE(json_agg(json_build_object('name', sub.full_name, 'avatar', sub.avatar_url, 'username', sub.username)), '[]'::json)
            FROM (
              SELECT au.full_name, au.avatar_url, au.username, MIN(r.created_at) as first_reply
              FROM forum.replies r
              JOIN users.users au ON r.author_id = au.user_id
              WHERE r.thread_id = t.thread_id AND r.is_deleted = FALSE AND r.author_id != t.author_id
              GROUP BY r.author_id, au.full_name, au.avatar_url, au.username
              ORDER BY first_reply ASC
              LIMIT 4
            ) sub
          ) AS participants
        FROM forum.threads t
        LEFT JOIN forum.categories c ON t.category_id = c.category_id
        LEFT JOIN users.users u ON t.author_id = u.user_id
        WHERE t.is_deleted = FALSE
    `;

    // Filter by category
    if (category && category !== 'all') {
      query += ` AND c.name = $${paramIndex}`;
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
        query += ` ORDER BY t.is_pinned DESC, t.upvote_count DESC, t.created_at DESC`;
    } else if (sort === 'unanswered') {
        query += ` ORDER BY t.is_pinned DESC, t.reply_count ASC, t.created_at DESC`;
    } else {
        query += ` ORDER BY t.is_pinned DESC, COALESCE((SELECT MAX(created_at) FROM forum.replies WHERE thread_id = t.thread_id AND is_deleted = FALSE), t.created_at) DESC`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
    // Fetch full thread with joins
    const threadResult = await pool.query(
      `SELECT 
        t.thread_id,
        t.title,
        t.body,
        t.category_id,
        c.name AS category_name,
        c.color_hex AS category_color,
        t.tags,
        t.is_pinned,
        t.is_locked,
        t.view_count,
        t.upvote_count,
        t.reply_count,
        t.created_at,
        t.updated_at,
        t.author_id,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar
       FROM forum.threads t
       LEFT JOIN forum.categories c ON t.category_id = c.category_id
       LEFT JOIN users.users u ON t.author_id = u.user_id
       WHERE t.thread_id = $1 AND t.is_deleted = FALSE`,
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

// ─── POST /api/forum/threads/:id/view ─────────────────────────────────────────
// Public — increment thread view count
router.post('/threads/:id/view', async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE forum.threads
       SET view_count = view_count + 1
       WHERE thread_id = $1 AND is_deleted = FALSE`,
      [req.params.id]
    );
    res.json({ data: { success: true }, error: null });
  } catch (err: any) {
    console.error('POST /api/forum/threads/:id/view error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads ──────────────────────────────────────────────────
// Auth required — create a new thread
router.post('/threads', requireAuth, requireUsername, async (req: Request, res: Response) => {
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

    // Fire-and-forget: notify @mentioned users (not the author themselves)
    const mentions = parseMentions(body.trim());
    if (mentions.length > 0) {
      const newThreadId = result.rows[0].thread_id;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      pool.query(
        `SELECT
           mu.user_id           AS mentioned_id,
           mu.full_name         AS mentioned_name,
           ae.email             AS mentioned_email,
           a.full_name          AS mentioner_name,
           COALESCE(np.email_enabled, false)                     AS email_enabled,
           COALESCE((np.email->>'mention')::boolean, true)       AS mention_email_on
         FROM users.users mu
         JOIN (SELECT full_name FROM users.users WHERE user_id = $2) a ON TRUE
         JOIN auth.users ae ON ae.id = mu.user_id
         LEFT JOIN users.notification_preferences np ON np.user_id = mu.user_id
         WHERE LOWER(mu.username) = ANY($1) AND mu.user_id != $2`,
        [mentions, authorId]
      ).then(r => {
        if (!r.rows.length) return;
        const mentionedIds  = r.rows.map((row: any) => row.mentioned_id);
        const mentionerName = r.rows[0].mentioner_name;
        createBulkNotification({
          userIds:   mentionedIds,
          type:      'mention',
          title:     `${mentionerName} mentioned you in "${title.trim()}"`,
          message:   snippet(body.trim()),
          actionUrl: `/forum/${newThreadId}`,
        }).catch(() => {});
        // Send mention emails to users who have email + mention enabled
        r.rows
          .filter((row: any) => row.email_enabled && row.mention_email_on && row.mentioned_email)
          .forEach((row: any) => {
            sendMentionNotification({
              to:            row.mentioned_email,
              name:          row.mentioned_name || 'there',
              mentionerName,
              context:       'a thread',
              threadTitle:   title.trim(),
              threadUrl:     `${frontendUrl}/forum/${newThreadId}`,
              snippet:       snippet(body.trim()),
            }).catch(() => {});
          });
      }).catch(() => {});
    }

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/forum/threads error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads/:id/replies ─────────────────────────────────────
// Auth required — add a reply to a thread
router.post('/threads/:id/replies', requireAuth, requireUsername, async (req: Request, res: Response) => {
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

    // Update thread updated_at timestamp
    await pool.query(
      `UPDATE forum.threads
       SET updated_at = NOW()
       WHERE thread_id = $1`,
      [threadId]
    );

    // Fire-and-forget: notify thread author and email them if it's not their own reply
    pool.query(
      `SELECT t.title, t.author_id,
              u.full_name  AS replier_name,
              au.full_name AS author_name,
              ae.email     AS author_email
       FROM forum.threads t
       JOIN users.users u  ON u.user_id  = $2
       JOIN users.users au ON au.user_id = t.author_id
       JOIN auth.users  ae ON ae.id      = t.author_id
       WHERE t.thread_id = $1`,
      [threadId, authorId]
    ).then((r) => {
      if (!r.rows.length) return;
      const { title, author_id, replier_name, author_name, author_email } = r.rows[0];
      if (author_id === authorId) return; // don't notify self

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const threadUrl   = `${frontendUrl}/forum/${threadId}`;

      createNotification({
        userId:    author_id,
        type:      'new_reply',
        title:     `${replier_name} replied to "${title}"`,
        message:   snippet(body.trim()),
        actionUrl: `/forum/${threadId}`,
      }).then(({ email: shouldEmail }) => {
        if (shouldEmail && author_email) {
          sendNewReplyNotification({
            to: author_email, name: author_name || 'there',
            replierName: replier_name, threadTitle: title, threadUrl,
            snippet: snippet(body.trim()),
          }).catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});

    // Fire-and-forget: notify @mentioned users (skip replier + thread author who gets new_reply)
    const mentions = parseMentions(body.trim());
    if (mentions.length > 0) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      pool.query(
        `SELECT
           mu.user_id           AS mentioned_id,
           mu.full_name         AS mentioned_name,
           ae.email             AS mentioned_email,
           a.full_name          AS mentioner_name,
           t.title              AS thread_title,
           COALESCE(np.email_enabled, false)                     AS email_enabled,
           COALESCE((np.email->>'mention')::boolean, true)       AS mention_email_on
         FROM users.users mu
         JOIN (SELECT full_name FROM users.users WHERE user_id = $2) a ON TRUE
         JOIN forum.threads t ON t.thread_id = $3
         JOIN auth.users ae ON ae.id = mu.user_id
         LEFT JOIN users.notification_preferences np ON np.user_id = mu.user_id
         WHERE LOWER(mu.username) = ANY($1)
           AND mu.user_id != $2
           AND mu.user_id != t.author_id`,
        [mentions, authorId, threadId]
      ).then(r => {
        if (!r.rows.length) return;
        const mentionedIds = r.rows.map((row: any) => row.mentioned_id);
        const { mentioner_name, thread_title } = r.rows[0];
        createBulkNotification({
          userIds:   mentionedIds,
          type:      'mention',
          title:     `${mentioner_name} mentioned you in "${thread_title}"`,
          message:   snippet(body.trim()),
          actionUrl: `/forum/${threadId}`,
        }).catch(() => {});
        // Send mention emails
        r.rows
          .filter((row: any) => row.email_enabled && row.mention_email_on && row.mentioned_email)
          .forEach((row: any) => {
            sendMentionNotification({
              to:            row.mentioned_email,
              name:          row.mentioned_name || 'there',
              mentionerName: mentioner_name,
              context:       'a reply',
              threadTitle:   thread_title,
              threadUrl:     `${frontendUrl}/forum/${threadId}`,
              snippet:       snippet(body.trim()),
            }).catch(() => {});
          });
      }).catch(() => {});
    }

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/forum/threads/:id/replies error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/forum/threads/:id/upvote ──────────────────────────────────────
// Auth required — upvote a thread
router.post('/threads/:id/upvote', requireAuth, requireUsername, async (req: Request, res: Response) => {
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

    // Fire-and-forget: notify thread author (not self)
    pool.query(
      `SELECT t.title, t.author_id, u.full_name AS voter_name
       FROM forum.threads t
       JOIN users.users u ON u.user_id = $2
       WHERE t.thread_id = $1`,
      [threadId, userId]
    ).then((r) => {
      if (!r.rows.length) return;
      const { title, author_id, voter_name } = r.rows[0];
      if (author_id === userId) return;
      createNotification({
        userId:    author_id,
        type:      'upvote_received',
        title:     `${voter_name} upvoted your thread`,
        message:   `"${title}"`,
        actionUrl: `/forum/${threadId}`,
      }).catch(() => {});
    }).catch(() => {});

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
       FROM forum.categories
       ORDER BY display_order ASC`
    );
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── PUT /api/forum/threads/:id/pin ──────────────────────────────────────────
// Auth required (admin) — toggle pin status
router.put('/threads/:id/pin', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { is_pinned } = req.body;
    const result = await pool.query(
      `UPDATE forum.threads SET is_pinned = $1, updated_at = NOW() WHERE thread_id = $2 RETURNING *`,
      [is_pinned, req.params.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── PUT /api/forum/threads/:id/lock ─────────────────────────────────────────
// Auth required (admin) — toggle lock status
router.put('/threads/:id/lock', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { is_locked } = req.body;
    const result = await pool.query(
      `UPDATE forum.threads SET is_locked = $1, updated_at = NOW() WHERE thread_id = $2 RETURNING *`,
      [is_locked, req.params.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── DELETE /api/forum/threads/:id ───────────────────────────────────────────
// Auth required (admin) — soft delete thread
router.delete('/threads/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE forum.threads SET is_deleted = TRUE, updated_at = NOW() WHERE thread_id = $1`,
      [req.params.id]
    );
    res.json({ data: { success: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── DELETE /api/forum/replies/:id ───────────────────────────────────────────
// Auth required (admin) — soft delete reply
router.delete('/replies/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE forum.replies SET is_deleted = TRUE, updated_at = NOW() WHERE reply_id = $1`,
      [req.params.id]
    );
    res.json({ data: { success: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;