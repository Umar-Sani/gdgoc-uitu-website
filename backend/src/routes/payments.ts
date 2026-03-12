import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// ─── POST /api/payments/create-checkout-session ──────────────────────────────
// Creates a Stripe Checkout Session for a paid event.
// Returns the Stripe-hosted checkout URL to redirect the user to.
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { event_id } = req.body;
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;

    if (!event_id) {
      return res.status(400).json({ data: null, error: 'event_id is required' });
    }

    // Fetch event details to get price and title
    const eventResult = await pool.query(
      'SELECT * FROM events.v_event_summary WHERE event_id = $1',
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    if (event.is_free) {
      return res.status(400).json({ data: null, error: 'This event is free. Use the register endpoint instead.' });
    }

    if (event.seats_available === 0) {
      return res.status(409).json({ data: null, error: 'This event is fully booked.' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ data: null, error: 'Registration for this event is closed.' });
    }

    // Check if user is already registered
    const alreadyRegistered = await pool.query(
      `SELECT registration_id FROM events.registrations
       WHERE user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );

    if (alreadyRegistered.rows.length > 0) {
      return res.status(409).json({ data: null, error: 'You are already registered for this event.' });
    }

    // Create a pending transaction record BEFORE Stripe checkout
    // so we have a transaction_id to pass to Stripe as metadata
    const txResult = await pool.query(
      `INSERT INTO payments.transactions (
        user_id, event_id, amount, currency, gateway, status, initiated_at
      ) VALUES ($1, $2, $3, 'PKR', 'stripe', 'pending', NOW())
      RETURNING transaction_id`,
      [userId, event_id, event.ticket_price]
    );

    const transactionId = txResult.rows[0].transaction_id;

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    // Stripe handles the actual card collection — we never touch card data
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            // Stripe doesn't support PKR — use USD with equivalent amount
            // For demo/sandbox purposes. Update to supported currency for production.
            currency: 'usd',
            product_data: {
              name: event.title,
              description: `GDGOC-UITU Event — ${new Date(event.start_datetime).toLocaleDateString('en-PK')}`,
            },
            // Stripe amounts are in the smallest currency unit (cents for USD)
            unit_amount: Math.round(event.ticket_price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        transaction_id: transactionId,
        event_id,
        user_id: userId,
      },
      success_url: `${FRONTEND_URL}/events/${event_id}/payment-success?session_id={CHECKOUT_SESSION_ID}&transaction_id=${transactionId}`,
      cancel_url: `${FRONTEND_URL}/events/${event_id}/payment-failed?transaction_id=${transactionId}`,
    });

    res.json({
      data: {
        checkout_url: session.url,
        session_id: session.id,
        transaction_id: transactionId,
      },
      error: null,
    });

  } catch (err: any) {
    console.error('create-checkout-session error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Stripe calls this endpoint after payment is completed or failed.
// IMPORTANT: This route must use raw body (not parsed JSON) for signature verification.
// Make sure to register this route BEFORE express.json() middleware in index.ts.
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verify the webhook signature to confirm it came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle checkout.session.completed — payment was successful
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const transactionId = session.metadata?.transaction_id;
    const eventId       = session.metadata?.event_id;
    const userId        = session.metadata?.user_id;

    if (!transactionId || !eventId || !userId) {
      console.error('Webhook missing metadata:', session.metadata);
      return res.status(400).json({ error: 'Missing metadata' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

      // Call process_payment stored procedure to update transaction status
      await client.query(
        'CALL public.process_payment($1, $2, $3)',
        [
          transactionId,
          JSON.stringify({ stripe_session_id: session.id }),
          'success',
        ]
      );

      // Also register the user for the event
      await client.query(
        'CALL public.register_user_for_event($1, $2)',
        [userId, eventId]
      );

      await client.query('COMMIT');
      console.log(`Payment confirmed: transaction ${transactionId}, user ${userId}, event ${eventId}`);

    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Webhook processing error:', err.message);
      // Return 200 anyway so Stripe doesn't retry — log the error for manual review
    } finally {
      client.release();
    }
  }

  // Handle checkout.session.expired or payment_intent.payment_failed
  if (
    event.type === 'checkout.session.expired' ||
    event.type === 'payment_intent.payment_failed'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const transactionId = session.metadata?.transaction_id;

    if (transactionId) {
      try {
        await pool.query(
          'CALL public.process_payment($1, $2, $3)',
          [transactionId, JSON.stringify({}), 'failed']
        );
      } catch (err: any) {
        console.error('Failed to update failed transaction:', err.message);
      }
    }
  }

  // Always return 200 to Stripe so it knows the webhook was received
  res.json({ received: true });
});

// ─── GET /api/payments/my-tickets ────────────────────────────────────────────
// Returns the authenticated user's transaction history
router.get('/my-tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = '1', limit = '10' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT
        t.transaction_id,
        t.invoice_number,
        t.status,
        t.amount,
        t.currency,
        t.gateway,
        t.initiated_at,
        t.completed_at,
        t.refunded_at,
        u.full_name   AS payer_name,
        u.email       AS payer_email,
        e.title       AS event_title,
        e.start_datetime AS event_date,
        e.event_id,
        e.banner_url,
        e.venue,
        e.is_online
      FROM payments.transactions t
      JOIN users.users u   ON u.user_id = t.user_id
      JOIN events.events e ON e.event_id = t.event_id
      WHERE t.user_id = $1
      ORDER BY t.initiated_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, Number(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM payments.transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      error: null,
    });

  } catch (err: any) {
    console.error('GET /api/payments/my-tickets error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ─── GET /api/payments/verify-session ────────────────────────────────────────
// Frontend calls this after Stripe redirects back to verify payment status
router.get('/verify-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { session_id, transaction_id } = req.query;

    if (!session_id && !transaction_id) {
      return res.status(400).json({ data: null, error: 'session_id or transaction_id required' });
    }

    // Check transaction status in our database
    if (transaction_id) {
      const result = await pool.query(
        `SELECT
          t.transaction_id,
          t.status,
          t.amount,
          t.currency,
          t.invoice_number,
          t.initiated_at,
          t.completed_at,
          e.title AS event_title,
          e.start_datetime AS event_date,
          e.event_id
        FROM payments.transactions t
        JOIN events.events e ON e.event_id = t.event_id
        WHERE t.transaction_id = $1`,
        [transaction_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ data: null, error: 'Transaction not found' });
      }

      return res.json({ data: result.rows[0], error: null });
    }

    // Fallback: verify directly with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    res.json({
      data: {
        status: session.payment_status,
        transaction_id: session.metadata?.transaction_id,
      },
      error: null,
    });

  } catch (err: any) {
    console.error('verify-session error:', err.message);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;