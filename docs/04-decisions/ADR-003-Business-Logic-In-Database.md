# ADR-003 — Business Logic in the Database

> [!note] Written retroactively on 2026-09-09
> Reconstructed from `GDGOC_UITU_schema.sql` and the call sites. This decision had an academic
> driver as well as an engineering one — see Why.

## Decision

Seat allocation, payment settlement, and recommendation generation are implemented as PL/pgSQL
stored procedures called with `CALL`, not as application code.

## Alternatives

| Option | Summary |
|---|---|
| All logic in Express | Transactions in application code with explicit `BEGIN`/`COMMIT`. Familiar, testable with ordinary tooling, debuggable in one language. |
| **Stored procedures for the invariant-critical paths** | The database owns the operations that must not race. Application orchestrates. |
| Application logic plus advisory locks | Keep logic in Node but coordinate with PostgreSQL advisory locks. |

## Selected

Stored procedures for `register_user_for_event`, `process_payment`,
`generate_ai_recommendations`, and (nominally) `moderate_forum_content`.

## Why

Two reasons, and honesty requires naming both.

**Engineering:** the correctness requirement is that an event must never overbook, and a payment
must never settle twice. Both are races. Putting the check and the write in the same procedure,
under a `SELECT ... FOR UPDATE` row lock, inside a caller-supplied `SERIALIZABLE` transaction,
makes the invariant hold at the layer that actually arbitrates concurrency. An application-level
check-then-write cannot make that guarantee without doing the same locking anyway.

**Academic:** this is a Database Systems course project. The frozen PRD lists demonstrating
stored procedures, triggers, and `SERIALIZABLE` isolation as explicit learning objectives. Some
of this logic is in the database because the assignment asked for it — `generate_ai_recommendations`
in particular is a scoring loop that would be unremarkable in TypeScript.

Recording that distinction matters: a future maintainer weighing whether to move this logic out
should know which parts are load-bearing (seats, payments) and which were pedagogical
(recommendations).

## Cost

Logic split across two languages and two repositories-of-truth. Debugging spans TypeScript and
PL/pgSQL. The procedures are versioned only as part of one large schema file, with no migration
tool (`TODO-009`).

The sharpest cost is **error handling by string matching**: procedures signal failure by raising
exceptions like `EVENT_FULL`, and `events.ts` maps them with substring matching on `err.message`
([[../00-core/ErrorHandling]]). That coupling is invisible to the type system — renaming an
exception silently breaks the API's status codes.

Testing is also harder: none of these procedures is covered by a test, and testing them requires
a real PostgreSQL ([[../00-core/Testing_Strategy]]).

## Migration Cost

None — greenfield.

## Security Impact

**Positive:** `audit.log_change()` is `SECURITY DEFINER`, so audit rows are written even under
restrictive policies. Capacity and idempotency checks cannot be bypassed by a buggy caller,
because they live below the API.

**Negative:** `process_payment`'s `TRANSACTION_ALREADY_PROCESSED` guard is currently the *only*
thing preventing double-settlement on a replayed webhook
([[../01-planning/bugs|BUG-010]]) — a single database check carrying a lot of weight, untested.

## Performance Impact

**Unmeasured.** Structurally favourable for registration: one round-trip instead of several, and
locking held for a shorter window. `generate_ai_recommendations` loops per candidate event in
PL/pgSQL, which will not scale gracefully with the event catalogue, though at ~100 events per
semester that is theoretical.

## Vendor Lock-in

**Low for the provider, high for the engine.** These are plain PostgreSQL procedures — they move
to any PostgreSQL host unchanged, so this does not lock the project to Supabase. It does commit
the project to PostgreSQL specifically: moving to a different engine would require rewriting all
four procedures, 25 triggers, and the partitioning scheme.

## Reversal Plan

**Trigger.** Wanting testable business logic in CI without a live database, or finding
procedure maintenance is slowing feature work.

**Difficulty.** Moderate and, importantly, **incremental** — the procedures are independent.
`generate_ai_recommendations` could move to TypeScript tomorrow with no correctness risk;
that is the natural first candidate, since it is the one that is in the database for
pedagogical rather than engineering reasons. `register_user_for_event` and `process_payment`
should move last, if ever, and only with the locking replicated exactly. No data migration is
involved either way.

## Sources

- `ProjectDocs/GDGOC_UITU_schema.sql` — procedure definitions and triggers
- `backend/src/routes/events.ts`, `payments.ts`, `users.ts` — call sites and exception mapping
- The frozen PRD's academic objectives

## Date

Decided ~2026-02 (unrecorded). Written up 2026-09-09.
