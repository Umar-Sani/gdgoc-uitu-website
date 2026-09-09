# Bugs

Defects in **shipped code**. Work that was consciously deferred belongs in
[[../06-ideas/_Ideas_Index|06-ideas]]; session narrative belongs in
[`../../handoff.md`](../../handoff.md); documentation gaps and engineering tasks belong in
[[TODO]].

> [!note] These were found by reading the code on 2026-09-09, not by observing failures
> None has been reproduced against the running system. Each entry says what should happen, and
> what a reproduction would look like. Treat severity as an estimate until reproduced.

Status: `open` · `confirmed` · `fixed` · `wontfix`.

| ID | Status | Summary | Impact | Related |
|---|---|---|---|---|
| BUG-001 | open | Ticket prices are stored as PKR but charged to Stripe as USD, with no conversion | **High** — customers are charged roughly 280× the intended amount | [[../00-core/Database]] |
| BUG-002 | open | `moderate_forum_content` assigns `is_deleted` twice in one `UPDATE ... SET`, which PostgreSQL rejects | **Low, latent** — the procedure is never called, so nothing breaks today | `TODO-043` |
| BUG-003 | open | Audit log records a NULL actor because `app.current_user_id` is never set | **High** — the audit log answers *what* changed but never *who* | [[../00-core/Security]] |
| BUG-004 | open | RLS policies are enabled but inert | **Medium** — access control rests entirely on the API layer | [[../00-core/Security]] |
| BUG-005 | open | `audit.logs` has partitions for 2026 only, no `DEFAULT` partition | **Critical, time-bomb** — from 2027-01-01 writes to 10 core tables begin failing | [[../00-core/ErrorHandling]] |
| BUG-006 | open | `migration_performance_indexes.sql`: one index duplicates a primary key, another collides by name and is silently skipped | **Low** — an intended performance index was never created | [[../00-core/Database]] |
| BUG-007 | open | Two CMS reads are under-guarded: `GET /api/cms/team?all=true` has no auth; `GET /api/cms/featured-events/all` has no role check | **Medium** — inactive/unpublished CMS content is exposed | [[../00-core/api]] |
| BUG-008 | fixed | `trust proxy` is never set, so IP rate limiting may bucket all traffic behind a proxy together | **Medium** — rate limiting is either ineffective or over-aggressive | [[../00-core/api]] |
| BUG-009 | open | Outbound email templates interpolate user input into HTML without escaping | **Medium** — HTML/content injection into emails | [[../00-core/Security]] |
| BUG-010 | open | Stripe webhook has no replay protection, and returns 200 on database failure so Stripe will not retry | **High** — a paid registration can be silently lost | [[../00-core/ErrorHandling]] |
| BUG-011 | open | Route handlers respond directly, bypassing the central error handler's production redaction | **Medium** — raw driver messages leak to clients | [[../00-core/ErrorHandling]] |
| BUG-012 | fixed | `db/client.ts` set `ssl: { rejectUnauthorized: true }` in production, which rejects Supabase pooler's certificate chain | **Critical** — every database query failed in production; `/health` reported `db: unreachable` | `TODO-046` |

## Notes

### BUG-001 — currency mismatch

**Diagnosis.** `backend/src/routes/payments.ts` inserts the transaction row with
`currency = 'PKR'`, then creates the Stripe checkout session with `currency: 'usd'` hard-coded
and `unit_amount: Math.round(event.ticket_price * 100)`. A comment acknowledges Stripe does not
support PKR, but no conversion is applied — a ₨2,000 ticket is charged as $2,000.00.

**Reproduction.** Create a paid event, start checkout, and read the amount on the Stripe page.

**Suggested fix.** Decide the intended behaviour first, because this is a product question, not
only a code one. Either (a) price events in a Stripe-supported currency and store that currency
on the event, or (b) keep PKR pricing and convert at checkout with a recorded rate, storing both
the source and charged amounts on the transaction. Do not silently reinterpret the number.

