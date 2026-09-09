# Security — Event Registration and Payment

Threats specific to this feature and the controls that address them. System-wide posture:
[[../../00-core/Security|00-core/Security]].

This is the highest-value target in the application: it is the only path that moves money.

## Threats and controls

### T1 — Overbooking an event by racing the seat check

**Threat.** Two members register for the last seat simultaneously; a naive check-then-write lets
both through, and the chapter has more attendees than seats.

**Controls.** Three, layered:

1. `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE` around both write paths.
2. `SELECT ... FOR UPDATE` on the event row inside `register_user_for_event`, taken **before**
   any check, so concurrent callers serialise on that row.
3. A capacity re-check in `trg_seat_counter` after the insert, raising `EVENT_FULL`.

**Residual risk.** Never load-tested — correct by construction, unverified in practice
(`TODO-033`).

### T2 — Registering twice for the same event

**Threat.** Duplicate seats, duplicate charges.

**Controls.** `UNIQUE (event_id, user_id)` at the database level, plus an `EXISTS` pre-check in
the procedure and another in the checkout handler. The constraint is the one that actually
guarantees it.

**Residual risk.** None material.

### T3 — Forging a payment confirmation

**Threat.** An attacker posts a fake `checkout.session.completed` to the public webhook and
receives a free registration.

**Controls.** `stripe.webhooks.constructEvent` verifies the HMAC signature against
`STRIPE_WEBHOOK_SECRET` over the **raw** body. `express.raw` is deliberately mounted before
`express.json()` for this path — parsing and re-serialising would break verification.

**Residual risk.** The secret must actually be set in production; there is no boot-time check
that it is (`TODO-014`). If `STRIPE_WEBHOOK_SECRET` were unset, the non-null assertion would let
the process start and fail at first webhook.

### T4 — Replaying a genuine signed webhook

**Threat.** A captured legitimate event is replayed to settle a transaction twice or create
duplicate registrations.

**Controls.** Partial. Stripe event IDs are **not** persisted, so replays reach the handler. The
only defence is `process_payment`'s `TRANSACTION_ALREADY_PROCESSED` guard, which refuses any
transaction not `pending`.

**Residual risk.** Real. One database state check carries the whole burden, with no test
covering it — [[../../01-planning/bugs|BUG-010]].

### T5 — Paying and receiving nothing

**Threat.** Settlement succeeds at Stripe but the database transaction fails; the member is
charged with no registration.

**Controls.** The webhook wraps `process_payment` and `register_user_for_event` in one
SERIALIZABLE transaction, so the two never diverge in the database.

**Residual risk.** Significant. On failure the handler rolls back and **returns 200** so Stripe
will not retry. Money taken, no seat, no alert, no record beyond a `pending` row. This is the
most serious defect in the feature — `BUG-010`, and FS-1 in [[SST]].

### T6 — Tampering with the amount

**Threat.** A client manipulates the price to pay less.

**Controls.** Strong. The client sends only `event_id`; `ticket_price` is read server-side from
`events.v_event_summary`, and `unit_amount` is computed on the server. The client never supplies
a price.

**Residual risk.** None from tampering — but the amount is wrong for a different reason. The
session is created with `currency: 'usd'` while the transaction row records `'PKR'`, with no
conversion, so members are charged roughly 280× the intended amount
([[../../01-planning/bugs|BUG-001]]).

### T7 — Handling card data

**Threat.** PCI exposure.

**Controls.** Eliminated by design. Stripe hosted checkout means card details never reach this
application — the browser is redirected to Stripe's own domain. `@stripe/stripe-js` is not even
used on the client. See [[../../04-decisions/ADR-004-Stripe-Hosted-Checkout|ADR-004]].

**Residual risk.** None for card data. `payments.transactions.metadata` stores the gateway
response; `payments.v_transaction_report` deliberately excludes it from reporting.

### T8 — Reading another member's tickets or registrations

**Threat.** IDOR against `/api/payments/my-tickets` or `/api/users/me/registrations`.

**Controls.** Every user-scoped query filters on the authenticated `user_id` in SQL rather than
on a client-supplied identifier. Primary keys are UUIDs, so enumeration is impractical.

**Residual risk.** RLS would be the defence-in-depth layer here and is inert (`BUG-004`), so
correctness rests entirely on each handler's `WHERE` clause. Not systematically tested
(`TODO-022`).

### T9 — Registering without a completed profile

**Threat.** Inconsistent identity on the attendee list.

**Controls.** `requireUsername` on the free path.

**Residual risk.** **The paid path does not enforce it.** `create-checkout-session` uses only
`requireAuth`, and the webhook's `register_user_for_event` does not check either — so a member
without a username can pay and be registered. Inconsistent rather than dangerous, but it is a
real gap in the guard matrix.

### T10 — Abusing checkout session creation

**Threat.** Bulk session creation to spam Stripe or fill the transactions table with `pending`
rows.

**Controls.** Global rate limit only — 300 requests / 15 min / IP. Neither payment endpoint is
covered by the stricter `writeLimiter`.

**Residual risk.** Meaningful. IP-keyed limiting is undermined by the missing `trust proxy`
(`BUG-008`), and there is no per-user limit (`TODO-019`). Abandoned `pending` rows accumulate
with nothing pruning them.

### T11 — Information leakage on failure

**Threat.** Error responses reveal schema details.

**Controls.** Registration failures are mapped to fixed, generic messages.

**Residual risk.** `create-checkout-session` returns raw `err.message` on 500, bypassing the
central handler's production redaction — `BUG-011`.

## Control summary

| Control | Status |
|---|---|
| SERIALIZABLE + row lock + trigger re-check on seats | ✅ |
| `UNIQUE (event_id, user_id)` | ✅ |
| Stripe webhook signature verification | ✅ |
| Amount computed server-side | ✅ |
| No card data in the application | ✅ |
| User-scoped queries filtered by authenticated id | ✅ |
| Settlement idempotency | ⚠️ single state check, untested |
| Webhook replay protection | ❌ `BUG-010` |
| Retry on settlement failure | ❌ `BUG-010` |
| Correct currency | ❌ `BUG-001` |
| Username required on the paid path | ❌ |
| Per-user rate limiting | ❌ `TODO-019` |
| Error redaction on checkout 500s | ❌ `BUG-011` |
| RLS as defence in depth | ❌ `BUG-004` |
