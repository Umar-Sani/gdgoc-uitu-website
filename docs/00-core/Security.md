# Security

> Verified against the code on 2026-09-09.

> [!important] This supersedes parts of `ProjectDocs/Security.md`
> That document (audited 2026-06-14) marks **helmet** and **rate limiting** as ❌ "not
> applied". Both were applied in the 2026-06-14 security commit and are live today —
> `backend/src/index.ts` lines 24 and 36. Those two entries are stale. Its findings on SSL
> certificate validation, raw error leakage and RLS remain accurate. Sections here take
> precedence.

Legend: ✅ implemented · ⚠️ partial · ❌ absent · `TODO` not yet documented.

## 1. Security Architecture

Defence sits almost entirely in the **API layer**. The database has RLS policies but they are
inert in practice (§9), and the frontend's route guards are cosmetic (§5). Effective controls:
Supabase token verification, `requireRole` allow-lists, Zod body validation, parameterised SQL,
helmet, CORS, and IP rate limiting.

## 2. Assets

| Asset | Sensitivity |
|---|---|
| User identities, emails, password hashes | High — held in Supabase Auth and mirrored in `users.users` |
| Payment transactions, invoice numbers | High |
| Audit log | High — integrity matters more than confidentiality |
| Forum content, event data, CMS content | Low–medium; mostly public by design |
| Service credentials (Stripe, Supabase service role, Cloudinary, Brevo SMTP) | Critical |

## 3. Trust Boundaries

1. Browser → Vercel-hosted Next.js — untrusted input.
2. Browser → Express API — untrusted; the **real** enforcement boundary.
3. Browser → Supabase directly (SDK reads and auth) — enforced by Supabase, not by us.
4. Stripe → `/api/payments/webhook` — untrusted network, authenticated by signature.
5. Express → PostgreSQL — trusted; connects as an owner-level role that bypasses RLS.

## 4. Authentication ✅

Supabase Auth, email/password plus Google OAuth. The backend never verifies JWTs locally — it
calls `supabase.auth.getUser(token)` per request. `jsonwebtoken` and `bcryptjs` are declared
dependencies but never imported.

> [!warning] Mock-auth bypass
> `backend/src/middleware/auth.ts` accepts the literal token `mock-token` as a hard-coded
> admin UUID when `NODE_ENV !== 'production'` **and** `ALLOW_MOCK_AUTH === 'true'`. Both
> conditions are required, so production is protected by the `NODE_ENV` check alone.
> `frontend/lib/mockAuth.ts` has a matching client switch, currently `MOCK_ENABLED = false`
> (a hard-coded constant, not an env var). See `TODO-013`.

## 5. Authorization ⚠️

`requireRole(...roles)` is a **flat allow-list** — `admin` does not imply `super_admin`.
Per-resource ownership is enforced by scoping SQL to the caller's `user_id` (notifications,
registrations, tickets), not by a policy layer.

> [!warning] Frontend route guards are not a security control
> There is no `middleware.ts`. `(member)` and `(admin)` layouts redirect **after hydration**,
> so protected HTML is served to anyone. Data remains protected by API guards. See `TODO-004`.

Known authorization gaps: `BUG-007` (two under-guarded CMS reads), and `POST /api/upload`
having no role guard at all.

## 6. Session Security ⚠️

Sessions are Supabase's, stored in browser storage by the default `supabase-js` client — **not**
in httpOnly cookies, because `@supabase/ssr` is not used. This is XSS-reachable by design.
The access token is held in React state in `AuthContext` and passed as a bearer header.
Logout calls `supabase.auth.signOut()`; there is no server-side session revocation list.

## 7. API Security ✅

helmet (CSP/COEP off — it is an API server), single-origin CORS from `FRONTEND_URL`, 50 KB body
cap, IP rate limiting (300/15min global, 20/min on writes). No API versioning (`TODO-011`).
No `trust proxy` (`BUG-008`).

## 8. URL Security ⚠️

Resource IDs are UUIDs, so they are not enumerable. Route and query parameters are **never**
Zod-validated — they reach parameterised SQL directly, which prevents injection but permits
malformed input to surface as a raw driver error (§25).

