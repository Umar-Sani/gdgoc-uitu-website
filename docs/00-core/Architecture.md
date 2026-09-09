# Architecture

> Current state, verified against the code on 2026-09-09. See [[../START_HERE|START_HERE]] for
> the precedence rule when documents disagree.

## Purpose

Describe the shape of the GDGOC-UITU Community Platform: what the pieces are, how a request
moves through them, and which decisions constrain the design. This is the whole system,
shallow. For one feature in depth, see [[../05-features/_Features_Index|05-features]].

## System Overview

A two-app monorepo backed by managed Supabase PostgreSQL.

```text
gdgoc-uitu-website/
├─ frontend/    Next.js App Router, port 3000   → deployed to Vercel
├─ backend/     Express API, port 4000          → hosting unverified (see Deployment)
├─ shared/      types.ts, shared TypeScript types
└─ docs/        this vault
```

There is **no root `package.json`** — the two apps are installed and built independently.
This is a directory-level monorepo, not a workspaces/turborepo setup.

> [!warning] `shared/types.ts` exists twice
> Commit `72b3eec` (2026-06-17) copied `shared/types.ts` into `frontend/shared/types.ts` and
> repointed the `@shared/*` alias to `./shared/*`, because Vercel's frontend-rooted build
> cannot reach `../shared`. The two files are byte-identical apart from a trailing newline
> **today**, and nothing keeps them in sync. Editing one and not the other is a live drift
> risk — see `TODO-001`.

The backend does **not** import `shared/` at all; it defines its shapes inline.

## Technology Stack

| Layer | Technology | Version (declared) |
|---|---|---|
| Frontend framework | Next.js (App Router) | `^16.1.6` |
| UI runtime | React / React DOM | `^18` |
| Styling | Tailwind CSS | `^3.4.1` |
| Animation | GSAP + `@gsap/react`, Lenis | `^3.15.0`, `^2.1.2`, `^1.3.21` |
| UI primitives | `radix-ui` (unified package), shadcn, lucide-react | `^1.4.3` |
| Backend framework | Express | see `backend/package.json` |
| Language | TypeScript (both apps, `strict: true`) | `^5` |
| Validation | Zod (v4 APIs) | `^4.4.3` |
| Database | PostgreSQL on Supabase, accessed via `pg` | — |
| Auth | Supabase Auth (email/password + Google OAuth) | `@supabase/supabase-js ^2.98.0` |
| Payments | Stripe hosted checkout | SDK `^14.0.0`, API `2023-10-16` |
| Media | Cloudinary | — |
| Email | Nodemailer over Brevo SMTP relay | — |

Declared but never imported: `webgl-fluid` (frontend); `jsonwebtoken`, `bcryptjs`,
`express-validator` (backend — JWT verification is delegated to Supabase, so these are dead
dependencies). See `TODO-002`.

## Component Diagram

```text
                    ┌──────────────────────────────┐
   Browser ────────▶│  Next.js (Vercel)            │
                    │  App Router, client-side auth │
                    └───────┬──────────────┬────────┘
                            │              │
        simple reads +      │              │  complex writes
        auth (direct SDK)   │              │  (Bearer token)
                            ▼              ▼
                 ┌────────────────┐   ┌─────────────────────┐
                 │ Supabase Auth  │   │ Express API :4000   │
                 │ + PostgREST    │   │ helmet, cors, rate  │
                 └────────┬───────┘   │ limit, zod, pg pool │
                          │           └──────┬──────────────┘
                          │                  │
                          ▼                  ▼
                 ┌───────────────────────────────────────┐
                 │ Supabase PostgreSQL                    │
                 │ 9 schemas · 31 tables · 4 procedures   │
                 │ triggers · RLS · partitioned audit log │
                 └───────────────────────────────────────┘
                                    ▲
                Stripe ─────────────┘  webhook → /api/payments/webhook
                Cloudinary (uploads) · Brevo SMTP (email)
```

## Request Lifecycle

There are **two** paths to the database, and choosing correctly matters.

| Operation | Path |
|---|---|
| Simple reads (event list, public pages) | Next.js → `@supabase/supabase-js` → PostgreSQL |
| Auth (login, register, session) | Next.js → Supabase Auth |
| Complex writes (registration, payment, upload) | Next.js → Express → `pg` → PostgreSQL |

