# GDGOC-UITU Community Platform

The official community platform for **Google Developer Groups on Campus (GDGoC) — UIT University, Karachi**.

GDGoC-UITU brings together students who want to learn, build, and grow with Google technologies — through workshops, hackathons, study jams, and tech talks. This platform is the chapter's digital home: a place to discover and register for events, connect with other members on a developer forum, and for organizers to run the chapter's operations from one dashboard.

It started as a Database Systems course project, but was built and engineered to a production standard — a full-stack monorepo with a real relational schema, role-based access control, payments, and email/in-app notifications, rather than a toy assignment.

---

## ✨ Features

**Public site**
- Animated landing page, about page, contact form, sponsor showcase
- Event listings with registration, Stripe-powered checkout, and ticketing
- Developer forum — threads, replies, upvotes, markdown support, moderation
- Newsletter subscription

**Member area**
- Email/password and Google OAuth authentication
- Profile management (avatar, bio, skill tags), event registrations & tickets
- Configurable in-app and email notification preferences

**Admin dashboard**
- Role-based access control (member, editor, admin, super admin)
- Event management with automatic member notifications on publish
- User management — role changes, account enable/disable
- A built-in CMS for homepage content, team, sponsors, testimonials, and featured events
- Payment transaction reporting and an audit log

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS 3 |
| Animation | GSAP + `@gsap/react`, Lenis smooth scroll |
| UI | `radix-ui` (unified package), shadcn, lucide-react |
| Backend | Express, TypeScript, Zod v4 validation |
| Database | PostgreSQL 15 on Supabase, accessed with `pg` (no ORM) |
| Auth | Supabase Auth — email/password + Google OAuth |
| Payments | Stripe hosted checkout + webhook |
| Media storage | Cloudinary |
| Email | Nodemailer over Brevo SMTP |

Both apps are TypeScript with `strict: true`.

---

## 🏗️ Architecture

Two independently deployable apps and a shared types file:

```
Browser
   │
   ├── simple public reads ──────────► Supabase JS SDK ──┐
   ├── auth (login/register/session) ► Supabase Auth ────┤
   │                                                     ├──► PostgreSQL
   └── complex writes ──────────────► Express API :4000 ─┘
       (registration, payments, uploads)   │
                                           ├── Stripe (checkout + webhook)
                                           ├── Cloudinary (image uploads)
                                           └── Brevo SMTP (email)
```

**There are two paths to the database, and picking the right one matters:**

| Operation | Path |
|---|---|
| Simple public reads (event list, public pages) | Next.js → Supabase SDK → PostgreSQL |
| Auth (login, register, session) | Next.js → Supabase Auth |
| Anything privileged or transactional | Next.js → Express → `pg` → PostgreSQL |

The rule: **if it's a plain `SELECT`, use the Supabase SDK. If it involves a stored procedure, a payment, or a file upload, go through Express** — that's where the secrets live and where the transactions are.

A meaningful amount of business logic lives in the **database**: 4 stored procedures, 25 triggers, 9 schemas, 31 tables. Event registration and payment settlement run inside `SERIALIZABLE` transactions calling stored procedures, because those are the two operations that must never race.

Full detail: [`docs/00-core/Architecture.md`](./docs/00-core/Architecture.md) and [`docs/00-core/Database.md`](./docs/00-core/Database.md).

---

## 📂 Project Structure

```
gdgoc-uitu-website/
├── frontend/         Next.js app (App Router)  → port 3000
│   ├── app/
│   │   ├── (public)/     Landing, events, forum, about, contact, public profiles
│   │   ├── (auth)/       Login, register, password reset, complete-profile
│   │   ├── (member)/     Dashboard, registrations, tickets, settings
│   │   ├── (admin)/      Admin dashboard, CMS, user/event/payment management
│   │   └── auth/callback OAuth code exchange
│   ├── components/       ui/ (shadcn + bespoke), member/
│   ├── context/          AuthContext, MemberDataContext
│   └── shared/           vendored copy of ../shared/types.ts  ⚠️ see Gotchas
├── backend/          Express API                → port 4000
│   └── src/
│       ├── routes/       events, forum, payments, users, admin, cms, social, upload, notifications
│       ├── middleware/   auth.ts — requireAuth, requireUsername, requireRole
│       ├── lib/          validate.ts (all Zod schemas), mailer, cloudinary, notifications
│       └── db/           client.ts — pg connection pool
├── shared/           types.ts shared between both apps
├── docs/             Obsidian documentation vault
├── ProjectDocs/      Course specs + the authoritative SQL schema  ⚠️ not in git
└── handoff.md        Append-only session log
```

