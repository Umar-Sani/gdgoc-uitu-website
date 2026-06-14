import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require auth + at minimum editor role
router.use(requireAuth);
router.use(requireRole('editor', 'admin', 'super_admin'));

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Dashboard stats — total users, events, revenue, registrations
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [users, events, revenue, registrations, recentActivity] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users.users WHERE is_active = TRUE`),
      pool.query(`SELECT COUNT(*) FROM events.events WHERE status = 'published'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments.transactions WHERE status = 'success'`),
      pool.query(`SELECT COUNT(*) FROM events.registrations`),
      pool.query(`
        SELECT * FROM audit.v_recent_activity
        ORDER BY changed_at DESC
        LIMIT 10
      `),
    ]);

    res.json({
      data: {
        total_users:         parseInt(users.rows[0].count),
        published_events:    parseInt(events.rows[0].count),
        total_revenue:       parseFloat(revenue.rows[0].total),
        total_registrations: parseInt(registrations.rows[0].count),
        recent_activity:     recentActivity.rows,
      },
      error: null,
    });

  } catch (err: any) {
    console.error('GET /api/admin/stats error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// List all users with filters and pagination
router.get('/users', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      search,
      role,
      status,
      page  = '1',
      limit = '20',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    // Query base tables directly so is_active = FALSE rows are always included
    let query = `
      SELECT
        u.user_id, u.email, u.full_name, u.username, u.avatar_url,
        u.is_active, u.is_verified, u.created_at, u.last_login,
        r.role_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.role_id
      WHERE 1=1
    `;

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role && role !== 'all') {
      query += ` AND r.role_name = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status === 'active') {
      query += ` AND u.is_active = TRUE`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = FALSE`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC`;
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
    console.error('GET /api/admin/users error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
// Change a user's role
router.patch('/users/:id/role', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ data: null, error: 'role_name is required' });
    }

    // Get role_id from role_name
    const roleResult = await pool.query(
      `SELECT role_id FROM users.roles WHERE role_name = $1`,
      [role_name]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ data: null, error: `Invalid role: ${role_name}` });
    }

    const roleId = roleResult.rows[0].role_id;

    const result = await pool.query(
      `UPDATE users.users
       SET role_id = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, email, full_name`,
      [roleId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found' });
    }

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('PATCH /api/admin/users/:id/role error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────
// Activate or deactivate a user
router.patch('/users/:id/status', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ data: null, error: 'is_active must be a boolean' });
    }

    // Prevent modifying super_admin accounts
    const roleCheck = await pool.query(
      `SELECT r.role_name FROM users.users u JOIN users.roles r ON u.role_id = r.role_id WHERE u.user_id = $1`,
      [req.params.id]
    );
    if (roleCheck.rows[0]?.role_name === 'super_admin') {
      return res.status(403).json({ data: null, error: 'Super admin accounts cannot be deactivated.' });
    }

    const result = await pool.query(
      `UPDATE users.users
       SET is_active = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, email, full_name, is_active`,
      [is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found' });
    }

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('PATCH /api/admin/users/:id/status error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
// Permanently delete a user account — super_admin only
router.delete('/users/:id', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Prevent deleting your own account
    if ((req as any).user?.id === userId) {
      return res.status(400).json({ data: null, error: 'You cannot delete your own account.' });
    }

    const check = await pool.query(
      `SELECT u.user_id, u.email, u.full_name, r.role_name
       FROM users.users u LEFT JOIN users.roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found.' });
    }

    if (check.rows[0].role_name === 'super_admin') {
      return res.status(403).json({ data: null, error: 'Super admin accounts cannot be deleted.' });
    }

    const deleted = check.rows[0];

    // Remove from Supabase auth first — revokes all active sessions immediately
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await supabaseAdmin.auth.admin.deleteUser(userId);

    // Remove from our database
    await pool.query(`DELETE FROM users.users WHERE user_id = $1`, [userId]);

    res.json({ data: deleted, error: null });

  } catch (err: any) {
    console.error('DELETE /api/admin/users/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/admin/events ────────────────────────────────────────────────────
// List all events for admin — includes drafts and cancelled
router.get('/events', async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      page  = '1',
      limit = '20',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    let query = `SELECT * FROM events.v_event_summary WHERE 1=1`;

    if (search) {
      query += ` AND title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC`;
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
    console.error('GET /api/admin/events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── DELETE /api/admin/events/:id ────────────────────────────────────────────
// Delete an event (soft delete by setting status to cancelled)
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE events.events
       SET status = 'cancelled', updated_at = NOW()
       WHERE event_id = $1
       RETURNING event_id, title, status`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Event not found' });
    }

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('DELETE /api/admin/events/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/admin/payments ──────────────────────────────────────────────────
// List all transactions with filters
router.get('/payments', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      page  = '1',
      limit = '20',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    let query = `SELECT * FROM payments.v_transaction_report WHERE 1=1`;

    if (search) {
      query += ` AND (payer_name ILIKE $${paramIndex} OR payer_email ILIKE $${paramIndex} OR invoice_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY initiated_at DESC`;
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
    console.error('GET /api/admin/payments error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/admin/audit ─────────────────────────────────────────────────────
// Audit log — super_admin only
router.get('/audit', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      page  = '1',
      limit = '50',
      table_name,
      operation,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    let query = `SELECT * FROM audit.v_recent_activity WHERE 1=1`;

    if (table_name) {
      query += ` AND table_name = $${paramIndex}`;
      params.push(table_name);
      paramIndex++;
    }

    if (operation) {
      query += ` AND operation = $${paramIndex}`;
      params.push(operation);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS c`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY changed_at DESC`;
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
    console.error('GET /api/admin/audit error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/admin/roles ─────────────────────────────────────────────────────
// List all available roles
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT role_id, role_name, description FROM users.roles ORDER BY role_id ASC`
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;