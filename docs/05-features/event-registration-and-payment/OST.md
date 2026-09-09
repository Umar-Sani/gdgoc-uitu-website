# OST — Event Registration and Payment

Operational Scenario Template. Verified against the code on 2026-09-09.

## Scenario

A signed-in member registers for a chapter event. If the event is free, registration completes
immediately. If it is paid, the member is sent to Stripe's hosted checkout, and registration is
created only after Stripe confirms payment by webhook.

## Actors

| Actor | Role |
|---|---|
| Member | A signed-in user with a username set (`requireUsername` blocks incomplete profiles) |
| Next.js frontend | Collects intent, holds the Supabase access token, redirects to Stripe |
| Express API | Guards, transaction boundary, Stripe orchestration |
| PostgreSQL | Owns the invariants via `register_user_for_event` and `process_payment` |
| Stripe | Collects card details; calls back by webhook |
| Brevo SMTP | Delivers the confirmation email |

## Preconditions

- The member is authenticated; the frontend holds a valid Supabase `access_token`.
- The member has a `username` set.
- The event exists with `status = 'published'` and `seats_available > 0`.
- For the paid path: `is_free = false` and `ticket_price > 0`.
- The member is not already registered — enforced by `UNIQUE (event_id, user_id)`.

## Main Flow — free event

1. Member opens `/events/<uuid>` and clicks register.
2. Frontend sends:

   ```http
   POST /api/events/<uuid>/register
   Authorization: Bearer <supabase access_token>
   ```

3. `requireAuth` verifies the token via `supabase.auth.getUser(token)`; `requireUsername`
   confirms a username exists.
4. Handler acquires a pooled client and opens
   `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
5. `CALL public.register_user_for_event($userId, $eventId)` — the procedure takes
   `SELECT ... FOR UPDATE` on the event row, checks existence, status, capacity and prior
   registration, then inserts into `events.registrations` with `payment_status = 'completed'`
   (because the event is free).
6. `trg_seat_counter` fires `AFTER INSERT`, re-checks capacity, and increments
   `events.seats_registered`.
7. `COMMIT`.
8. Response **200**:

   ```json
   { "data": { "message": "Successfully registered for event" }, "error": null }
   ```

9. Fire-and-forget, after the response: an in-app `registration_confirmed` notification is
   written, and if the member's preferences allow it, a confirmation email is sent. Both
   failures are swallowed.

## Main Flow — paid event

1. Member opens `/events/<uuid>/checkout`.
2. Frontend sends `POST /api/payments/create-checkout-session` with `{ "event_id": "<uuid>" }`.
3. Handler reads `events.v_event_summary` and rejects: missing event → **404**; `is_free` →
   **400**; `seats_available === 0` → **409**; `status !== 'published'` → **400**; already
   registered → **409**.
4. A transaction row is inserted **before** contacting Stripe, so its id can travel as metadata:

   ```sql
   INSERT INTO payments.transactions
     (user_id, event_id, amount, currency, gateway, status, initiated_at)
   VALUES ($1, $2, $3, 'PKR', 'stripe', 'pending', NOW())
   ```

5. A Stripe Checkout Session is created — `mode: 'payment'`, `payment_method_types: ['card']`,
   `unit_amount: Math.round(ticket_price * 100)`, and `metadata` carrying `transaction_id`,
   `event_id`, `user_id`.

   > [!warning] The session is created with `currency: 'usd'` while the row says `'PKR'`
   > No conversion is applied. See [[../../01-planning/bugs|BUG-001]].

6. Response **200** with `{ checkout_url, session_id, transaction_id }`.
7. Frontend redirects: `window.location.href = checkout_url`.
8. Member pays on Stripe's page. Stripe redirects to
   `/events/<uuid>/payment-success?session_id={CHECKOUT_SESSION_ID}&transaction_id=<uuid>`.
9. **Independently**, Stripe calls `POST /api/payments/webhook` with a signed raw body.
   `stripe.webhooks.constructEvent` verifies the signature against `STRIPE_WEBHOOK_SECRET`;
   a bad signature returns **400**.
10. On `checkout.session.completed`, inside `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`:
    `CALL public.process_payment($txn, $gatewayResponse, 'success')` — which locks the
    transaction row, refuses anything not `pending`, generates an invoice number
    `INV-<YYYY>-<NNNNNN>`, and flips the linked registration's `payment_status` to `completed`.
    Then `CALL public.register_user_for_event($user, $event)`. Then `COMMIT`.
11. Webhook responds **200** `{ "received": true }`.
12. The success page calls `GET /api/payments/verify-session` to confirm state, then links the
    member to `/dashboard/tickets`.

On `checkout.session.expired` or `payment_intent.payment_failed`, step 10 instead calls
`process_payment(..., 'failed')`.

## Success Criteria

- Exactly one row exists in `events.registrations` for the `(event_id, user_id)` pair.
- `events.seats_registered` reflects the true count and never exceeds `max_seats`.
- For a paid event, `payments.transactions.status = 'success'` with a non-null
  `invoice_number`, and the registration's `payment_status = 'completed'`.
- The member sees the event under `/dashboard/registrations`, and a paid one under
  `/dashboard/tickets`.
- A `registration_confirmed` notification exists; the email is best-effort.

> [!warning] One documented way this can fail silently
> If the database transaction in step 10 fails, the handler rolls back and **still returns
> 200** so Stripe will not retry. The member has paid and holds no registration, and nothing
> alerts anyone. See [[../../01-planning/bugs|BUG-010]].
