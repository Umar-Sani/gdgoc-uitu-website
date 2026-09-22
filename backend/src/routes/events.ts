import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { requireAuth, requireRole, requireUsername } from '../middleware/auth';
import { createNotification, createBulkNotification } from '../lib/notifications';
import { sendRegistrationConfirmed, sendNewEventAnnouncement } from '../lib/mailer';
import {
  validate, createEventSchema, updateEventSchema,
  attachEventPersonSchema, updateEventPersonSchema, createAndAttachEventPersonSchema,
} from '../lib/validate';

const router = Router();

// Fires in-app + email notifications when an event is published.
// Called fire-and-forget — never awaited so it doesn't block the HTTP response.
async function announceNewEvent(evt: {
  event_id: string;
  title: string;
  description: string | null;
  start_datetime: Date | string;
  venue: string | null;
}) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${frontendUrl}/events/${evt.event_id}`;
  const eventDate = new Date(evt.start_datetime).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const descSnippet = evt.description
    ? evt.description.slice(0, 200).trim() + (evt.description.length > 200 ? '…' : '')
    : null;

  const [usersResult, subsResult] = await Promise.all([
    pool.query('SELECT user_id FROM users.users WHERE is_active = TRUE'),
    pool.query('SELECT email, name FROM content.newsletter_subscribers WHERE is_active = TRUE'),
  ]);

  const userIds: string[] = usersResult.rows.map((r: any) => r.user_id);
  if (userIds.length) {
    await createBulkNotification({
      userIds,
      type: 'event_reminder',
      title: `New event: "${evt.title}"`,
      message: evt.venue ? `${eventDate} · ${evt.venue}` : eventDate,
      actionUrl: `/events/${evt.event_id}`,
    });
  }

  await Promise.allSettled(
    subsResult.rows.map((sub: any) =>
      sendNewEventAnnouncement({
        to: sub.email,
        eventTitle: evt.title,
        eventDate,
        venue: evt.venue,
        description: descSnippet,
        eventUrl,
      })
    )
  );
}

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

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/events/:id/register
// Requires auth — calls the register_user_for_event stored procedure
router.post('/:id/register', requireAuth, requireUsername, async (req: Request, res: Response) => {
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

    // Fire-and-forget: notification + email (don't block the response)
    Promise.all([
      pool.query(
        `SELECT e.title, e.start_datetime,
                u.full_name, au.email
         FROM events.events e
         JOIN users.users u   ON u.user_id = $1
         JOIN auth.users  au  ON au.id      = $1
         WHERE e.event_id = $2`,
        [userId, eventId]
      ),
    ]).then(([r]) => {
      if (!r.rows.length) return;
      const { title, start_datetime, full_name, email } = r.rows[0];
      const formattedDate = new Date(start_datetime).toLocaleDateString('en-PK', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const eventUrl    = `${frontendUrl}/events/${eventId}`;

      createNotification({
        userId,
        type:      'registration_confirmed',
        title:     'Registration Confirmed!',
        message:   `You're registered for "${title}" on ${formattedDate}`,
        actionUrl: `/events/${eventId}`,
      }).then(({ email: shouldEmail }) => {
        if (shouldEmail && email) {
          sendRegistrationConfirmed({ to: email, name: full_name || 'there', eventTitle: title, eventDate: formattedDate, eventUrl })
            .catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});

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
router.post('/', requireAuth, requireRole('admin', 'super_admin'), validate(createEventSchema), async (req: Request, res: Response) => {
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
      banner_url,
    } = req.body;

    const userId = (req as any).user.id;

    const result = await pool.query(
      `INSERT INTO events.events (
        title, description, event_type, category_id,
        start_datetime, end_datetime, venue,
        max_seats, is_free, ticket_price,
        tags, status, created_by, banner_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
        banner_url ?? null,
      ]
    );

    res.status(201).json({ data: result.rows[0], error: null });

    if (status === 'published') {
      announceNewEvent(result.rows[0]).catch(err =>
        console.error('announceNewEvent error:', err.message)
      );
    }

  } catch (err: any) {
    console.error('POST /api/events error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/events/:id
// Admin only — edit an existing event
router.patch('/:id', requireAuth, requireRole('admin', 'super_admin'), validate(updateEventSchema), async (req: Request, res: Response) => {
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
      banner_url,
    } = req.body;

    // Check event exists and capture current status for publish-transition detection
    const existing = await pool.query(
      'SELECT event_id, status FROM events.events WHERE event_id = $1',
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
        banner_url    = COALESCE($13, banner_url),
        updated_at    = NOW()
      WHERE event_id = $14
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
        banner_url ?? null,
        req.params.id,
      ]
    );

    res.json({ data: result.rows[0], error: null });

    if (existing.rows[0].status !== 'published' && status === 'published') {
      announceNewEvent(result.rows[0]).catch(err =>
        console.error('announceNewEvent error:', err.message)
      );
    }

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

// ─── GET /api/events/:id/people ───────────────────────────────────────────────
// Public — get all people attached to an event, joined with their content.people
// profile. See TODO-051 / content.people for why this is a join, not flat data.
router.get('/:id/people', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        ep.event_id, ep.person_id, ep.role_at_event, ep.display_order, ep.created_at,
        jsonb_build_object(
          'person_id',    p.person_id,
          'full_name',    p.full_name,
          'default_role', p.default_role,
          'bio',          p.bio,
          'avatar_url',   p.avatar_url,
          'linkedin_url', p.linkedin_url,
          'organization', p.organization,
          'is_active',    p.is_active
        ) AS person
       FROM events.event_people ep
       JOIN content.people p ON p.person_id = ep.person_id
       WHERE ep.event_id = $1
       ORDER BY ep.display_order ASC, ep.created_at ASC`,
      [req.params.id]
    );

    res.json({ data: result.rows, error: null });
  } catch (err: any) {
    console.error('GET /api/events/:id/people error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/events/:id/people ──────────────────────────────────────────────
// Admin — attach an existing content.people record to this event
router.post('/:id/people', requireAuth, requireRole('admin', 'super_admin', 'editor'), validate(attachEventPersonSchema), async (req: Request, res: Response) => {
  try {
    const { person_id, role_at_event, display_order } = req.body;

    const person = await pool.query('SELECT person_id FROM content.people WHERE person_id = $1', [person_id]);
    if (person.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Person not found.' });
    }

    const result = await pool.query(
      `INSERT INTO events.event_people (event_id, person_id, role_at_event, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, person_id, role_at_event.trim(), display_order ?? 0]
    );

    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ data: null, error: 'This person is already attached to this event.' });
    }
    console.error('POST /api/events/:id/people error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/events/:id/people/new ──────────────────────────────────────────
// Admin — create a new content.people record and attach it to this event in one
// step (the "+ New Person" inline flow). Transactional: either both writes land
// or neither does.
router.post('/:id/people/new', requireAuth, requireRole('admin', 'super_admin', 'editor'), validate(createAndAttachEventPersonSchema), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      full_name, default_role, bio, avatar_url, linkedin_url, organization,
      display_order, is_active, role_at_event,
    } = req.body;

    await client.query('BEGIN');

    const personResult = await client.query(
      `INSERT INTO content.people
        (full_name, default_role, bio, avatar_url, linkedin_url, organization, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        full_name, default_role ?? null, bio ?? null, avatar_url ?? null,
        linkedin_url ?? null, organization ?? null, display_order ?? 0, is_active ?? true,
      ]
    );
    const person = personResult.rows[0];

    const joinResult = await client.query(
      `INSERT INTO events.event_people (event_id, person_id, role_at_event, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, person.person_id, role_at_event.trim(), display_order ?? 0]
    );

    await client.query('COMMIT');

    res.status(201).json({ data: { ...joinResult.rows[0], person }, error: null });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('POST /api/events/:id/people/new error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/events/:id/people/:personId ───────────────────────────────────
// Admin — edit this person's role/order for this event only (not their profile —
// that goes through PATCH /api/cms/people/:id)
router.patch('/:id/people/:personId', requireAuth, requireRole('admin', 'super_admin', 'editor'), validate(updateEventPersonSchema), async (req: Request, res: Response) => {
  try {
    const { role_at_event, display_order } = req.body;

    const result = await pool.query(
      `UPDATE events.event_people SET
        role_at_event = COALESCE($1, role_at_event),
        display_order = COALESCE($2, display_order)
      WHERE person_id = $3 AND event_id = $4
      RETURNING *`,
      [role_at_event ?? null, display_order ?? null, req.params.personId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Person not found on this event.' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (err: any) {
    console.error('PATCH /api/events/:id/people/:personId error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── DELETE /api/events/:id/people/:personId ──────────────────────────────────
// Admin — detach a person from this event (does not touch their content.people
// profile, which may still be attached to other events)
router.delete('/:id/people/:personId', requireAuth, requireRole('admin', 'super_admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM events.event_people
       WHERE person_id = $1 AND event_id = $2
       RETURNING person_id`,
      [req.params.personId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Person not found on this event.' });
    }

    res.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    console.error('DELETE /api/events/:id/people/:personId error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;