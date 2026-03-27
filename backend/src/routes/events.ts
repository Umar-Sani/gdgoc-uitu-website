import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/events
// Public route — no auth required
// Query params: status, category, search, page, limit
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status = 'published',
      category,
      search,
      upcoming,
      page = '1',
      limit = '12',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    // Base query using your v_event_summary view
    let query = `
      SELECT *
      FROM events.v_event_summary
      WHERE 1=1
    `;

    // Filter by status
    if (status === 'upcoming') {
      // Upcoming = future events that are publicly visible
      query += ` AND start_datetime >= NOW() AND status = 'published'`;
    } else if (status === 'past') {
      // Past = already happened events (published or completed)
      query += ` AND start_datetime < NOW() AND status IN ('published', 'completed')`;
    } else {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by category name
    if (category && category !== 'all') {
      query += ` AND category_name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Search by title
    if (search) {
      query += ` AND title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    const sortDirection = status === 'past' ? 'DESC' : 'ASC';
    query += ` ORDER BY start_datetime ${sortDirection}`;
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
    console.error('GET /api/events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/events/categories
// Returns all categories for the filter dropdown
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT category_id, name FROM events.categories ORDER BY name ASC'
    );
    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/events/:id
// Single event detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events.v_event_summary WHERE event_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Event not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/events/:id/register
// Requires auth — calls the register_user_for_event stored procedure
router.post('/:id/register', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = (req as any).user.id;
    const eventId = req.params.id;

    // Use SERIALIZABLE isolation to prevent race conditions
    // e.g. two users registering for the last seat simultaneously
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    await client.query(
      'CALL public.register_user_for_event($1, $2)',
      [userId, eventId]
    );

    await client.query('COMMIT');

    res.json({
      data: { message: 'Successfully registered for event' },
      error: null,
    });

  } catch (err: any) {
    await client.query('ROLLBACK');

    console.error('Event registration error:', err.message);

    // Handle named exceptions from the stored procedure
    if (err.message.includes('EVENT_FULL')) {
      return res.status(409).json({ data: null, error: 'This event is fully booked.' });
    }
    if (err.message.includes('ALREADY_REGISTERED')) {
      return res.status(409).json({ data: null, error: 'You are already registered for this event.' });
    }
    if (err.message.includes('EVENT_NOT_FOUND')) {
      return res.status(404).json({ data: null, error: 'Event not found.' });
    }
    if (err.message.includes('EVENT_UNAVAILABLE')) {
      return res.status(400).json({ data: null, error: 'Registration for this event is closed.' });
    }

    res.status(500).json({ data: null, error: 'Registration failed. Please try again.' });

  } finally {
    client.release();
  }
});

// POST /api/events
// Admin only — create a new event
router.post('/', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      event_type,
      category_id,
      start_datetime,
      end_datetime,
      venue,
      max_seats,
      is_free,
      ticket_price,
      tags,
      status = 'draft',
    } = req.body;

    const userId = (req as any).user.id;

    // Basic validation
    if (!title || !event_type || !category_id || !start_datetime || !end_datetime || !max_seats) {
      return res.status(400).json({
        data: null,
        error: 'Missing required fields: title, event_type, category_id, start_datetime, end_datetime, max_seats',
      });
    }

    const result = await pool.query(
      `INSERT INTO events.events (
        title, description, event_type, category_id,
        start_datetime, end_datetime, venue,
        max_seats, is_free, ticket_price,
        tags, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        title,
        description ?? null,
        event_type,
        category_id,
        start_datetime,
        end_datetime,
        venue ?? null,
        max_seats,
        is_free ?? true,
        is_free ? null : (ticket_price ?? null),
        tags ?? [],
        status,
        userId,
      ]
    );

    res.status(201).json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('POST /api/events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/events/:id
// Admin only — edit an existing event
router.patch('/:id', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      event_type,
      category_id,
      start_datetime,
      end_datetime,
      venue,
      max_seats,
      is_free,
      ticket_price,
      tags,
      status,
    } = req.body;

    // Check event exists
    const existing = await pool.query(
      'SELECT event_id FROM events.events WHERE event_id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Event not found' });
    }

    const result = await pool.query(
      `UPDATE events.events SET
        title         = COALESCE($1, title),
        description   = COALESCE($2, description),
        event_type    = COALESCE($3, event_type),
        category_id   = COALESCE($4, category_id),
        start_datetime = COALESCE($5, start_datetime),
        end_datetime  = COALESCE($6, end_datetime),
        venue         = COALESCE($7, venue),
        max_seats     = COALESCE($8, max_seats),
        is_free       = COALESCE($9, is_free),
        ticket_price  = COALESCE($10, ticket_price),
        tags          = COALESCE($11, tags),
        status        = COALESCE($12, status),
        updated_at    = NOW()
      WHERE event_id = $13
      RETURNING *`,
      [
        title ?? null,
        description ?? null,
        event_type ?? null,
        category_id ?? null,
        start_datetime ?? null,
        end_datetime ?? null,
        venue ?? null,
        max_seats ?? null,
        is_free ?? null,
        ticket_price ?? null,
        tags ?? null,
        status ?? null,
        req.params.id,
      ]
    );

    res.json({ data: result.rows[0], error: null });

  } catch (err: any) {
    console.error('PATCH /api/events/:id error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/events/:id/registration-status
router.get('/:id/registration-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const eventId = req.params.id;

    //console.log('Checking registration status for:', userId, eventId);

    const result = await pool.query(
      `SELECT registration_id FROM events.registrations
       WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    //console.log('Registration status result:', result.rows);

    res.json({
      data: { registered: result.rows.length > 0 },
      error: null,
    });

  } catch (err: any) {
    console.error('Registration status error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;