## 9. Database Security ⚠️

Parameterised SQL throughout; no string interpolation of user values. `ON DELETE RESTRICT` on
registrations and transactions prevents orphaning financial records.

> [!warning] RLS is enabled but inert
> Policies on 5 tables depend on `current_setting('app.current_user_id')` / `app.current_role`,
> which **the backend never sets**. No policy names a role (`TO`), and `FORCE ROW LEVEL
> SECURITY` is never applied, so the connecting owner role bypasses RLS entirely. The same
> missing session settings mean audit rows record a NULL actor. See `BUG-003`, `BUG-004`.

SSL certificate validation is enabled only when `NODE_ENV === 'production'`.

## 10. Secrets Management ⚠️

18 backend environment variables, 4 frontend `NEXT_PUBLIC_*`. `backend/.env` and
`frontend/.env.local` exist locally and are gitignored. There is **no `.env.example`** in
either app and **no startup validation** that required variables are present — several are
non-null-asserted (`process.env.X!`), so a missing value fails at first use, not at boot.
See `TODO-014`.

The schema file creates role `gdgoc_app` with literal password `'CHANGE_IN_PRODUCTION'`
(`TODO-015`).

## 11. Encryption ⚠️

TLS in transit to Supabase, Stripe, Cloudinary and Brevo (STARTTLS on port 587). Passwords are
hashed by Supabase Auth. `users.users.password_hash` exists in the schema but is legacy —
authentication does not use it. No application-level encryption at rest beyond what Supabase
provides. `TODO-016`.

## 12. WebSocket Security

**Not applicable** — the application uses no WebSockets. Notifications are delivered by client
polling of `/api/notifications`.

## 13. Background Job Security

**Not applicable in the application**; `TODO` at the database layer. `pg_cron` is installed but
no job is scheduled (see [[Database]]). The materialized view refresh and audit partition
creation that *should* be scheduled are not. `TODO-007`.

## 14. File Upload Security ✅

`POST /api/upload`: multer memory storage, 5 MB cap, `fileFilter` accepting only
`image/*` mimetypes, single field `image`, requires authentication. The buffer is base64-encoded
into a data URI and sent to Cloudinary.

Weaknesses: mimetype is client-asserted and not verified against magic bytes; the `?folder=`
query parameter has **no allow-list**; there is **no role guard**; and no delete path exists, so
removing a CMS row orphans the Cloudinary asset. `TODO-017`.

## 15. Input Validation ⚠️

Zod v4 via a `validate(schema)` middleware, applied to `req.body` only. On failure: `400` with
the first issue's message. Unknown keys are stripped by Zod's object default, which is what
protects the dynamic `UPDATE` builders from mass assignment.

Routes that mutate but have **no** Zod schema: `POST/PATCH/DELETE /api/events/:id/people*`,
`PUT /api/forum/threads/:id/pin`, `/lock`, and `POST /api/cms/gallery`. `TODO-018`.

## 16. Rate Limiting ✅

Global 300/15 min; write endpoints 20/min. Both keyed by IP with no custom `keyGenerator`,
and undermined by the missing `trust proxy` (`BUG-008`). There is no per-user or per-account
limiting, so a distributed client is unconstrained. `TODO-019`.

## 17. CSRF ✅ (by architecture)

The API is token-authenticated with an `Authorization` header, not cookies, so classic CSRF
does not apply. CORS is restricted to a single origin. No CSRF middleware is present and none
is needed while authentication stays header-based — this changes the moment cookies are
introduced.

## 18. XSS ⚠️

React escapes by default. Two live risks:

1. Forum content is rendered through `react-markdown` with `remark-gfm`. No sanitizer plugin
   (`rehype-sanitize`) is configured. `TODO-020`.
2. **Outbound email templates interpolate user-supplied strings into HTML with no escaping**
   (`backend/src/lib/mailer.ts`) — thread titles, names and body snippets. `BUG-009`.

Session tokens live in browser storage, so a successful XSS yields the access token (§6).