> **Note:** there is **no root `package.json`.** This is a directory-level monorepo — each app installs and builds independently.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** — developed on v22. No version is pinned in `package.json`, so anything modern should work.
- **Git**
- Access to the project's **Supabase**, **Stripe**, **Cloudinary**, and **Brevo** credentials — ask Umar or Umair. Never take them from a commit.
- *(Optional but recommended)* the **[Stripe CLI](https://stripe.com/docs/stripe-cli)**, needed to test payments locally.

### 1. Clone and install

There's no root package, so install each app separately:

```bash
git clone https://github.com/Umar-Sani/gdgoc-uitu-website.git
cd gdgoc-uitu-website

cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment variables

> ⚠️ **There is no `.env.example` in either app.** The lists below are the complete set, reconstructed by reading the code. Get the actual values from a teammate.

Create **`backend/.env`**:

```bash
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database — Supabase connection string
DATABASE_URL=postgresql://...

# Supabase (server-side token verification)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...          # secret — backend only, never expose

# Dev auth bypass (see Gotchas). Leave unset or false unless you need it.
ALLOW_MOCK_AUTH=false

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen`, see step 4

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email (Brevo SMTP relay)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=...
BREVO_SMTP_PASS=...
BREVO_FROM_NAME=GDGOC-UITU
BREVO_FROM_EMAIL=noreply@gdgoc-uitu.com
```

Create **`frontend/.env.local`**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # the anon key, NOT the service role key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Both files are gitignored. **Never commit them.**

### 3. Run both apps

Two terminals — there's no single command that starts both:

```bash
# Terminal 1
cd backend && npm run dev      # nodemon + ts-node → http://localhost:4000

# Terminal 2
cd frontend && npm run dev     # next dev → http://localhost:3000
```

Verify the backend is healthy:

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"connected","timestamp":"..."}
```

If you get `"db":"unreachable"`, your `DATABASE_URL` is wrong. Note the server **still starts** in that case — the startup DB check logs a failure but doesn't exit.

### 4. Stripe webhooks (only if you're touching payments)

Stripe can't reach `localhost`, so you must forward events:

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copy the `whsec_...` secret it prints into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

**Without this, checkout will appear to succeed but no registration is ever created** — settlement only happens in the webhook.

### 5. Database (usually not needed)

The Supabase project is already provisioned. You only need this if you're standing up a fresh database — see [`docs/08-ops/Database_Setup.md`](./docs/08-ops/Database_Setup.md). The authoritative schema is `ProjectDocs/GDGOC_UITU_schema.sql`.

### Building

```bash
cd backend  && npm run build   # tsc → dist/,  then npm start
cd frontend && npm run build   # next build,   then npm start
```

`npm run build` runs `tsc` in strict mode and is **the only automated check this project has.** Run it before every PR.

---

## ⚠️ Need to know before you start

Read this section. Every item here has cost someone time.

### There are no tests and no CI

Zero automated tests, no test framework installed, no GitHub Actions. Nothing verifies your change before it merges. `npm run build` (which runs `tsc --strict`) is the only automated check — everything else is manual browser testing. See [`docs/00-core/Testing_Strategy.md`](./docs/00-core/Testing_Strategy.md).

### Local development shares the production database

Nothing in the repo provisions a separate dev database. **Treat every local schema experiment as production-affecting** until that changes. Be especially careful with `DELETE` and `ALTER`.

### `FRONTEND_URL` is the only allowed CORS origin

If `backend/.env`'s `FRONTEND_URL` doesn't exactly match the origin your browser is on, **every API call fails with a CORS error.** This is the single most common setup problem.

### `shared/types.ts` exists twice

There's `shared/types.ts` at the root **and** `frontend/shared/types.ts`. The frontend uses its own copy — Vercel builds from the `frontend/` directory and can't reach `../shared`.

**Nothing keeps them in sync.** If you edit shared types, edit both:

```bash
diff shared/types.ts frontend/shared/types.ts   # should print nothing
```

### Roles are a flat allow-list, not a hierarchy

`requireRole('admin')` does **not** admit `super_admin`. Every guard enumerates every acceptable role explicitly:

```ts
requireRole('admin', 'super_admin')   // correct
requireRole('admin')                  // super_admin will be REJECTED
```

Adding a new role means auditing every guard in the codebase.

### The API response envelope is fixed

Everything returns `{ data, error }` — `error` is always a plain **string**, never an object:

```jsonc
{ "data": {...}, "error": null }        // success
{ "data": null, "error": "message" }    // failure
```

Paginated lists add `total`, `page`, `limit` as **siblings** of `data`, not nested inside it.

### Validation only covers request bodies

Zod runs on `req.body` only. **Query strings and route params are never validated** anywhere. Also, validation failures return only the *first* Zod issue's message and discard the field path.

### Route protection is client-side only

There's no `middleware.ts`. The `(member)` and `(admin)` layouts redirect **after hydration**, so protected pages' HTML is served to anyone. Data is still protected by the API's guards — but don't mistake the frontend gate for a security control.

### Auth calls Supabase on every request

`requireAuth` makes a network round-trip to Supabase for **every** authenticated request. If Supabase is slow, your API is slow. There's no caching and no circuit breaker.

### There's a dev auth bypass — know it exists

When `NODE_ENV !== 'production'` **and** `ALLOW_MOCK_AUTH=true`, the literal token `mock-token` authenticates as a hardcoded admin. The frontend has a matching switch in `frontend/lib/mockAuth.ts` (`MOCK_ENABLED`, a hardcoded constant, currently `false`). Both must be on. Never set `ALLOW_MOCK_AUTH=true` in production.

### "Phase" is ambiguous in this repo

**Build phases** are the delivery milestones in the git history (`Phase 5 Completed: Added Forum Screens`) — finished in June 2026. **Doc phases** are in [`docs/01-planning/Phases.md`](./docs/01-planning/Phases.md) and are unrelated. Always say "build Phase 5" or "doc Phase 5".

### Known serious bugs

Four worth knowing before you touch related code — full detail in [`docs/01-planning/bugs.md`](./docs/01-planning/bugs.md):

| ID | What |
|---|---|
| `BUG-005` | `audit.logs` has partitions for **2026 only**, no `DEFAULT` partition. From 2027-01-01 this will start aborting writes to ten core tables |
| `BUG-001` | Ticket prices are stored as PKR but charged to Stripe as **USD**, unconverted |
| `BUG-010` | The Stripe webhook returns `200` on database failure so Stripe won't retry — a paid registration can be silently lost |
| `BUG-003`/`BUG-004` | The backend never sets `app.current_user_id`, so the audit log has no actor and all RLS policies are inert |

### `ProjectDocs/` isn't in git

It's excluded via `.git/info/exclude` — a **local-only** ignore file that isn't shared by cloning. If you cloned this repo, you don't have the course specs or the SQL schema. Ask a teammate for them.

---

## 🔀 Workflow

```
feature/<name>  →  PR  →  dev  →  PR  →  main
```

Branch naming in history: `feature/<name>`, `feat/<name>`, `refactor/<name>`, `fix/<name>`. Don't commit directly to `main`.

**Before opening a PR:** run `npm run build` in both apps, and manually exercise whatever you changed in the browser.

**When you finish a work session:** append an entry to [`handoff.md`](./handoff.md) and update [`docs/00-core/`](./docs) if you changed how the system works. See the dual-write rule in [`docs/AI_CONTEXT.md`](./docs/AI_CONTEXT.md).

---

## 📚 Documentation

Project documentation lives in [`docs/`](./docs) as an Obsidian vault.

| Where | What |
|---|---|
| [`docs/START_HERE.md`](./docs/START_HERE.md) | Start here if you're a person |
| [`docs/AI_CONTEXT.md`](./docs/AI_CONTEXT.md) | Entry point and task routing for AI agents |
| [`docs/00-core/`](./docs/00-core) | What's true about the system **now** — architecture, database, API, security, deployment |
| [`docs/01-planning/`](./docs/01-planning) | `TODO-NNN` ledger and `BUG-NNN` defects |
| [`docs/04-decisions/`](./docs/04-decisions) | ADRs — why things are the way they are |
| [`docs/08-ops/`](./docs/08-ops) | Runbooks — local dev, database setup, deploy, rollback |
| [`handoff.md`](./handoff.md) | Append-only session log: what happened, and when |

To browse it with backlinks and graph view: install [Obsidian](https://obsidian.md), choose **Open folder as vault**, and select `<repo>/docs` — **not** the repo root. Trust the vault when prompted; only built-in core plugins are enabled, so there's nothing to install.

The files render fine as plain markdown on GitHub too — Obsidian just makes the `[[wikilinks]]` navigable.

---

## 📄 License

Licensed under the [Apache License 2.0](./LICENSE.md).

---

Built by **Umar Sani** & **Umair Jan**.
