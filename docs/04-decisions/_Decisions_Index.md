# Decisions Index

Architecture Decision Records. One decision per file, written **before** implementing.

> [!important] "Template only" ≠ "undecided"
> The two status columns below are **independent**. A decision can be running in production and
> still be an unfilled template — that means nobody wrote it down, not that nobody decided.
> Every stub carries a banner naming what was actually chosen, so the decision is never lost
> even when the reasoning is.

| ADR | Topic | Written up? | Decision live? |
|---|---|---|---|
| [[ADR-001-Split-Data-Access-Path\|ADR-001]] | Two paths to the database: Supabase SDK for reads, Express for writes | ✅ | ✅ |
| [[ADR-002-Supabase-Auth-Delegation\|ADR-002]] | Delegate JWT verification to Supabase rather than signing our own | ✅ | ✅ |
| [[ADR-003-Business-Logic-In-Database\|ADR-003]] | Seat allocation and payment settlement live in stored procedures | ✅ | ✅ |
| [[ADR-004-Stripe-Hosted-Checkout\|ADR-004]] | Stripe hosted checkout rather than an embedded card form | ⚠️ stub | ✅ |
| [[ADR-005-Vendored-Shared-Types\|ADR-005]] | Vendor `shared/types.ts` into the frontend for Vercel builds | ⚠️ stub | ✅ |

Backfilling ADR-004 and ADR-005 is `TODO-039`.

## Decisions made but never recorded as ADRs

These shaped the system and have no file at all. Listed here so their absence is visible rather
than silent — each would need archaeology to reconstruct, which is precisely the cost of not
writing an ADR at the time.

| Decision | Evidence |
|---|---|
| No ORM — raw parameterised SQL via `pg` | Consistent across every route file |
| No test framework | No test infrastructure anywhere |
| No API versioning | No `/v1` prefix or version header |
| Client-side-only route protection (no `middleware.ts`) | `(member)` / `(admin)` layouts |
| React Context instead of a data-fetching library | `AuthContext`, `MemberDataContext` |
| Notification delivery by polling rather than WebSocket | `NotificationBell` polls |
| Tailwind + shadcn/Radix with a hand-built "brutalist" idiom | Consistent across components |

Writing these retroactively is optional and low priority — a retroactive ADR records a
reconstruction, not a decision. Prefer writing new ones on time.

## Maintenance rule

Add the ADR **the moment a decision is made**, before implementation — and add its row to this
table in the same commit. If you find yourself writing an ADR after shipping, note the date gap
honestly in the `Date` field rather than backdating it.