### BUG-002 — `moderate_forum_content` cannot run for threads

**Diagnosis.** In the thread branch, the `SET` list assigns `is_deleted` on the `'remove'` line
and again on the `'restore'` line. PostgreSQL rejects duplicate assignment targets with
`multiple assignments to same column "is_deleted"`. As written, every `p_content_type = 'thread'`
call fails.

**Why nothing is broken today.** The backend never calls this procedure — `forum.ts` moderation
routes issue direct `UPDATE`s. The procedure is dead code that would fail if wired up.

**Suggested fix.** Collapse to a single `is_deleted = CASE WHEN p_action = 'remove' THEN TRUE
WHEN p_action = 'restore' THEN FALSE ELSE is_deleted END`. Then decide whether to adopt the
procedure (gaining the `forum.moderation_log` write for free) or delete it — `TODO-043`.

### BUG-003 / BUG-004 — the session-setting gap

**Diagnosis.** Both share one root cause. `audit.log_change()` reads the actor from
`current_setting('app.current_user_id', TRUE)`, and all five RLS policies key on the same
setting plus `app.current_role`. **No backend code ever issues `SET LOCAL app.current_user_id`.**
So every audit row has `changed_by = NULL`, and every RLS policy evaluates against NULL.

RLS is further neutralised by two independent facts: no policy specifies `TO <role>`, and
`FORCE ROW LEVEL SECURITY` is never set, so the owner role the API connects as bypasses RLS
regardless.

**Suggested fix.** In the `pg` layer, wrap each request's work in a transaction that first runs
`SET LOCAL app.current_user_id = $1` and `SET LOCAL app.current_role = $2` from the authenticated
user. That single change fixes the audit actor and makes the RLS policies meaningful. Treat RLS
as defence in depth — the API guards must remain correct either way.

### BUG-005 — audit partitions expire

**Diagnosis.** `audit.logs` is `PARTITION BY RANGE (changed_at)` with twelve partitions covering
2026-01 through 2026-12 and **no `DEFAULT` partition**. An insert whose `changed_at` falls
outside 2026 raises *no partition of relation found for row*. Because the ten audit triggers are
`AFTER` triggers inside the writing transaction, that error **aborts the original write**.

**Impact.** From 2027-01-01, inserts and updates to `users.users`, `events.events`,
`events.registrations`, `payments.transactions`, `forum.threads`, `forum.replies`,
`social.posts`, `events.event_people`, `content.featured_events` and `content.team_members` all
begin failing. That is most of the application.

**Reproduction.** One line: `INSERT INTO audit.logs (…, changed_at) VALUES (…, '2027-01-01');`

**Suggested fix.** Immediately: `CREATE TABLE audit.logs_default PARTITION OF audit.logs
DEFAULT;` — this alone removes the outage risk. Then create 2027 partitions and schedule
ongoing creation with `pg_cron`, which is already installed (`TODO-007`). Monitor the default
partition; rows landing there indicate the schedule has lapsed.

### BUG-006 — defective performance migration

**Diagnosis.** `idx_notif_prefs_user` indexes `users.notification_preferences (user_id)`, which
is already that table's primary key — pure overhead. `idx_newsletter_active` reuses a name
already taken by an index in the main schema on a *different* column, so `CREATE INDEX IF NOT
EXISTS` silently does nothing and the intended `(email) WHERE is_active` index is never created.

**Suggested fix.** Drop the redundant index; rename the second to
`idx_newsletter_email_active` and re-apply.

### BUG-007 — under-guarded CMS reads

**Diagnosis.** `GET /api/cms/team` honours `?all=true` to include inactive members with **no
auth check at all**. `GET /api/cms/featured-events/all` carries `requireAuth` but no
`requireRole`, despite being commented "Admin", so any signed-in user reads unpublished
featured events.

