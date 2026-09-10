# Deployment

> Verified against the repository on 2026-09-09. This document says **what is deployed**.
> For **how to deploy it**, see [[../08-ops/_Ops_Index|08-ops]].

## Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local | `next dev`, port 3000 | `nodemon ts-node`, port 4000 | Supabase (shared with production) |
| Production | Vercel | Railway | Supabase |

> [!warning] There is no separate development database
> `backend/.env` points at a Supabase project; nothing in the repository establishes a second
> project or a local PostgreSQL for development. Local development therefore appears to run
> against the same database as production. Unverified, and a significant risk if true —
> `TODO-035`.

There is **no staging environment**.

## Deployed topology vs. designed architecture

This is where drift is recorded. Designed in the frozen build docs, but **not actually
provisioned**:

| Designed | Reality |
|---|---|
| A separate development/staging database | Not provisioned |
| `pg_cron` jobs refreshing the trending-topics matview and creating audit partitions | Extension installed; **no job scheduled** — see [[ErrorHandling]] |
| Row Level Security enforcing per-user access | Policies exist but are inert — see [[Security]] `BUG-004` |
| `users.users.password_hash` holding bcrypt hashes | Column exists but is unused; Supabase Auth owns credentials |
| Audit log capturing the acting user | Actor is always NULL — `BUG-003` |
| Forum moderation via `moderate_forum_content` | Procedure never called, and cannot run as written — `BUG-002` |

