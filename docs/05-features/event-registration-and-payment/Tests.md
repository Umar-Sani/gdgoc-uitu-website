# Tests — Event Registration and Payment

> [!warning] Current coverage is zero
> **No automated test exists for any part of this feature.** No unit, integration, or end-to-end
> test; no test framework is installed in either app; no CI runs anything. Verified 2026-09-09.
> See [[../../00-core/Testing_Strategy|Testing_Strategy]].
>
> This is the feature that moves money and holds the system's only true concurrency invariant.
> It is also the feature with the least verification.

## Coverage

| Area | Coverage | Notes |
|---|---|---|
| `register_user_for_event` | ❌ none | Four exception paths, all unverified |
| `process_payment` | ❌ none | Including the idempotency guard that prevents double-settlement |
| `trg_seat_counter` | ❌ none | The capacity re-check has never been exercised |
| Concurrent last-seat registration | ❌ none | The three-layer defence is unverified under load |
| Webhook signature verification | ❌ none | |
| Webhook replay | ❌ none | The behaviour in `BUG-010` is undetected by any test |
| Exception → HTTP mapping | ❌ none | Substring matching is silently fragile |
| Checkout pre-flight guards | ❌ none | Five ordered checks |
| Currency handling | ❌ none | `BUG-001` would have been caught by one assertion |
| Guard matrix (auth / username / role) | ❌ none | The paid-path username gap is untested |
| Frontend checkout redirect and return legs | ❌ none | |

**What partially substitutes today:** TypeScript `strict` mode, and database constraints doing
real work — `UNIQUE (event_id, user_id)`, `CHECK` constraints, and the seat-counter trigger hold
whether or not tests exist. Manual browser verification was the delivery-time practice.

## Planned tests

Ranked by the cost of the defect they would catch. All are tracked under `TODO-033`; the CI to
run them is `TODO-034`.

### P1 — Concurrent registration for the last seat

Two simultaneous `register_user_for_event` calls against an event with `seats_registered =
max_seats - 1`. **Expect:** exactly one success; the other fails with `EVENT_FULL`;
`seats_registered = max_seats` exactly. Requires a real PostgreSQL — this cannot be mocked, as
the property under test is the isolation level.

### P2 — Webhook replay

Deliver the same signed `checkout.session.completed` twice. **Expect:** first settles; second
raises `TRANSACTION_ALREADY_PROCESSED`; exactly one registration; one invoice number.
Directly covers `BUG-010`.

### P3 — Settlement failure must not be acknowledged as success

Force `register_user_for_event` to fail inside the webhook transaction. **Expect (after the
fix):** a `5xx` so Stripe retries. **Today:** returns 200 — this test fails until `BUG-010` is
fixed, which is the point of writing it now.

### P4 — Currency and amount

Create a paid event at a known `ticket_price`. **Expect:** the Stripe session amount and
currency match the intended charge. Fails today — `BUG-001`.

### P5 — Guard matrix

Table-driven: each endpoint × {anonymous, authed-no-username, member, editor, admin,
super_admin}. **Expect:** the matrix in [[API]]. Would immediately surface the paid-path
username gap, and would have caught `BUG-007` elsewhere in the codebase.

### P6 — Exception mapping

Each of the four raised exceptions maps to its documented status code. Cheap, and protects
against a rename in PL/pgSQL silently degrading the API to 500s.

### P7 — Checkout pre-flight ordering

Free event → 400; full event → 409; unpublished → 400; already registered → 409; and **no
`pending` transaction row is created** when any check fails.

### P8 — Abandoned checkout

`checkout.session.expired` settles the transaction to `failed`, leaves no registration, and
does not change `seats_registered`.

## Related TODOs

| ID | Task |
|---|---|
| `TODO-033` | Write automated tests, starting with P1–P5 |
| `TODO-034` | CI to run them — begin with `tsc --noEmit` per PR |
| `TODO-035` | A non-production database to test against; local currently appears to share production |

## Suggested harness

Integration tests need a real PostgreSQL with the schema applied — the logic under test lives in
procedures and triggers, so mocking `pg` would test nothing that matters. Stripe should be
exercised through its CLI (`stripe listen --forward-to localhost:4000/api/payments/webhook`) or
fixture events, so signature verification is genuinely covered rather than stubbed out.
