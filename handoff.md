# Handoff

**Read this file first, every session.** It is the running log of what happened and when.

For *what is true about the system now*, read [`docs/START_HERE.md`](docs/START_HERE.md) (humans)
or [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) (AI). This file answers a different question — it
is history, not reference.

> **Append only. Never rewrite or condense past entries.** Their value is that they record what
> was true at the time. If paths change later, note the move in `docs/START_HERE.md` rather than
> editing history here.

---

## 0. Session operating rules

1. **Read this file first**, then only the vault documents your task actually needs. Do not read
   the whole vault.
2. **One task per session.** This is a small codebase with no tests and no CI — a session that
   touches three unrelated things cannot be verified or reverted cleanly.
3. **Branch per change.** The convention in this repository's history is
   `feature/<name>`, `feat/<name>`, `refactor/<name>`, or `fix/<name>` → PR → `dev` → PR →
   `main`. Do not commit directly to `main`.
4. **Verify before claiming done.** There is no test suite. `npm run build` in both apps is the
   only automated check; anything user-facing needs a manual pass in the browser.
5. **A real decision needs an ADR before the code**, not after —
   [`docs/04-decisions/`](docs/04-decisions/_Decisions_Index.md).
6. **End every session with the dual write:**
   - append an entry to this file, **and**
   - update `docs/00-core/` in place if system state changed, adding a `TODO-NNN` row in
     `docs/01-planning/TODO.md` for traceability.

   Doing only the first is the failure mode these rules exist to prevent: it leaves the vault
   silently wrong while looking maintained.
7. **Never invent a value.** If you cannot verify a number, path, or key format in the code,
   write `TODO` and file a `TODO-NNN`.

---

## 1. What the project is

The **GDGOC-UITU Community Platform** — the digital home of Google Developer Groups on Campus at
UIT University, Karachi. Members discover and register for events, pay for ticketed ones,
discuss on a forum, and organisers run the chapter from an admin dashboard with a built-in CMS.

It began as a Database Systems course project under Miss Laiba Mughal, and was built well past
coursework scope: real RBAC, Stripe payments, audit logging, notifications, and a normalised
9-schema PostgreSQL design.

Built by **Umar Sani** and **Umair Jan**.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 18, TypeScript, Tailwind 3, GSAP + Lenis, Radix/shadcn |
| Backend | Express, TypeScript, Zod v4, `pg` |
| Database | PostgreSQL on Supabase — 9 schemas, 31 tables, 4 stored procedures, 25 triggers |
| Auth | Supabase Auth (email/password + Google OAuth), verified server-side per request |
| Payments | Stripe hosted checkout + webhook |
| Media | Cloudinary · **Email** Nodemailer over Brevo SMTP |
| Hosting | Frontend on Vercel; backend host **unverified** — see `docs/00-core/Deployment.md` |

Monorepo with **no root `package.json`** — `frontend/` and `backend/` install and build
independently.

---

## 3. Working conventions

- **Response envelope:** `{ data, error }` everywhere; `error` is always a plain string.
  Paginated lists add `total`, `page`, `limit` as *siblings* of `data`.
- **Roles are a flat allow-list.** `requireRole('admin')` does **not** admit `super_admin`.
  Every call site enumerates every acceptable role.
- **Validation** is Zod on `req.body` only — query and route params are never validated.
- **SQL** is raw and parameterised (`$1`, `$2`). No ORM. Never interpolate user values.
- **Two paths to the database:** simple public reads go direct via the Supabase SDK; anything
  privileged or transactional goes through Express. See `docs/04-decisions/ADR-001-*`.
- **"Phase" is ambiguous here.** Build phases (git history, finished) vs. doc phases
  (`docs/01-planning/Phases.md`). Always qualify which.

---

## 4. Testing / gotchas

**There are no automated tests and no CI.** `npm run build` (which runs `tsc --strict`) is the
only automated check in the project.

Gotchas that have cost time:

- `FRONTEND_URL` is the **only** allowed CORS origin. A mismatch presents as every API call
  failing in the browser.
- Stripe webhooks need `stripe listen --forward-to localhost:4000/api/payments/webhook` locally.
  Without it, checkout completes but **no registration is created** — settlement happens only
  in the webhook.