> [!note] Backend hosting target confirmed — Railway (2026-09-09)
> Deployed from the same GitHub repo, Root Directory set to `backend`, `npm run build` /
> `npm run start`. There is still no `railway.json` or deploy manifest committed to the
> repository — configuration lives entirely in Railway's dashboard, not in-repo — so a fresh
> environment would need to be reconstructed by hand from this document. Verified live via
> `GET /health` returning `{"status":"ok","db":"connected"}`. `TODO-036` closed.
>
> Getting the first deploy green surfaced two real defects, both now fixed — see `BUG-008` and
> `BUG-012` in [[../01-planning/bugs|bugs]]:
> - `trust proxy` was never set, so `express-rate-limit` read Railway's proxy IP instead of the
>   real client's.
> - `db/client.ts` set `ssl: { rejectUnauthorized: true }` in production, which rejects
>   Supabase's pooler certificate chain outright — every query failed with *self-signed
>   certificate in certificate chain*. Now `{ rejectUnauthorized: false }` unconditionally
>   (TLS encryption still applies; only CA-chain validation is skipped) — see `TODO-046` for the
>   stricter alternative (pinning Supabase's CA certificate).

> [!note] Frontend deploy on Vercel — confirmed working (2026-09-09), production URL `https://gdgoc-uitu.vercel.app`
> Deployed from the same GitHub repo, **Root Directory set to `frontend`** in the Vercel
> project settings — this is not committed anywhere (no `vercel.json`), so a fresh Vercel
> project must have this set by hand or the build 404s on every route. That was the first
> failure hit this session.
>
> Two configuration points outside this repository, neither of them code:
> - **`NEXT_PUBLIC_API_URL`** must be the Railway public URL, not `localhost:4000`. Vercel env
>   vars do not inherit from `.env.local` — pasting that file in verbatim carries the localhost
>   value across unless it's edited first.
> - **Supabase → Authentication → URL Configuration → Redirect URLs** must include the
>   production callback paths, or `signInWithOAuth`/`resetPasswordForEmail` redirects are
>   rejected even though the frontend code (`window.location.origin`-based, no hardcoded host)
>   is correct. The three paths the code actually redirects to are `/auth/callback`,
>   `/reset-password`, and `/verify` (the last is Supabase's own confirmation-email link, not a
>   `redirectTo` call in the frontend). Google Cloud Console's OAuth client **Authorized
>   redirect URI** stays pointed at Supabase's own callback
>   (`https://<project-ref>.supabase.co/auth/v1/callback`) and does not change with the
>   frontend domain — only **Authorized JavaScript origins** needs the Vercel domain added.
>
> No `vercel.json` and no deploy manifest is committed, matching Railway's gap — see
> `TODO-048`.

## Production configuration

**Frontend** — 4 public variables, all `NEXT_PUBLIC_*`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Express API base URL — read in 38 files |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Present in `.env.local` but **referenced by no source file**; checkout redirects to a backend-supplied URL instead |

`next.config.mjs` sets `compress: true`, AVIF/WebP image formats, and allows remote images from
`res.cloudinary.com` and `lh3.googleusercontent.com`. No `output` mode, no rewrites, no
redirects.

> [!warning] Production auth also depends on two dashboards this repo doesn't control
> Google OAuth and password-reset links break in production unless, **separately from any
> Vercel env var**, the Supabase project's Authentication → URL Configuration → Redirect URLs
> allow-list includes the deployed domain's `/auth/callback`, `/reset-password`, and `/verify`
> paths. The frontend code builds these from `window.location.origin` and has no hardcoded
> host, so this is never a code fix — it's a dashboard entry that must be added by hand for
> every new deployment domain (including Vercel preview-deploy URLs, which get their own
> unlisted origin and will fail OAuth unless explicitly added or wildcarded).

**Backend** — 18 variables: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ALLOW_MOCK_AUTH`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
three `CLOUDINARY_*`, and six `BREVO_*`.

Two settings must be correct in production:

- `NODE_ENV=production` — disables the mock-auth bypass. It no longer affects database TLS
  validation, which is now `rejectUnauthorized: false` unconditionally — see `BUG-012`.
- `FRONTEND_URL` — the **only** permitted CORS origin, and the base for Stripe return URLs.

## Release process

Trunk-ish flow observed in git history: feature branch → PR → merge to `dev` → PR → merge to
`main`. 75 commits, 23 PRs, Mar 7 – Jun 17 2026. Vercel deploys the frontend from GitHub;
Railway deploys the backend from the same GitHub repo (Root Directory `backend`).

There is **no release tagging, no changelog, and no version number** anywhere in the repository.

## Migration order

There is no migration tool. Applying the database by hand, in this order:

1. `ProjectDocs/GDGOC_UITU_schema.sql` — the full authoritative schema (v1.3), idempotent via
   `IF NOT EXISTS` throughout.
2. `ProjectDocs/migration_teams.sql` — no-op on a fresh build; only needed for databases
   created before `content.teams` was folded into the main schema.
3. `ProjectDocs/migration_performance_indexes.sql` — adds 3 indexes, **two of which are
   defective** (`BUG-006`).

Then, manually and not currently done: change the `gdgoc_app` role password away from the
literal `'CHANGE_IN_PRODUCTION'` in the schema file (`TODO-015`), and seed `forum.categories`,
which no SQL file populates.

## CI/CD

**None.** There is no `.github/` directory, no workflow file, no pipeline configuration of any
kind. Nothing runs typecheck, lint, tests, or dependency audit on a pull request.

Vercel's own GitHub integration builds and deploys the frontend on push, and Railway's does the
same for the backend — that is the entire automated pipeline, and neither runs a typecheck, a
lint, or a test before deploying. See [[Testing_Strategy]] and `TODO-034`.

## Rollback procedure

**Frontend** — Vercel keeps previous deployments; rolling back is promoting an earlier one
from its dashboard. Not documented as a runbook and never rehearsed.

**Backend** — Railway keeps prior deployments and its dashboard supports redeploying an older
one, but this has not been exercised or written up as a runbook (`TODO-037`).

**Database** — no rollback path. Schema changes are applied by hand and there are no down
migrations. Restoring would depend on Supabase's managed backups, which have never been tested
(`TODO-027`).

> [!warning] A bad database change is currently not recoverable in any rehearsed way
> This is the largest operational gap in the project. `TODO-027`, `TODO-037`.

## Feature flags

**None.** No flag system, no remote config, no gradual rollout. The two runtime switches that
exist are environment-driven and are not feature flags in any managed sense:

- `ALLOW_MOCK_AUTH` (backend) — combined with `NODE_ENV !== 'production'`, enables the
  `mock-token` bypass.
- `MOCK_ENABLED` (frontend, `lib/mockAuth.ts`) — a **hard-coded constant**, currently `false`.
  Changing it requires a code edit and a rebuild.

## Secrets and configuration

`backend/.env` and `frontend/.env.local` are gitignored and exist only locally; production
values live in the hosting providers' dashboards. There is **no `.env.example`** in either app,
so the required-variable list above is the only inventory — reconstructed by reading the code.

Several variables are non-null-asserted (`process.env.X!`) with no startup validation, so a
missing secret surfaces as a runtime failure on first use rather than a boot failure.
`TODO-014`.

## Known gaps

| Gap | Reference |
|---|---|
| Railway config lives only in its dashboard — no `railway.json`/deploy manifest in-repo | `TODO-047` |
| Vercel Root Directory, and the Supabase/Google OAuth redirect URLs, live only in their dashboards | `TODO-048` |
| DB pool skips TLS certificate-chain validation (`rejectUnauthorized: false`) rather than pinning Supabase's CA | `TODO-046`, `BUG-012` |
| No CI pipeline of any kind | `TODO-034` |
| No staging environment; local likely shares the production database | `TODO-035` |
| No `.env.example` and no boot-time secret validation | `TODO-014` |
| Database rollback never rehearsed; backups never restore-tested; backend rollback via Railway never exercised | `TODO-027`, `TODO-037` |
| No migration tool — schema applied by hand | `TODO-009` |
| Audit partitions run out on 2027-01-01 | `BUG-005` |
| Two vendored copies of `shared/types.ts` can drift | `TODO-001` |
| No release tagging or changelog | `TODO-038` |
