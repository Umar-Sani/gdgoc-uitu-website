# Error Handling

> Verified against `backend/src/` on 2026-09-09.

## API Error Shape

Every error response is the same two-field envelope, with `error` as a plain string:

```json
{ "data": null, "error": "This event is fully booked." }
```

One exception carries a third field — `requireUsername` returns
`{ data: null, error: "…", code: "PROFILE_INCOMPLETE" }` — because the frontend must
distinguish "finish your profile" from a generic 403.

**There are no custom error classes.** No `class …Error` exists in `backend/src/`.

**There is a central error handler, and it is nearly dead code.** `backend/src/index.ts`
defines one that redacts messages in production behind a `ref` correlation id — but no route
handler calls `next(err)` or throws. Every handler wraps its body in `try/catch` and responds
directly, so the handler only ever sees errors thrown by Express internals such as malformed
JSON.

> [!warning] Most 500s leak the raw driver message
> Because handlers respond directly, the production redaction never applies to them. A failing
> query returns `err.message` verbatim to the client regardless of `NODE_ENV`. See `BUG-011`.

**Error discrimination is by string matching**, not error codes. `events.ts` maps stored
procedure exceptions by substring:

| Substring raised by the procedure | HTTP | Client message |
|---|---|---|
| `EVENT_FULL` | 409 | This event is fully booked. |
| `ALREADY_REGISTERED` | 409 | You are already registered for this event. |
| `EVENT_NOT_FOUND` | 404 | Event not found. |
| `EVENT_UNAVAILABLE` | 400 | Registration for this event is closed. |
| *(anything else)* | 500 | Registration failed. Please try again. |

PostgreSQL error **codes** are inspected in exactly two places, both in `cms.ts`: `23505`
(unique violation) → `409`.

Validation failures return `400` with only the **first** Zod issue's message; the field path is
discarded (`TODO-012`).

## Retry Behavior

**There is no retry logic anywhere in the codebase.** No backoff helper, no retry wrapper, no
queue. Every outbound call is attempted exactly once:

| Call | On failure |
|---|---|
| Supabase `getUser` per request | `500 Auth service unavailable` — the request fails |
| `pg` query | Error surfaces to the handler's `catch` |
| Stripe API | Error surfaces to the handler's `catch` |
| Cloudinary upload | `500` to the client |
| Brevo SMTP send | **Swallowed** — `.catch(() => {})` |

Email is deliberately fire-and-forget: sends happen outside the response path, and
`announceNewEvent` uses `Promise.allSettled` so one bad address cannot abort the batch. The
tradeoff is that a failed email is invisible — nothing records or retries it (`TODO-032`).

Clients do not retry either; the frontend's `fetch` calls are single-shot, and most swallow
errors with `.catch(() => {})`.

## Idempotency

| Operation | Protection |
|---|---|
| Event registration | ✅ UNIQUE `(event_id, user_id)`, plus an `EXISTS` pre-check in the procedure |
| Payment settlement | ⚠️ `process_payment` raises `TRANSACTION_ALREADY_PROCESSED` unless status is `pending` |
| Stripe checkout creation | ❌ no idempotency key sent |
| Stripe webhook delivery | ❌ event IDs are not recorded |
| Notification insert | ❌ no dedupe |

> [!warning] Webhook replay is stopped only by a database state check
> Stripe retries deliveries, and event IDs are never persisted. A replayed signed event is
> reprocessed; the only thing preventing double-settlement is that the transaction is no
> longer `pending`. That is load-bearing behaviour with no test covering it. `BUG-010`.

## Circuit Breaker

**None.** There is no circuit breaker, bulkhead, or timeout budget. If Supabase Auth slows
down, every authenticated request slows with it, because `requireAuth` makes a network call
per request (`TODO-003`). The `pg` pool has a 5-second acquisition timeout, which is the
closest thing to a failure bound in the system; there is no `statement_timeout`, so a slow
query can hold a connection indefinitely (`TODO-006`).

## Cache / Broker Failure

**Not applicable — there is no cache and no message broker.** No Redis, no queue, no
in-process cache. Every request reads PostgreSQL directly.

This is worth stating explicitly because it removes an entire class of failure mode, at the
cost of putting all load on the database. Adding a cache is captured as an idea, not a plan —
see [[../06-ideas/_Ideas_Index|06-ideas]].

## Background Job Failure

**No application-level background jobs exist.** Nothing is queued, scheduled or deferred in
Node; the only asynchronous work is fire-and-forget email.

At the database level, `pg_cron` is installed but **no job is scheduled**. Two things that
should be running are not:

1. **Materialized view refresh** — `ai_metadata.v_trending_topics` is uniquely indexed so it
   *can* be refreshed concurrently, and a schedule is written in a SQL comment, but
   `cron.schedule()` is never called. The view holds whatever data it had at creation.
2. **Audit partition creation** — partitions exist for 2026 only, with no `DEFAULT` partition.

> [!warning] Audit logging will start failing on 2027-01-01
> With no partition for the incoming row and no default, the insert raises *no partition of
> relation found for row*. Audit triggers fire `AFTER` on 10 tables, so this failure will
> **abort the originating write** — users, events, registrations, transactions, threads and
> replies all become unwritable. This is the highest-severity latent defect in the system.
> See `BUG-005`.