- `express.raw()` must stay mounted on the webhook path **before** `express.json()`, or
  signature verification breaks.
- `shared/types.ts` exists **twice** (root and `frontend/shared/`). Nothing syncs them.
- Local development appears to share the **production** database — treat schema experiments
  accordingly.
- `requireAuth` calls Supabase on every request, so Supabase latency is your API's latency.

---

## 5. Build status

**Shipped and working:** public site (landing, about, contact, events, forum, public profiles),
auth with Google OAuth, event registration, Stripe checkout, member dashboard, admin panel with
full CMS, in-app + email notifications, audit logging.

**75 commits, 2026-03-07 → 2026-06-17**, across `main` / `dev` / feature branches, 23 PRs.

**Known serious defects** — full detail in `docs/01-planning/bugs.md`:

| ID | Summary |
|---|---|
| `BUG-005` | Audit partitions cover 2026 only — from 2027-01-01 most writes begin failing |
| `BUG-001` | Prices stored as PKR, charged to Stripe as USD, unconverted |
| `BUG-010` | Webhook has no replay protection and returns 200 on settlement failure |
| `BUG-003` / `BUG-004` | Audit log has no actor, and RLS is inert — same root cause |

---

## 6. Build Phases 2–8 — platform delivery (2026-03-11 → 2026-03-19)

The original build, delivered as numbered phases visible in the git history.

- **Phase 2** (2026-03-12) — Events: 4 screens plus the backend fully set up.
- **Phase 3** (2026-03-12) — Payment screens; the missing failed-payment page followed the
  same day.
- **Phase 4** (2026-03-13) — Member portal, 4 screens.
- **Phase 5** (2026-03-13) — Forum: 4 screens with the backend working.
- **Phase 6** (2026-03-13) — Admin panel, 6 screens, fully functional.
- **Phase 7** (2026-03-15) — CMS and social screens.
- **Phase 8** (2026-03-16) — 6 public screens.
- (2026-03-18) — Editor dashboard and role-based dashboard access.
- (2026-03-19) — Team hierarchy (lead, co-lead, members, mentors); about/teams/sponsors merged.

Earlier, 2026-03-07 → 2026-03-11: repository setup, auth screens, and the fix for the
"email already registered" flow.

---

## 7. UI redesign and hardening (2026-03-27 → 2026-06-17)

- **2026-03-27 → 2026-05-13** — Landing page redesign across several passes: hero, who-we-are,
  teams, upcoming events, about-me and featured-past-events sections.
- **2026-05-28 → 2026-06-12** — Forum UI improvements; about page rebuilt; OUR MISSION section
  redesigned.
- **2026-06-14** — *Performance*: implemented the fixes identified in
  `ProjectDocs/Performance.md`.
- **2026-06-14** — *Security*: worked through `ProjectDocs/Security.md` and hardened the
  application. **This is when helmet and rate limiting were actually applied** — that document
  still lists them as missing, which is why parts of it are now stale.
- **2026-06-14** — Landing and about pages redesigned; in-app and email notifications shipped
  with user-configurable preferences.
- **2026-06-16** — Fixed `backend` `tsc` `rootDir` so `dist/index.js` matches the `start`
  script; README added; logo fixes on member and admin dashboards.
- **2026-06-17** — Member dashboard layout reworked; public user profiles added; redundant
  `/profile` pages removed; custom events and forum pages added to the member dashboard.
- **2026-06-17** — `chore: vendor shared types into frontend for standalone Vercel build`
  (`72b3eec`) — Vercel's frontend-rooted build cannot reach `../shared`, so `shared/types.ts`
  was copied into `frontend/shared/` and the `@shared` alias repointed. Last commit before the
  project went quiet.

---

## 8. Documentation vault established (2026-09-09)

Set up the Obsidian documentation vault at [`docs/`](docs/START_HERE.md) and this handoff log.

**What was done.** Surveyed the codebase directly — backend routes and middleware, frontend
route groups and auth, and the full `GDGOC_UITU_schema.sql` — then wrote the vault from what the
code actually says rather than from the frozen course specifications. Built:

