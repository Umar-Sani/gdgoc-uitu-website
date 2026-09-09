# Deferred and known gaps

**Status:** Raw
**Captured:** 2026-09-09

## The idea

A collecting note for everything the codebase and git history show was **consciously deferred**
during the build — capabilities that were designed, half-built, or explicitly noted in code
comments, and then left. Each is a candidate to promote, park, or drop, and none is committed to.

This exists so deferred work is visible without being mistaken for planned work. Defects go to
[[../01-planning/bugs|bugs]]; work someone intends to do goes to [[../01-planning/TODO|TODO]].

## What problem it would solve

Deferred capabilities currently live only as absences — an unused enum value, an unmerged
branch, a column nothing writes. Someone reading the schema will reasonably assume refunds work,
because `refunded` is right there in the enum. Naming these keeps the next reader from inferring
capability from vocabulary.

## Why not now

None of these blocks anything today. The project reached a working, demonstrated state in June
2026 and went quiet; these were the things traded away to get there, and most were the right
trade.

## What would make this worth doing

Each row below carries its own trigger. In general: real users depending on the chapter platform
for money or attendance, rather than it serving as coursework plus a live demo.

## The deferred list

### From the schema — vocabulary without implementation

| Deferred | Evidence | Trigger to revisit |
|---|---|---|
| **Refunds** | `transaction_status_enum` has `refunded`; `transactions.refunded_at` exists; `process_payment` never writes either, and `'refunded'` maps a registration to `failed` | The first attendee who asks for money back |
| **Forum reports and moderation queue** | `forum.reports` and `forum.moderation_log` tables and indexes exist; `moderate_forum_content` exists but is never called and cannot run as written (`BUG-002`) | Any actual abuse on the forum |
| **`viewer` role** | Seeded in `users.roles`, given 2 permissions, explicitly filtered out of `GET /api/admin/roles`, referenced by no guard | Wanting read-only access for a faculty advisor |
| **Permission-level authorization** | `users.permissions`, `role_permissions` and `v_user_profile` model 14 fine-grained permissions; every guard checks the coarse `role_name` instead | Roles no longer partitioning cleanly |
| **`social.posts` scheduling** | `post_status_enum` includes `scheduled`, with an index on `scheduled_at WHERE status='scheduled'`; nothing publishes on a schedule | Actually running the content calendar |
| **`attendance_confirmed`** | Column exists on `registrations`, defaults `FALSE`, nothing sets it | Wanting attendance data after an event |
| **`thread_summaries`** | Table exists, one row per thread, nothing writes it — presumably intended for AI summarisation | Threads long enough to need summarising |
| **`gallery`, `contact_submissions`** | CMS tables with partial surfaces | — |

### From the code — started, then set aside

| Deferred | Evidence | Trigger to revisit |
|---|---|---|
| **PayFast integration** | Unmerged branch `feat/payfast_integration`; `payments.gateway_enum` already allows `manual` and `simulated` | `BUG-001` forcing a real answer to PKR payments — this may be the actual fix |
| **Local JWT verification** | `jsonwebtoken` and `bcryptjs` are dependencies but never imported; auth is fully delegated | Auth latency becoming measurable — see [[../04-decisions/ADR-002-Supabase-Auth-Delegation\|ADR-002]] |
| **`webgl-fluid`** | Declared in `frontend/package.json`, imported nowhere | Probably never; a candidate to drop (`TODO-002`) |
| **Sonner toasts** | `components/ui/sonner.tsx` is wired up; no `<Toaster />` is mounted and no `toast()` is called anywhere | Wanting consistent user feedback instead of per-page ad-hoc error handling |
| **Stripe.js on the client** | `@stripe/stripe-js` installed and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set; neither is used, because checkout is hosted | Moving to embedded Stripe Elements |
| **`/dashboard/tickets` navigation** | The page exists and works, but is absent from `MemberSidebar`'s nav items — reachable only via the payment flow or a direct URL | Anyone reporting they cannot find their tickets |

### Infrastructure never stood up

| Deferred | Evidence | Trigger to revisit |
|---|---|---|
| **`pg_cron` jobs** | Extension installed; matview refresh schedule written in a SQL comment, never executed; audit partitions unautomated | **Already urgent** — `BUG-005` makes this a 2027-01-01 deadline |
| **Caching layer** | No Redis, no HTTP cache headers, no `revalidate` strategy | Database load becoming visible |
| **Real-time notifications** | Delivery is client polling; no WebSocket or push | Polling cost or latency complaints |
| **CI pipeline** | No `.github/`, nothing runs on a PR | `TODO-034` — the cheapest first win in the project |
| **Staging environment** | None; local appears to share the production database (`TODO-035`) | Before any risky schema change |

## Open questions

- Is PayFast the intended resolution to `BUG-001`, or is repricing in USD? This is a product
  decision and blocks a real defect.
- Was the permission table always aspirational, or is role-only checking a deliberate
  simplification worth an ADR?
- Does the chapter still intend to run this platform, or is it now a portfolio artefact? The
  answer changes the priority of nearly everything above.

## Related

- [[../01-planning/TODO|TODO]] — work actually intended
- [[../01-planning/bugs|bugs]] — defects, not deferrals
- [[../00-core/Deployment|Deployment]] — designed vs. actually provisioned
