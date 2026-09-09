# API — Event Registration and Payment

Verified against `backend/src/routes/events.ts` and `payments.ts` on 2026-09-09.
General conventions: [[../../00-core/api|00-core/api]].

## `POST /api/events/:id/register`

Register for a **free** event. Guards: `requireAuth`, `requireUsername`.

```http
POST /api/events/8f2c1a04-…/register
Authorization: Bearer <supabase access_token>
```

No request body.

**200**

```json
{ "data": { "message": "Successfully registered for event" }, "error": null }
```

| Status | `error` | Cause |
|---|---|---|
| 401 | `Authentication required` / `Invalid or expired token` | Missing or rejected token |
| 403 | `Please complete your profile setup before performing this action.` (+ `"code": "PROFILE_INCOMPLETE"`) | No username set |
| 400 | `Registration for this event is closed.` | `EVENT_UNAVAILABLE` |
| 404 | `Event not found.` | `EVENT_NOT_FOUND` |
| 409 | `This event is fully booked.` | `EVENT_FULL` |
| 409 | `You are already registered for this event.` | `ALREADY_REGISTERED` |
| 500 | `Registration failed. Please try again.` | Unmapped exception |

## `POST /api/payments/create-checkout-session`

Open a Stripe Checkout Session for a **paid** event. Guards: `requireAuth`,
`validate(createCheckoutSchema)`. Note: **no** `requireUsername`.

```json
{ "event_id": "8f2c1a04-…" }
```

**200**

```json
{
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…",
    "session_id": "cs_test_…",
    "transaction_id": "b71e9f30-…"
  },
  "error": null
}
```

The client redirects with `window.location.href = data.checkout_url`.

| Status | `error` | Cause |
|---|---|---|
| 400 | *(first Zod issue message)* | `event_id` missing or not a UUID |
| 400 | `This event is free. Use the register endpoint instead.` | `is_free` |
| 400 | `Registration for this event is closed.` | `status !== 'published'` |
| 401 | — | Auth failure |
| 404 | `Event not found` | No such event |
| 409 | `This event is fully booked.` | `seats_available === 0` |
| 409 | `You are already registered for this event.` | Existing registration |
| 500 | *(raw `err.message`)* | Stripe or database error — leaks the driver message, `BUG-011` |

## `POST /api/payments/webhook`

Called by Stripe, not by the frontend. **Public** — authenticated solely by signature.

```http
POST /api/payments/webhook
Stripe-Signature: t=1718…,v1=5257a…
Content-Type: application/json
```

The body must reach the handler **raw** — `express.raw({ type: 'application/json' })` is mounted
on this path before `express.json()`. Verified with `stripe.webhooks.constructEvent` against
`STRIPE_WEBHOOK_SECRET`.

**Handled event types**

| `event.type` | Effect |
|---|---|
| `checkout.session.completed` | `process_payment(..., 'success')` then `register_user_for_event(...)`, under SERIALIZABLE |
| `checkout.session.expired` | `process_payment(..., 'failed')` |
| `payment_intent.payment_failed` | `process_payment(..., 'failed')` |
| anything else | Acknowledged, ignored |

**200** — `{ "received": true }` (does **not** use the `{data, error}` envelope)

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Webhook Error: <message>" }` | Signature verification failed |
| 400 | `{ "error": "Missing metadata" }` | Session metadata absent |

> [!warning] 200 is also returned when settlement fails
> On a database error the handler rolls back and still responds 200, deliberately, so Stripe
> will not retry. See [[../../01-planning/bugs|BUG-010]].

## `GET /api/payments/verify-session`

Confirm outcome after returning from Stripe. Guard: `requireAuth`.

```http
GET /api/payments/verify-session?session_id=cs_test_…&transaction_id=b71e9f30-…
```

Reads the local transaction; falls back to `stripe.checkout.sessions.retrieve(session_id)` when
the webhook has not yet landed. Query parameters are **not** Zod-validated.

## `GET /api/payments/my-tickets`

The caller's paid registrations. Guard: `requireAuth`; scoped to the caller's `user_id` in SQL.
Returns a paginated list — `data`, plus sibling `total`, `page`, `limit`.

## `GET /api/events/:id/registration-status`

Whether the caller is registered for an event. Guard: `requireAuth`. Used by the event detail
page to choose between "Register" and "You're registered".

## Headers

| Header | Where |
|---|---|
| `Authorization: Bearer <token>` | Every guarded endpoint above |
| `Content-Type: application/json` | All request bodies (50 KB cap) |
| `Stripe-Signature` | Webhook only |
| `RateLimit-*` | All responses — `standardHeaders: true`, `legacyHeaders: false` |

No CSRF token: authentication is header-based, not cookie-based.
