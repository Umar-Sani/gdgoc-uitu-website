# Runbook — Database Setup

Standing up the schema from scratch. Verified against the SQL files on 2026-09-09.

> [!warning] There is no migration tool
> The schema is one authoritative file plus two ad-hoc migrations, applied by hand. There are
> no down migrations and no version tracking. `TODO-009`.

## Apply the schema

Run in this order, against the target PostgreSQL (Supabase SQL Editor, or `psql`):

1. **`ProjectDocs/GDGOC_UITU_schema.sql`** — the full schema, v1.3. Idempotent throughout
   (`IF NOT EXISTS`), so it is safe to re-run. Creates 9 schemas, 31 tables, 12 audit
   partitions, 12 enums, 4 procedures, 25 triggers, 6 views, the indexes, RLS policies, and
   seed data.

2. **`ProjectDocs/migration_teams.sql`** — creates `content.teams`. **A no-op on a fresh
   build**; only needed for databases created before `content.teams` was folded into the main
   schema.

3. **`ProjectDocs/migration_performance_indexes.sql`** — adds 3 indexes, **two of which are
   defective**: one duplicates a primary key, and one collides by name with an existing index
   so `IF NOT EXISTS` silently skips it. See [[../01-planning/bugs|BUG-006]]. Applying it is
   harmless but does not achieve what it claims.

## Then do these by hand

The schema does not finish the job. None of the following is automated:

### 1. Change the `gdgoc_app` password

The schema creates the role with the literal password `'CHANGE_IN_PRODUCTION'`. Change it
before anything is reachable. `TODO-015`.

### 2. Seed `forum.categories`

The table is created and indexed but **no SQL file populates it**. If the forum expects
categories, they must be inserted manually. `TODO-042`.

Seeded automatically: `users.roles` (5), `users.permissions` (14), `users.role_permissions`
(via a `DO` block), `events.categories` (7).

### 3. Create audit partitions beyond 2026 — **urgent**

`audit.logs` has partitions for 2026 only, with no `DEFAULT`. From 2027-01-01 every audited
write fails and takes the originating transaction with it —
[[../01-planning/bugs|BUG-005]].

Minimum safe step:

```sql
CREATE TABLE audit.logs_default PARTITION OF audit.logs DEFAULT;
```

Then create dated partitions for 2027 and schedule ongoing creation. `pg_cron` is already
installed but nothing is scheduled — `TODO-007`.

### 4. Consider scheduling the matview refresh

`ai_metadata.v_trending_topics` is a materialized view holding whatever data it had at creation.
It is uniquely indexed on `(tag, source)` specifically so it can be refreshed concurrently, and
the intended schedule (`0 */6 * * *`) is written in a SQL comment but never executed.

## Verify

```sql
-- 9 schemas
SELECT nspname FROM pg_namespace
 WHERE nspname IN ('users','events','payments','forum','social',
                   'ai_metadata','content','audit','notifications');

-- 4 procedures
SELECT proname FROM pg_proc WHERE prokind = 'p';

-- 12 audit partitions (+ default, if created)
SELECT relname FROM pg_class WHERE relname LIKE 'logs_%';

-- seed data present
SELECT role_name FROM users.roles;
```

Then, from the application side:

```bash
curl http://localhost:4000/health   # expects db: "connected"
```

## Notes on RLS

The schema enables RLS on five tables and creates five policies. They are **inert** as deployed:
they depend on `app.current_user_id` / `app.current_role` session settings that the backend never
sets, and the connecting role is an owner that bypasses RLS anyway. Do not treat enabling RLS as
having enforced anything — [[../01-planning/bugs|BUG-004]].
