# TODO

Traceability ledger. Every gap left behind in this vault has a row here.

> [!note] `TODO-NNN` is not a ticket in any external system
> This project uses GitHub pull requests but **no issue tracker**. `TODO-NNN` IDs exist only in
> this file and are unrelated to PR numbers. One may exist without the other, and neither
> implies the other was created.

Status: `open` · `in-progress` · `done` · `wontfix`.

Rows tagged **doc** are documentation gaps in this vault. Rows tagged **code** are engineering
work. Defects in shipped code live in [[bugs]], not here.

| ID | Status | Task | Related |
|---|---|---|---|
| TODO-001 | open | **code** — `shared/types.ts` is vendored twice (root + `frontend/shared/`) with nothing keeping them in sync. Add a sync check or a build step | [[../04-decisions/ADR-005-Vendored-Shared-Types\|ADR-005]] |
| TODO-002 | open | **code** — remove dead dependencies: `jsonwebtoken`, `bcryptjs`, `express-validator` (backend), `webgl-fluid` (frontend) | [[../00-core/Architecture]] |
| TODO-003 | open | **code** — `requireAuth` builds a new Supabase client and makes a network call per request. Memoise the client; consider local JWT verification | [[../00-core/Architecture]] |
| TODO-004 | open | **code** — no `middleware.ts`; all route protection is post-hydration and cosmetic. Add server-side gating | [[../00-core/Security]] |
| TODO-005 | open | **code** — no central API client. `NEXT_PUBLIC_API_URL` is re-declared in 38 files and auth headers hand-written in 27 | [[../00-core/Architecture]] |
| TODO-006 | open | **code** — `pg` pool has no `error` handler and no `statement_timeout` | [[../00-core/Database]] |
| TODO-007 | open | **code** — `pg_cron` installed but nothing scheduled: matview refresh and audit partition creation both unscheduled | [[../00-core/ErrorHandling]] |
| TODO-008 | open | **code** — `users.role_name_enum` is declared but unused; `roles.role_name` is `VARCHAR(50)`. Adopt the enum or drop it | [[../00-core/Database]] |
| TODO-009 | open | **code** — no migration tool. Schema is one big file plus hand-applied ad-hoc migrations | [[../00-core/Deployment]] |
| TODO-010 | open | **doc** — interaction between the `pg` pool (`max: 20`) and Supabase's own connection limits is unverified | [[../00-core/Database]] |
| TODO-011 | open | **code** — no API versioning. A breaking change breaks the deployed frontend immediately | [[../00-core/api]] |
| TODO-012 | open | **code** — validation errors return only the first Zod issue's message and discard the field path | [[../00-core/api]] |
| TODO-013 | open | **code** — mock-auth bypass exists on both sides; frontend switch is a hard-coded constant | [[../00-core/Security]] |
| TODO-014 | open | **code** — no `.env.example` in either app, and no boot-time validation of required secrets | [[../00-core/Deployment]] |
| TODO-015 | open | **code** — `gdgoc_app` role ships with literal password `CHANGE_IN_PRODUCTION` | [[../00-core/Security]] |
| TODO-016 | open | **doc** — encryption-at-rest posture beyond Supabase defaults is undocumented | [[../00-core/Security]] |
| TODO-017 | open | **code** — upload hardening: no magic-byte check, no `?folder=` allow-list, no role guard, no delete path (orphaned Cloudinary assets) | [[../00-core/Security]] |
| TODO-018 | open | **code** — 4 mutating routes have no Zod schema (`events/:id/people*`, forum `pin`/`lock`, `cms/gallery`) | [[../00-core/Security]] |
| TODO-019 | open | **code** — rate limiting is per-IP only; no per-user or per-account limits | [[../00-core/Security]] |
| TODO-020 | open | **code** — `react-markdown` renders forum content with no `rehype-sanitize` | [[../00-core/Security]] |
| TODO-021 | open | **doc** — SSRF not assessed | [[../00-core/Security]] |
| TODO-022 | open | **doc** — IDOR/BOLA not systematically tested across user-scoped endpoints | [[../00-core/Security]] |
| TODO-023 | open | **doc** — credential-stuffing protections delegated to Supabase Auth and undocumented | [[../00-core/Security]] |
| TODO-024 | open | **code** — public writes (contact, newsletter, thread view count) have no captcha; view count is trivially inflatable | [[../00-core/Security]] |
| TODO-025 | open | **code** — no monitoring. `GET /health` exists but nothing polls it | [[../00-core/Security]] |
| TODO-026 | open | **code** — no alerting; silent webhook failures are invisible by construction | [[../00-core/Security]] |
| TODO-027 | open | **code** — Supabase backups never restore-tested; no rehearsed recovery | [[../00-core/Deployment]] |
| TODO-028 | open | **doc** — no incident response process, severity scale, or on-call definition | [[postmortems/_postmortem_template]] |
| TODO-029 | open | **code** — no security testing: no SAST, no dependency scanning, no pen test | [[../00-core/Testing_Strategy]] |
| TODO-030 | open | **doc** — every non-functional target is unmeasured design intent | [[../00-core/requirements]] |
| TODO-031 | open | **doc** — no written acceptance criteria; acceptance was by demonstration | [[../00-core/requirements]] |
| TODO-032 | open | **code** — email sends are fire-and-forget with failures swallowed; no record, no retry | [[../00-core/ErrorHandling]] |
| TODO-033 | open | **code** — no automated tests of any kind. Start with the five highest-value cases listed in the strategy | [[../00-core/Testing_Strategy]] |
| TODO-034 | open | **code** — no CI. Cheapest first gate: GitHub Actions running `tsc --noEmit` on both apps per PR | [[../00-core/Testing_Strategy]] |
| TODO-035 | open | **code** — no staging environment; local development appears to share the production database | [[../00-core/Deployment]] |
| TODO-036 | open | **doc** — backend hosting target cannot be determined from the repository | [[../00-core/Deployment]] |
| TODO-037 | open | **doc** — no rehearsed rollback procedure for backend or database | [[../08-ops/_Ops_Index\|08-ops]] |
| TODO-038 | open | **code** — no release tagging, version number, or changelog | [[../00-core/Deployment]] |
| TODO-039 | open | **doc** — backfill ADR-004 and ADR-005; both are live in production but written as template-only stubs | [[../04-decisions/_Decisions_Index\|Decisions]] |
| TODO-040 | open | **doc** — six shipped features have no PSP folder (forum, notifications, CMS, admin/RBAC, auth, recommendations) | [[../05-features/_Features_Index\|Features]] |
| TODO-041 | open | **doc** — `08-ops` runbooks are stubs; deploy and rollback steps are unverified | [[../08-ops/_Ops_Index\|08-ops]] |
| TODO-042 | open | **code** — `forum.categories` is created and indexed but never seeded by any SQL file | [[../00-core/Database]] |
| TODO-043 | open | **code** — `moderate_forum_content` is never called; forum routes issue direct `UPDATE`s instead | [[bugs]] `BUG-002` |
| TODO-044 | open | **doc** — copy the six frozen course specs into `07-build-docs/` as markdown, or decide to leave them as `.docx` in `ProjectDocs/` | [[../07-build-docs/_Build_Docs_Index\|Build Docs]] |
| TODO-045 | open | **code** — `ProjectDocs/` is excluded via `.git/info/exclude`, a local-only ignore file, so a teammate cloning the repo receives none of the course documents | [[../START_HERE]] |

## Maintenance rule

Add a row here the moment you leave a gap — in the same commit that leaves it. When you close
one, set its status to `done` in the same commit that closes it, and do not renumber anything.