## 19. SQL Injection ✅

All user values are bound via `$n` placeholders. List endpoints concatenate query *fragments*,
but the interpolated parts are placeholder indices and fixed literals, never user data.
`cms.ts` builds a dynamic `SET` clause from a fixed column allow-list.

## 20. SSRF

`TODO` — not assessed. The only outbound fetches are to fixed provider endpoints (Stripe,
Cloudinary, Brevo, Supabase); no user-supplied URL is fetched server-side that I could find.
`TODO-021`.

## 21. IDOR / BOLA ⚠️

User-scoped endpoints filter by the caller's `user_id` in SQL. UUID keys make enumeration
impractical. Not systematically tested — `TODO-022`. `BUG-007` is an instance of this class.

## 22. Webhook Security ⚠️

`POST /api/payments/webhook` verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET` against
a raw body (`express.raw` is deliberately mounted before the JSON parser). A bad signature
returns `400`.

> [!warning] No replay protection, and failures are swallowed
> Stripe event IDs are not recorded, so a replayed signed event is reprocessed —
> `process_payment`'s `TRANSACTION_ALREADY_PROCESSED` guard is the only thing that stops it.
> Worse, when the database transaction fails the handler **still returns 200** deliberately so
> Stripe will not retry, meaning a paid registration can be silently lost. See `BUG-010` and
> [[ErrorHandling]].

## 23. Credential Stuffing

`TODO` — login is handled entirely by Supabase Auth; whatever protections it applies are not
documented here, and no application-side lockout or captcha exists. `TODO-023`.

## 24. Abuse / Spam ⚠️

`POST /api/cms/contact`, `POST /api/cms/newsletter` and `POST /api/forum/threads/:id/view` are
public writes with no captcha and only IP rate limiting. The view-count endpoint is trivially
inflatable. `TODO-024`.

## 25. Logging ❌

`console.log` / `console.error` only. No structured logging, no request IDs, no log shipping.
The global error handler emits a `ref` correlation id, but it is **effectively dead code**:
every route handler catches its own errors and responds directly, so most 500s return
`err.message` raw to the client regardless of `NODE_ENV`. `BUG-011`.

## 26. Monitoring ❌

None. No APM, no uptime monitoring, no dashboards. `GET /health` exists but nothing polls it.
`TODO-025`.

## 27. Alerting ❌

None. No paging, no error alerting, no notification on failed payments or webhook errors —
the failure mode in `BUG-010` is silent by construction. `TODO-026`.

## 28. Backup / Recovery ❌

Not configured or verified by this repository. Supabase provides managed backups on its own
schedule; that has **not** been confirmed for this project, and no restore has ever been
tested. `TODO-027`.

## 29. Incident Response ❌

No documented process, on-call rotation, or severity scale. A postmortem template exists at
[[../01-planning/postmortems/_postmortem_template|_postmortem_template]] but has never been
used. `TODO-028`.

## 30. Security Testing ❌

No automated tests of any kind exist in this repository (see [[Testing_Strategy]]). No SAST,
no dependency scanning, no penetration test. The two prior audits were manual reads.
`TODO-029`.

## 31. Security Checklist

| Control | Status |
|---|---|
| Token auth on every mutating endpoint | ✅ |
| Role guards on admin surfaces | ✅ (2 known gaps — `BUG-007`) |
| Parameterised SQL | ✅ |
| helmet, CORS, body cap | ✅ |
| Rate limiting | ✅ (undermined by `BUG-008`) |
| Stripe signature verification | ✅ |
| Zod validation on bodies | ⚠️ 4 routes uncovered |
| Query/param validation | ❌ |
| RLS actually enforcing | ❌ `BUG-004` |
| Audit log records the actor | ❌ `BUG-003` |
| HTML-escaped outbound email | ❌ `BUG-009` |
| Markdown sanitisation | ❌ `TODO-020` |
| Secrets validated at boot | ❌ `TODO-014` |
| Structured logging | ❌ |
| Monitoring / alerting | ❌ |
| Backup restore tested | ❌ |
| Automated security testing | ❌ |