Anything touching a stored procedure, a payment, or a file upload goes through Express so the
logic stays server-side and auditable.

**A write request through Express, in order** (`backend/src/index.ts`):

1. `helmet()` — CSP and COEP disabled; this is an API server, CSP is Next.js's job.
2. `cors()` — a single allowed origin, `FRONTEND_URL`, with credentials.
3. Global rate limit — 300 requests / 15 min / IP.
4. `express.raw()` mounted on `/api/payments/webhook` **before** the JSON parser, so Stripe
   signature verification receives an unparsed body.
5. `express.json({ limit: '50kb' })` and `urlencoded` at the same cap.
6. Router dispatch. `/api/social` and `/api/upload` additionally get `writeLimiter`
   (20 req/min/IP).
7. Per-route guards: `requireAuth` → `requireUsername` → `requireRole(...)` → `validate(schema)`.
8. Handler runs raw parameterised SQL, or `CALL`s a stored procedure.
9. Response as `{ data, error }`. See [[ErrorHandling]].

`requireAuth` calls `supabase.auth.getUser(token)` — a **network round-trip to Supabase on
every authenticated request**, and it constructs a new Supabase admin client per request
rather than memoising one. See `TODO-003`.

## Components

**Frontend** (`frontend/app/`) — four App Router route groups:

| Group | Gating | Routes |
|---|---|---|
| `(public)` | none | `/`, `/about`, `/contact`, `/events`, `/events/[id]` (+ checkout, payment-success, payment-failed, registered), `/forum` (+ `/new`, `/search`, `/[id]`), `/u/[username]` |
| `(auth)` | none | `/login`, `/register`, `/register/success`, `/verify`, `/forgot-password`, `/reset-password`, `/complete-profile` |
| `(member)` | redirects to `/login` if no user, `/complete-profile` if no username | `/dashboard` (+ events, forums, registrations, tickets), `/settings` |
| `(admin)` | redirects unless role is editor/admin/super_admin | `/admin/dashboard`, `/admin/events` (+new, edit), `/admin/users`, `/admin/payments`, `/admin/audit`, `/admin/cms` (+6 sections) |

Plus `/auth/callback` outside all groups, handling the OAuth code exchange.

> [!warning] All route protection is client-side
> There is **no `middleware.ts`**. Gating happens in layout components after hydration, so a
> protected page's HTML is served to anyone who requests it. The data behind it is still
> protected by the API's `requireAuth`/`requireRole`, so this is an information-architecture
> weakness rather than a data breach. See [[Security]] and `TODO-004`.

State is React Context only — `AuthContext` (app-wide) and `MemberDataContext` (member area,
fetches events and threads once per session). There is no React Query/SWR/Zustand, and **no
central API client**: `process.env.NEXT_PUBLIC_API_URL` is re-declared in 38 files and
`Authorization` headers are hand-written in 27. See `TODO-005`.

**Backend** (`backend/src/`):

```text
routes/       events, forum, payments, users, admin, cms, social, upload, notifications
middleware/   auth.ts — requireAuth, requireUsername, requireRole
lib/          validate.ts (all Zod schemas), mailer.ts, cloudinary.ts, notifications.ts
db/           client.ts — pg Pool (max 20, 30s idle, 5s acquire)
```

**Database** — 9 schemas, 31 base tables plus 12 audit partitions. Business logic partly lives
in the database: 4 stored procedures, 25 triggers, 5 views and 1 materialized view. See
[[Database]].

## Architectural Decisions

| Decision | Where |
|---|---|
| Split reads between Supabase SDK and Express | [[../04-decisions/ADR-001-Split-Data-Access-Path\|ADR-001]] |
| Delegate JWT verification to Supabase rather than signing our own | [[../04-decisions/ADR-002-Supabase-Auth-Delegation\|ADR-002]] |
| Put seat allocation and payment settlement in stored procedures | [[../04-decisions/ADR-003-Business-Logic-In-Database\|ADR-003]] |
| Use Stripe hosted checkout rather than an embedded card form | [[../04-decisions/ADR-004-Stripe-Hosted-Checkout\|ADR-004]] |
| Vendor `shared/types.ts` into the frontend for Vercel | [[../04-decisions/ADR-005-Vendored-Shared-Types\|ADR-005]] |