- Entry points: `START_HERE.md` (human) and `AI_CONTEXT.md` (AI routing).
- `00-core/` — nine current-state documents, all verified against the code.
- One full PSP feature folder: event registration and payment (7 files).
- Five ADRs — three written in full, two honest stubs for decisions that are live but were never
  written up.
- `01-planning/` with a 45-row `TODO-NNN` ledger and 11 `BUG-NNN` entries.
- `03-research/`, `06-ideas/`, `02-prompts/`, `07-build-docs/`, `08-ops/` with four runbooks.

**Notable findings from the survey**, none of which were previously written down:

- `BUG-005` — `audit.logs` has partitions for 2026 only and no `DEFAULT` partition. Because ten
  audit triggers fire `AFTER` inside the writing transaction, from 2027-01-01 this will abort
  writes to users, events, registrations, transactions, threads and replies. Highest-severity
  item found.
- `BUG-001` — paid registrations are charged in USD using the PKR figure, unconverted.
- `BUG-010` — the Stripe webhook returns 200 on database failure so Stripe will not retry,
  meaning a paid registration can be silently lost.
- `BUG-003` / `BUG-004` — one root cause: the backend never sets `app.current_user_id`, so the
  audit log records no actor and every RLS policy evaluates against NULL.
- `ProjectDocs/Security.md` is partly stale — its ❌ entries for helmet and rate limiting were
  fixed on 2026-06-14.
- `ProjectDocs/` is excluded via `.git/info/exclude`, a **local-only** ignore file, so a
  teammate cloning this repository receives none of the course documents (`TODO-045`).

**State of the vault.** Partially populated by design: one of seven shipped features is
documented in depth, two ADRs are stubs, and several `00-core` sections are explicitly marked
`TODO`. Every gap has a numbered row rather than being silently omitted.

**Suggested next session.** Add the `DEFAULT` audit partition — it is one SQL statement and
removes a scheduled outage. Then decide the currency question blocking `BUG-001`, reading the
unmerged `feat/payfast_integration` branch first.

---

## 9. First production deploy — backend to Railway, frontend to Vercel (2026-09-09)

Closed `TODO-036`: the backend host, unverified as of section 8, is now Railway. Deployed from
the same GitHub repo with Root Directory set to `backend`; frontend deploy to Vercel (Root
Directory `frontend`) was already partly done and got finished the same session.

**Two production defects found and fixed** — not from reading the code, but from watching the
first deploy fail:

- **`BUG-012` (new, fixed)** — `db/client.ts` used `ssl: { rejectUnauthorized: true }` in
  production. Supabase's pooler certificate chain doesn't validate cleanly against Node's
  default CA store, so this rejected *every* database connection —
  `GET /health` returned `db: unreachable` on every request. Changed to
  `rejectUnauthorized: false` (still TLS-encrypted, only CA-chain validation skipped, matching
  Supabase's own connection guidance). `TODO-046` filed for the stricter fix — pin Supabase's CA
  cert instead of a blanket disable.
- **`BUG-008` (fixed)** — `trust proxy` was never set, exactly as predicted when the bug was
  written down in section 8. Railway sits one reverse-proxy hop in front of the app, so
  `index.ts` now sets `app.set('trust proxy', 1)`.

Also fixed: a Vercel 404 on first deploy, caused by Root Directory not being set to `frontend`
(same monorepo issue as Railway, different dashboard).

**Doc updates in the same session** (the dual-write this file's own rules call for):
`docs/00-core/Deployment.md` rewritten to state the backend host as fact instead of "unverified"
and to record both fixes; `TODO-036` marked `done`; `TODO-046` and `TODO-047` (no in-repo
Railway deploy manifest) filed; `BUG-008` and `BUG-012` marked `fixed` in
[`docs/01-planning/bugs.md`](docs/01-planning/bugs.md) with resolution notes.

**Unrelated small change, same session.** Forum page ([forum/page.tsx](frontend/app/(public)/forum/page.tsx)) —
the Pinned Posts / Forum Rules sidebar is now `sticky` on large screens instead of scrolling out
of view immediately.

**Suggested next session.** File a `railway.json` (or equivalent) to close `TODO-047` — right
now a fresh Railway environment can only be reconstructed by reading this vault and re-clicking
through the dashboard by hand.
