# Runbook — Rollback

> [!warning] This is a stub, and rollback has never been rehearsed
> Nothing below has been tested. A runbook nobody has followed is a hypothesis, and this one is
> written during calm rather than during an incident — which is the right time, but it is not
> the same as knowing it works. `TODO-037`, `TODO-041`.

## Frontend — Vercel ⚠️ plausible, untested

Vercel retains previous deployments. Rolling back means promoting an earlier one from the
project's Deployments view.

**Caveat that matters:** promoting an old frontend does **not** roll back the backend or the
database. If the frontend you are restoring expects an older API shape, and the API has moved,
you have not fixed anything — there is no API versioning to protect you (`TODO-011`).

## Backend — undefined ❌

Cannot be written until the hosting target is known (`TODO-036`). Whatever the host, the
rollback unit is a previous build of `dist/`, and the same coupling caveat applies in reverse.

## Database — no rollback path ❌

This is the serious one.

- Schema changes are applied **by hand** from `GDGOC_UITU_schema.sql` and ad-hoc migration files.
- There are **no down migrations**.
- There is no schema version tracking, so "which state are we in" is answered by inspection.
- Restoring would depend on Supabase's managed backups, which **have never been restore-tested**
  (`TODO-027`).

> [!important] A bad database change is currently not recoverable in any rehearsed way
> This is the largest operational gap in the project. Before any risky schema change, take a
> manual export and confirm you can read it back — do not rely on an untested backup.

## Ordering, if you are rolling back more than one thing

Reverse of deploy: frontend first (fastest, lowest risk), then backend, then database last and
only if genuinely necessary. Additive schema changes usually do **not** need reverting — an
unused column is harmless, and reverting it is riskier than leaving it.

## What to do first in an incident

1. **Establish what changed.** `git log` on `main`, and the Vercel deployment list. With no
   monitoring, the deploy timeline is often the only signal you have.
2. **Check `/health`** — `curl <backend-url>/health` distinguishes "backend down" from
   "database unreachable" from "frontend broken".
3. **Check whether payments are affected.** If so, look for `payments.transactions` rows stuck
   in `pending` — that is the signature of [[../01-planning/bugs|BUG-010]], where a member has
   paid and holds no registration. Nothing alerts on this; you must query for it.
4. **Roll back the smallest thing that could explain it**, then re-verify.
5. **Write a postmortem** — [[../01-planning/postmortems/_postmortem_template|template]]. None
   has ever been written; the first one will be the most valuable document in this folder.

## To make this runbook real

| Step | Tracked as |
|---|---|
| Determine and document the backend host | `TODO-036` |
| Restore-test a Supabase backup into a scratch project | `TODO-027` |
| Rehearse a frontend rollback once, and date this file | `TODO-037` |
| Stand up a staging environment to rehearse against | `TODO-035` |
| Add monitoring so incidents are detected before users report them | `TODO-025`, `TODO-026` |
