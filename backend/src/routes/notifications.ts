import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const limit  = Math.min(Number(req.query.limit ?? 30), 50);
  try {
    const result = await pool.query(
      `SELECT * FROM notifications.notifications
       WHERE user_id = $1
       ORDER BY is_read ASC, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications.notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    res.json({ data: { count: parseInt(result.rows[0].count) }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    await pool.query(
      `UPDATE notifications.notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    await pool.query(
      `UPDATE notifications.notifications
       SET is_read = TRUE
       WHERE notification_id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    res.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  try {
    await pool.query(
      `DELETE FROM notifications.notifications
       WHERE notification_id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
