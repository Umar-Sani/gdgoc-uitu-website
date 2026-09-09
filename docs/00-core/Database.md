# Database

> Verified against `ProjectDocs/GDGOC_UITU_schema.sql` (v1.3, dated 2026-06-14, 1609 lines) on
> 2026-09-09, plus `migration_teams.sql` and `migration_performance_indexes.sql`.

## Database Architecture

PostgreSQL 15 hosted on Supabase. Accessed two ways — see [[Architecture]]:

- **Express** via `pg`, raw parameterised SQL. Pool config (`backend/src/db/client.ts`):
  `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. SSL validates
  certificates in production only (`rejectUnauthorized: false` otherwise). No
  `statement_timeout`, and **no `pool.on('error')` handler** — see `TODO-006`.
- **Next.js** via `@supabase/supabase-js` for simple public reads and all auth.

There is **no ORM**. No Prisma, Drizzle, TypeORM or Knex.

Extensions installed: `pgcrypto`, `pg_trgm`, `btree_gin`, `pg_cron`.

> [!note] `pg_trgm` and `pg_cron` are installed but unused
> No trigram index is created anywhere — full-text search uses a GIN index on a `tsvector`
> column instead. And no `cron.schedule()` call exists in the schema; the materialized-view
> refresh schedule appears only inside a SQL comment. See `TODO-007`.

## Schema Overview

9 schemas, 31 base tables, plus 12 monthly partitions of `audit.logs`.

| Schema | Tables | Responsibility |
|---|---|---|
| `users` | `roles`, `permissions`, `role_permissions`, `users`, `password_reset_tokens`, `notification_preferences` | Identity, RBAC, notification settings |
| `events` | `categories`, `events`, `registrations`, `event_people` | Event lifecycle and seat management |
| `payments` | `transactions` | Financial transactions and invoicing |
| `forum` | `categories`, `threads`, `replies`, `upvotes`, `reports`, `moderation_log`, `thread_summaries` | Community discussion and moderation |
| `social` | `posts` | Social media content calendar |
| `ai_metadata` | `event_recommendations` | Recommendation scores |
| `content` | `homepage`, `about_sections`, `team_members`, `gallery`, `sponsors`, `contact_submissions`, `newsletter_subscribers`, `featured_events`, `teams` | CMS-driven site content |
| `audit` | `logs` (partitioned) | Immutable change history |
| `notifications` | `notifications` | In-app notification delivery |

### Key tables

**`users.users`** — PK `user_id UUID`. `email` and `username` both UNIQUE (`username` nullable,
with a partial unique index). `role_id → users.roles ON DELETE RESTRICT`. `skill_tags TEXT[]`
feeds the recommendation engine.

**`events.events`** — PK `event_id UUID`. `max_seats > 0`, `seats_registered >= 0`,
`chk_end_after_start`, `chk_online_link` (an online event must have a meeting link), and
`is_free = TRUE OR ticket_price > 0`. `created_by → users.users ON DELETE SET NULL`.

**`events.registrations`** — PK `registration_id UUID`. **UNIQUE `(event_id, user_id)`** — the
database-level guarantee against double registration. Both `event_id` and `user_id` are
`ON DELETE RESTRICT`, so a user with registrations cannot be hard-deleted.

**`payments.transactions`** — PK `transaction_id UUID`. `gateway_reference` and
`invoice_number` are both UNIQUE. `amount > 0`. `currency CHAR(3) DEFAULT 'PKR'`.

> [!warning] The stored currency and the charged currency differ
> Rows are written with `currency = 'PKR'`, but the Stripe checkout session is created with
> `currency: 'usd'` hard-coded (`backend/src/routes/payments.ts`), because Stripe does not
> support PKR. The amount is **not** converted — `ticket_price` is passed through as if it
> were USD. See `BUG-001`.

**`forum.threads`** — PK `thread_id UUID`. Denormalised counters `view_count`, `upvote_count`,
`reply_count` maintained by triggers. `tsv TSVECTOR` maintained by a `BEFORE` trigger and
indexed with GIN for full-text search.

**`notifications.notifications`** — PK `notification_id UUID`, `user_id ON DELETE CASCADE`.

**`audit.logs`** — composite PK `(log_id, changed_at)`; `changed_at` must be in the PK because
it is the partition key.

### ENUM types

12 enums. The ones that most often cause confusion:

| Enum | Values |
|---|---|
| `events.payment_status_enum` | `pending`, `completed`, `refunded`, `failed` |
| `payments.transaction_status_enum` | `pending`, `success`, `failed`, `refunded` |
| `events.event_status_enum` | `draft`, `published`, `ongoing`, `completed`, `cancelled` |
| `notifications.notification_type_enum` | `event_reminder`, `registration_confirmed`, `new_reply`, `upvote_received`, `report_reviewed`, `system_announcement`, `mention` |

> [!warning] A registration is `completed`; a transaction is `success`
> The two payment enums do not share values. Code that maps between them must translate.

`users.role_name_enum` (`super_admin`, `admin`, `editor`, `viewer`, `user`) is **declared but
unused** — `users.roles.role_name` is a plain `VARCHAR(50)`. See `TODO-008`.

### Stored procedures

All four live in schema `public`, are invoked with `CALL`, and contain no `COMMIT`/`ROLLBACK` —
they run inside the caller's transaction.

| Procedure | Called from | Raises |
|---|---|---|
| `register_user_for_event(user, event)` | `events.ts`, `payments.ts` | `EVENT_NOT_FOUND`, `EVENT_UNAVAILABLE`, `EVENT_FULL`, `ALREADY_REGISTERED` |
| `process_payment(txn, gateway_response, status)` | `payments.ts` | `TRANSACTION_NOT_FOUND`, `TRANSACTION_ALREADY_PROCESSED` |
| `generate_ai_recommendations(user)` | `users.ts` | `USER_NOT_FOUND` |
| `moderate_forum_content(...)` | **never called** | `INVALID_CONTENT_TYPE`, `INVALID_ACTION` |

`register_user_for_event` takes `SELECT ... FOR UPDATE` on the event row before any check.
Callers wrap it in `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`. Capacity is checked in
**two** places — the procedure, and the `trg_seat_counter` AFTER INSERT trigger — which both
raise `EVENT_FULL` with slightly different message text.

`process_payment` generates invoices as `INV-<YYYY>-<6-digit zero-padded sequence>`, e.g.
`INV-2026-000042`, from `payments.invoice_seq`. Its `TRANSACTION_ALREADY_PROCESSED` guard is
the system's only idempotency mechanism — see [[ErrorHandling]].

> [!warning] `moderate_forum_content` cannot execute for threads
> Its thread `UPDATE` assigns `is_deleted` twice in one `SET` list, which PostgreSQL rejects
> with `multiple assignments to same column`. The backend never calls it — forum moderation
> routes issue direct `UPDATE`s instead — so this is latent, not live. See `BUG-002`.

### Triggers

25 triggers in three groups:

- **11 `updated_at` triggers** — `BEFORE UPDATE` → `public.set_updated_at()`. Not applied to
  `users.notification_preferences` despite it having the column.
- **10 audit triggers** — `AFTER INSERT OR UPDATE OR DELETE` → `audit.log_change('<pk>')`,
  which is `SECURITY DEFINER` and reads the actor from `current_setting('app.current_user_id')`.
- **4 business triggers** — `trg_seat_counter` (seat count + capacity re-check),
  `trg_forum_tsv` (search vector), `trg_reply_counter`, `trg_upvote_counter`.

> [!warning] The audit actor is only recorded if the app sets it
> `audit.log_change()` reads `app.current_user_id`, `app.client_ip` and `app.session_id` from
> session settings. **No backend code calls `SET LOCAL` for these**, so audit rows are written
> with a NULL actor. The audit log records *what* changed but not *who*. See `BUG-003`.

### Views

`events.v_event_summary`, `users.v_user_profile`, `forum.v_thread_preview`,
`payments.v_transaction_report`, `audit.v_recent_activity`, and one materialized view
`ai_metadata.v_trending_topics` (7-day tag frequency, uniquely indexed on `(tag, source)` so it
can be refreshed concurrently — but nothing schedules that refresh).

## Performance and Security Controls

**Indexes** — B-tree by default, with five GIN indexes (`users.skill_tags`, `events.tags`,
`forum.threads.tsv`, `forum.threads.tags`, `social.posts.tags`) and heavy use of partial
indexes (`WHERE is_active = TRUE`, `WHERE is_deleted = FALSE`, `WHERE status = 'pending'`).
Composite indexes cover the hot paths: `events(status, start_datetime)`,
`audit(table_name, record_id)`, `notifications(user_id, is_read)`.

**Row Level Security** — enabled on 5 tables: `users.users`, `events.registrations`,
`payments.transactions`, `audit.logs`, `notifications.notifications`. Five policies, all
`USING`-only, keyed on `current_setting('app.current_user_id')` / `app.current_role`.

> [!warning] RLS is effectively inert for this application
> The policies depend on session settings the backend never sets (same root cause as
> `BUG-003`), no policy specifies `TO <role>`, and `FORCE ROW LEVEL SECURITY` is never set —
> so the owner role bypasses RLS entirely. Access control is enforced **in the API layer only**.
> See [[Security]] and `BUG-004`.

**Partitioning** — `audit.logs` is `PARTITION BY RANGE (changed_at)` with 12 monthly partitions
covering 2026 only.

> [!warning] Audit logging will fail from 2027-01-01
> There is no `DEFAULT` partition and no automated partition creation. Any insert with
> `changed_at` outside 2026 fails with *no partition of relation found for row* — and because
> audit triggers fire `AFTER` on 10 tables, that failure will **abort the originating write**.
> See `BUG-005`.

## Migrations, N+1 Risks, Pooling, Caching

**Migrations.** There is no migration tool and no ordered migration directory. Changes are a
single authoritative `GDGOC_UITU_schema.sql` plus two ad-hoc files applied by hand:

- `migration_teams.sql` — creates `content.teams`. Already folded into the main schema, so it
  is a no-op on a fresh build.
- `migration_performance_indexes.sql` — adds 3 indexes. Two are defective:
  `idx_notif_prefs_user` duplicates the table's own primary key, and `idx_newsletter_active`
  **collides by name** with an existing index on a different column, so `IF NOT EXISTS` makes
  it a silent no-op and the intended index is never created. See `BUG-006`.

See `TODO-009` for adopting a real migration tool.

**N+1 risks.** `generate_ai_recommendations` loops per candidate event in PL/pgSQL. Denormalised
forum counters avoid per-thread count queries. `MemberDataContext` fetches events and threads
once per session rather than per page.

**Pooling.** Single `pg` pool, `max: 20`, in one process. Supabase also imposes its own
connection limits; the interaction between the two is unverified — see `TODO-010`.

**Caching.** None. No Redis, no HTTP cache headers set by the API, no `revalidate` strategy
documented. Every request hits PostgreSQL.

## Related Decisions

- [[../04-decisions/ADR-003-Business-Logic-In-Database|ADR-003]] — why seat allocation and
  payment settlement live in stored procedures.
- [[../04-decisions/ADR-001-Split-Data-Access-Path|ADR-001]] — why some reads bypass Express.
