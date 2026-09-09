# LST — Event Registration and Payment

Logic Specification Template. Verified against the code on 2026-09-09.

## Rules

### R1 — `register_user_for_event(p_user_id UUID, p_event_id UUID)`

```text
1. SELECT * INTO v_event FROM events.events
     WHERE event_id = p_event_id
     FOR UPDATE                         ← exclusive row lock, taken before any check
2. IF NOT FOUND                         → RAISE 'EVENT_NOT_FOUND: Event % does not exist.'
3. IF v_event.status NOT IN ('published','ongoing')
                                        → RAISE 'EVENT_UNAVAILABLE: Event is in % status …'
4. IF v_event.seats_registered >= v_event.max_seats
                                        → RAISE 'EVENT_FULL: No seats remaining for event %.'
5. IF EXISTS (registration for this user+event)
                                        → RAISE 'ALREADY_REGISTERED: User % is already …'
6. INSERT INTO events.registrations (event_id, user_id, payment_status)
     VALUES (p_event_id, p_user_id,
             CASE WHEN v_event.is_free THEN 'completed' ELSE 'pending' END)
7. RAISE NOTICE 'REGISTRATION_SUCCESS: registration_id = %'
```

The lock at step 1 is what makes steps 3–5 trustworthy: concurrent callers serialise on the
event row. The procedure does **not** touch `seats_registered` — that is R3's job.

### R2 — `process_payment(p_transaction_id, p_gateway_response JSONB, p_status DEFAULT 'success')`

```text
1. SELECT * INTO v_txn FROM payments.transactions
     WHERE transaction_id = p_transaction_id FOR UPDATE
2. IF NOT FOUND        → RAISE 'TRANSACTION_NOT_FOUND: Transaction % does not exist.'
3. IF v_txn.status != 'pending'
                       → RAISE 'TRANSACTION_ALREADY_PROCESSED: Transaction % has status %.'
4. IF p_status = 'success' THEN
       v_inv_num := 'INV-' || to_char(NOW(),'YYYY') || '-'
                    || LPAD(nextval('payments.invoice_seq')::TEXT, 6, '0')
5. UPDATE payments.transactions SET
       status         = p_status,
       metadata       = p_gateway_response,
       invoice_number = v_inv_num,          ← NULL on any non-success status
       completed_at   = CASE WHEN p_status='success' THEN NOW() ELSE NULL END,
       updated_at     = NOW()
6. UPDATE events.registrations SET
       payment_status = CASE WHEN p_status='success' THEN 'completed' ELSE 'failed' END
     WHERE transaction_id = p_transaction_id
```

Step 3 is the system's **only** idempotency guard for payments.

**Invoice number format:** `INV-<YYYY>-<NNNNNN>` — literal `INV`, the four-digit year at
settlement time, and a six-digit zero-padded value from `payments.invoice_seq`. Example:
`INV-2026-000042`. The sequence is global, not per-year, so the numeric part does not reset in
January.

> [!note] Two quirks worth knowing before changing this
> `refunded_at` is never written, even when called with `p_status = 'refunded'`; and a
> `'refunded'` status maps the registration to `failed`, not `refunded`.

### R3 — `events.seat_counter()` trigger function

```text
ON INSERT:
  PERFORM 1 FROM events.events WHERE event_id = NEW.event_id FOR UPDATE
  IF (SELECT seats_registered …) >= (SELECT max_seats …)
      → RAISE 'EVENT_FULL: No seats remaining for event %'   ← note: no trailing period
  UPDATE events.events SET seats_registered = seats_registered + 1
ON DELETE:
  UPDATE events.events SET seats_registered = GREATEST(seats_registered - 1, 0)
```

Capacity is therefore checked **twice** on every registration — once in R1 against the locked
snapshot, once here after the insert. The two `EVENT_FULL` messages differ by a trailing period,
which matters because the API discriminates by substring (R5).

### R4 — Stripe amount conversion

```text
unit_amount = Math.round(event.ticket_price * 100)
currency    = 'usd'          ← hard-coded
```

`ticket_price` is `NUMERIC(10,2)` and the transaction row is written with `currency = 'PKR'`.
No exchange rate is applied — the numeric value is reinterpreted. A ₨2,000.00 ticket becomes
`unit_amount: 200000`, i.e. **$2,000.00**. See [[../../01-planning/bugs|BUG-001]].

