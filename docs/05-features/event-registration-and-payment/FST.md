# FST — Event Registration and Payment

Feature Specification Template. Verified against the code on 2026-09-09.

## Purpose

Let a member claim a seat at a chapter event, taking payment where the event is paid, without
ever overbooking the event or settling a payment twice.

## Scope

**In scope:** free registration, paid registration via Stripe hosted checkout, seat accounting,
transaction and invoice records, registration confirmation notification and email, the member's
view of their registrations and tickets.

**Out of scope but adjacent:** event creation and editing (admin), the event people/speaker
list, attendance confirmation, refunds.

## Functional Requirements

1. **Authentication.** Registration requires a valid Supabase access token. Free registration
   additionally requires a username (`requireUsername`); the paid checkout endpoint requires
   only `requireAuth`.

   > [!note] The two paths guard differently
   > `POST /api/events/:id/register` uses `requireAuth, requireUsername`.
   > `POST /api/payments/create-checkout-session` uses `requireAuth, validate(createCheckoutSchema)`
   > — **no** `requireUsername`. A user without a username can reach Stripe checkout, and the
   > `register_user_for_event` call in the webhook does not check for a username either.

2. **Eligibility.** An event accepts registration only when `status` is `published` or
   `ongoing` (the procedure's rule) — the checkout endpoint is stricter and requires exactly
   `published`. Seats must remain: `seats_registered < max_seats`.

3. **Uniqueness.** At most one registration per `(event_id, user_id)`, enforced by a database
   `UNIQUE` constraint and pre-checked in both the procedure and the checkout handler.

4. **Free events register immediately** with `payment_status = 'completed'`. Determined by
   `events.is_free`, which the schema ties to price via
   `CHECK (is_free = TRUE OR ticket_price > 0)`.

5. **Paid events require settlement first.** The transaction row is created with
   `status = 'pending'` and `currency = 'PKR'` **before** the Stripe session, so its id can be
   carried in Stripe metadata. Registration is created only in the webhook, after
   `process_payment` succeeds.

6. **Stripe session shape.** `mode: 'payment'`, `payment_method_types: ['card']`,
   `customer_email` from the Supabase user, one inline `price_data` line item with
   `unit_amount: Math.round(ticket_price * 100)` and `currency: 'usd'` (hard-coded — see
   [[../../01-planning/bugs|BUG-001]]). Metadata carries `transaction_id`, `event_id`,
   `user_id`.

7. **Return URLs.**
   `success_url`: `<FRONTEND_URL>/events/<event_id>/payment-success?session_id={CHECKOUT_SESSION_ID}&transaction_id=<txn>`
   `cancel_url`: `<FRONTEND_URL>/events/<event_id>/payment-failed?transaction_id=<txn>`

8. **Invoice format.** On successful settlement, `process_payment` writes
   `INV-<YYYY>-<6-digit zero-padded>` from `payments.invoice_seq` — e.g. `INV-2026-000042`.
   Only the `success` path assigns one; other statuses write NULL.

9. **Seat accounting.** `events.seats_registered` is maintained exclusively by the
   `trg_seat_counter` trigger on `events.registrations` (`AFTER INSERT OR DELETE`). No
   application code increments it. Decrements floor at zero.

10. **Concurrency.** Both write paths run under
    `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`, and `register_user_for_event` takes
    `SELECT ... FOR UPDATE` on the event row before any check.

11. **Idempotency of settlement.** `process_payment` raises
    `TRANSACTION_ALREADY_PROCESSED` unless the transaction is `pending`.

12. **Notification.** On success a `registration_confirmed` in-app notification is written.
    This type is **transactional** — the confirmation email sends regardless of the member's
    email preferences, though delivery itself is fire-and-forget.

13. **Webhook events handled.** `checkout.session.completed` → settle as `success`;
    `checkout.session.expired` and `payment_intent.payment_failed` → settle as `failed`. All
    other event types are acknowledged and ignored.

14. **Rate limiting.** Both endpoints fall under the global limiter only: 300 requests per
    15 minutes per IP. Neither is covered by `writeLimiter`.

## Non-goals

- **Refunds.** `payments.transaction_status_enum` has a `refunded` value and the table has a
  `refunded_at` column, but no code path sets either. `process_payment` never writes
  `refunded_at`, and calling it with `'refunded'` maps the registration to `failed`.
- **Waitlists.** A full event returns 409; there is no queue.
- **Cancelling a registration.** No endpoint deletes a registration. The seat counter handles
  `DELETE`, so the database is ready for it, but nothing exposes it.
- **Multiple tickets per registration.** `quantity` is always 1.
- **Currencies other than what Stripe is given.** See `BUG-001` — this is a defect, not a
  deliberate non-goal, but no multi-currency support exists.
- **Partial payment, instalments, discount codes, or group registration.**
- **Attendance confirmation.** `registrations.attendance_confirmed` exists and defaults to
  `FALSE`; nothing sets it.