**Suggested fix.** Add `requireAuth, requireRole('admin','super_admin')` to the
`featured-events/all` route, and gate the `?all=true` branch of `/cms/team` behind the same
check rather than the query string. A role-guard matrix test would prevent recurrence —
[[../00-core/Testing_Strategy]].

### BUG-008 — `trust proxy` unset

**Diagnosis.** `express-rate-limit` keys on `req.ip`. Without `app.set('trust proxy', …)`,
Express reports the immediate peer, which behind a reverse proxy or PaaS load balancer is the
proxy. All users then share one 300-request bucket.

**Suggested fix.** Set `trust proxy` to the specific hop count for the real deployment — not
`true`, which lets a client spoof `X-Forwarded-For` and evade limiting entirely. Requires
knowing the hosting topology first (`TODO-036`).

**Fixed 2026-09-09.** Backend hosting confirmed as Railway (single reverse-proxy hop), so
`index.ts` now sets `app.set('trust proxy', 1)` — the specific-hop-count form the suggested fix
called for, not the spoofable `true`.

### BUG-012 — production TLS validation rejected Supabase's own certificate

**Diagnosis.** `db/client.ts` set `ssl: { rejectUnauthorized: true }` whenever
`NODE_ENV === 'production'`, on the assumption that Supabase's certificate would validate
cleanly. It doesn't: Supabase's connection pooler (Supavisor) presents a chain Node's default
CA store cannot fully verify, so every pooled connection failed with *self-signed certificate in
certificate chain* — confirmed first-hand from the Railway deploy logs, not by reading the code.

**Impact.** Total — every route touching the database returned an error, and `GET /health`
reported `db: unreachable` on every request.

**Reproduction (as it was).** Deploy with `NODE_ENV=production` and `rejectUnauthorized: true`
against a Supabase pooler connection string; any query rejects immediately.

**Fixed 2026-09-09.** Changed to `ssl: { rejectUnauthorized: false }` unconditionally. The
connection is still TLS-encrypted; only certificate-chain validation is skipped, which is what
Supabase's own Node/`pg` connection guidance recommends for hosted connections through the
pooler. The stricter alternative — fetching and pinning Supabase's CA certificate instead of
disabling validation — is left as `TODO-046`.

### BUG-009 — unescaped email templates

**Diagnosis.** `backend/src/lib/mailer.ts` interpolates thread titles, display names and body
snippets into HTML string templates with no escaping. A thread titled with markup injects it
into every reply-notification email.

**Suggested fix.** Add a small `escapeHtml` helper and apply it to every interpolated value in
the six templates. Email clients vary in what they execute, but the correct posture is to escape
regardless.

### BUG-010 — webhook replay and swallowed failure

**Diagnosis.** Two problems in one handler. (1) Stripe event IDs are never persisted, so a
replayed signed event is reprocessed; only `process_payment`'s `TRANSACTION_ALREADY_PROCESSED`
check stops double-settlement. (2) On database failure the handler rolls back and **still
returns 200**, with a comment saying this is deliberate so Stripe will not retry. The customer
has paid, the registration does not exist, and nothing alerts anyone.

**Suggested fix.** Persist processed Stripe event IDs and short-circuit duplicates. Return a
`5xx` on database failure so Stripe's retry schedule applies — that is what it is for. If a
non-retryable failure is genuinely distinguishable, record it to a durable failure table and
alert on it (`TODO-026`), rather than discarding it with a 200.

### BUG-011 — error redaction bypassed

**Diagnosis.** `index.ts` has a central error handler that redacts messages to a correlation
`ref` in production. No route handler calls `next(err)` — all catch and respond directly with
`err.message`, so raw PostgreSQL messages (constraint names, column names) reach clients in
production.

**Suggested fix.** Either route handler errors through `next(err)`, or add a small
`respondError(res, err)` helper applying the same redaction. The first is cleaner and would let
the existing handler do its job.