### R5 — Exception-to-HTTP mapping

The API discriminates database exceptions by **substring match on `err.message`**:

| Substring | Status | Client message |
|---|---|---|
| `EVENT_FULL` | 409 | This event is fully booked. |
| `ALREADY_REGISTERED` | 409 | You are already registered for this event. |
| `EVENT_NOT_FOUND` | 404 | Event not found. |
| `EVENT_UNAVAILABLE` | 400 | Registration for this event is closed. |
| *(no match)* | 500 | Registration failed. Please try again. |

Renaming an exception in PL/pgSQL silently degrades the API to 500s. There is no shared
constant and no test — see [[Tests]].

### R6 — Checkout pre-flight order

Checks run in this order, each returning immediately:

```text
event missing            → 404
event.is_free            → 400  "This event is free. Use the register endpoint instead."
seats_available === 0    → 409
status !== 'published'   → 400
already registered       → 409
```

Only then is the `pending` transaction row inserted, and only then is Stripe contacted. The
ordering matters: the transaction row must exist before the Stripe call so its id can be
embedded in session metadata.

### R7 — Webhook dispatch

```text
constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)   ← bad signature → 400
switch (event.type):
  'checkout.session.completed'
      → SERIALIZABLE: process_payment(txn, response, 'success')
                      register_user_for_event(user, event)
                      COMMIT
      → on DB failure: ROLLBACK, but still respond 200   ← BUG-010
  'checkout.session.expired' | 'payment_intent.payment_failed'
      → process_payment(txn, response, 'failed')
  default → ignore
respond 200 { received: true }
```

The raw body is available because `express.raw({ type: 'application/json' })` is mounted on
this exact path **before** `express.json()` in `index.ts`. Reordering that middleware breaks
signature verification.

## Edge Cases

| Case | Behaviour |
|---|---|
| Free event, user lacks a username | 403 with `code: 'PROFILE_INCOMPLETE'` |
| **Paid event, user lacks a username** | **Allowed through** — the checkout endpoint has no `requireUsername`, and the webhook's `register_user_for_event` does not check either |
| Event `status = 'ongoing'` | Free path allows it (procedure permits `published`/`ongoing`); paid path rejects it (requires exactly `published`) |
| `max_seats` reached between checkout and webhook | `register_user_for_event` raises `EVENT_FULL` inside the webhook; the whole transaction rolls back — but the member has already paid (FS-1) |
| Stripe metadata missing | Webhook returns 400 without touching the database |
| `payment_intent.payment_failed` payload | Cast to `Stripe.Checkout.Session` to read `.metadata` — a PaymentIntent has a different shape, so metadata may be absent |
| Duplicate registration attempt | Caught twice: `EXISTS` check in R1, then `UNIQUE (event_id, user_id)` |
| Transaction retried after failure | A new `pending` row is inserted; the failed row is never reused |
| `ticket_price` with sub-cent precision | `Math.round` at step R4; `NUMERIC(10,2)` makes this moot in practice |

## Dependencies

**Backend imports** (`backend/src/routes/`):

| Import | Used for |
|---|---|
| `pool` from `../db/client` | Pooled `pg` client; `pool.connect()` for explicit transactions |
| `requireAuth`, `requireUsername` from `../middleware/auth` | Guards |
| `validate`, `createCheckoutSchema` from `../lib/validate` | Body validation on checkout |
| `createNotification` from `../lib/notifications` | In-app `registration_confirmed` |
| `sendRegistrationConfirmed` from `../lib/mailer` | Confirmation email |
| `Stripe` from `stripe` | SDK, pinned to API version `2023-10-16` |

**Database objects:** `public.register_user_for_event`, `public.process_payment`,
`events.v_event_summary`, `payments.invoice_seq`, `trg_seat_counter`, and the `UNIQUE
(event_id, user_id)` constraint.

**Environment:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Frontend:** `frontend/app/(public)/events/[id]/checkout/page.tsx` and the `payment-success`,
`payment-failed`, `registered` pages; `frontend/app/(member)/dashboard/tickets/page.tsx`.
