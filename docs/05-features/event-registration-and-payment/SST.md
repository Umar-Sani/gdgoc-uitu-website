# SST — Event Registration and Payment

State Specification Template. Verified against the code on 2026-09-09.

Two state machines run in parallel and are joined by
`events.registrations.transaction_id`.

## States

### Transaction — `payments.transactions.status`

Values from `payments.transaction_status_enum`:

| Constant | Meaning |
|---|---|
| `pending` | Row created; Stripe session opened; no outcome yet |
| `success` | Stripe confirmed payment; invoice number assigned |
| `failed` | Stripe reported expiry or payment failure |
| `refunded` | **Declared but unreachable** — no code path sets it |

### Registration payment — `events.registrations.payment_status`

Values from `events.payment_status_enum`:

| Constant | Meaning |
|---|---|
| `pending` | Registration row exists awaiting settlement (paid events) |
| `completed` | Seat confirmed — set directly for free events, or by `process_payment` |
| `failed` | Settlement failed |
| `refunded` | **Declared but unreachable** |

> [!warning] The two enums do not share vocabulary
> A transaction becomes `success`; a registration becomes `completed`. Any code moving between
> them must translate.

### Implicit registration existence

For a paid event the registration row does **not** exist until the webhook settles. "No row" is
therefore a meaningful state, distinct from a row with `payment_status = 'pending'`.

## Transitions

### Free event

| From | Event | To | Guard |
|---|---|---|---|
| *(no registration)* | `POST /api/events/:id/register` | registration `completed` | Auth + username; event `published`/`ongoing`; `seats_registered < max_seats`; no existing registration |
| *(no registration)* | same | *(unchanged)* | Any guard fails → `EVENT_FULL` / `ALREADY_REGISTERED` / `EVENT_NOT_FOUND` / `EVENT_UNAVAILABLE` |

### Paid event

| From | Event | To | Guard |
|---|---|---|---|
| *(none)* | `POST /api/payments/create-checkout-session` | transaction `pending` | Auth; event exists, not free, `seats_available > 0`, `status = 'published'`; not already registered |
| transaction `pending` | Stripe `checkout.session.completed` | transaction `success` + registration `completed` | Valid signature; metadata present; transaction still `pending`; `register_user_for_event` succeeds |
| transaction `pending` | Stripe `checkout.session.expired` | transaction `failed` | Valid signature; metadata present |
| transaction `pending` | Stripe `payment_intent.payment_failed` | transaction `failed` | Valid signature; metadata present |
| transaction `success` | any further webhook for the same transaction | *(unchanged)* | `process_payment` raises `TRANSACTION_ALREADY_PROCESSED` |
| transaction `failed` | retry by the member | new `pending` transaction | Nothing reuses the failed row; a fresh one is inserted |

### Seat counter — `events.seats_registered`

| From | Event | To | Guard |
|---|---|---|---|
| *n* | `INSERT INTO events.registrations` | *n + 1* | `trg_seat_counter` re-checks `seats_registered < max_seats`, else raises `EVENT_FULL` |
| *n* | `DELETE FROM events.registrations` | *max(n − 1, 0)* | Floors at zero |

## Failure States

### FS-1 — Paid, but no registration

**Cause.** `process_payment` succeeds and `register_user_for_event` then fails inside the
webhook transaction; the whole transaction rolls back, but the handler returns **200** so Stripe
does not retry. Money taken, no seat, transaction row left `pending`.

**Mitigation.** *Currently none — this is [[../../01-planning/bugs|BUG-010]].* The fix is to
return a `5xx` so Stripe's retry schedule applies, and to record failures durably with an alert
(`TODO-026`). Until then, detection is manual: query for `status = 'pending'` transactions older
than an hour.

### FS-2 — Webhook replay

**Cause.** Stripe retries or an attacker replays a captured signed event. Event IDs are not
persisted.

**Mitigation.** Partial. `process_payment` refuses any transaction not `pending`, so replay
cannot double-settle. Full mitigation is to persist processed Stripe event IDs — `BUG-010`.

### FS-3 — Last-seat race

**Cause.** Two members register simultaneously for the final seat.

**Mitigation.** Defended three deep: `SERIALIZABLE` isolation, `SELECT ... FOR UPDATE` on the
event row inside the procedure, and a capacity re-check in `trg_seat_counter` after insert. The
loser receives `EVENT_FULL` → **409**. Never load-tested (`TODO-033`).

### FS-4 — Member abandons Stripe checkout

**Cause.** The member closes the tab or cancels.

**Mitigation.** Handled. The transaction stays `pending` until Stripe emits
`checkout.session.expired`, which settles it to `failed`. The seat was never held, so nothing
leaks. A retry creates a new transaction row.

### FS-5 — Confirmation email or notification fails

**Cause.** Brevo SMTP unavailable, or the notification insert fails.

**Mitigation.** Deliberately tolerated. Both run after the response with errors swallowed, so
registration succeeds regardless. The cost is that a failed email is invisible and never
retried — `TODO-032`. The member can still see the registration in their dashboard.

### FS-6 — Supabase Auth unreachable

**Cause.** `requireAuth` calls `supabase.auth.getUser()` on every request.

**Mitigation.** None. The request fails with `500 Auth service unavailable`. No cache, no
circuit breaker — see [[../../04-decisions/ADR-002-Supabase-Auth-Delegation|ADR-002]] and
`TODO-003`.

### FS-7 — Charged in the wrong currency

**Cause.** The transaction stores `PKR`; the Stripe session is created as `usd` with no
conversion.

**Mitigation.** *None — [[../../01-planning/bugs|BUG-001]].* Every paid registration is affected.
This needs a product decision before a code fix.
