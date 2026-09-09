# Build Docs Index

**Frozen historical specifications.** These record what was *intended* in Feb–Mar 2026. They are
not current-state documentation and must not be edited to match reality — that would destroy
their value as a record of intent.

For what is true now, see [[../00-core/Architecture|00-core]].

## The documents

All six live in `ProjectDocs/` at the repo root, as `.docx` files:

| Document | File | Records |
|---|---|---|
| PRD v1.0 | `GDGOC_UITU_PRD.docx` | Product requirements, problem statement, goals, success metrics, academic objectives |
| SRD v1.0 | `GDGOC_UITU_SRD.docx` | Software requirements, functional and non-functional |
| AFD v1.0 | `GDGOC_UITU_AFD.docx` | Application flow — screen-by-screen user journeys with system actions |
| DSD v1.0 | `GDGOC_UITU_DB_Schema.docx` | Database schema document, table by table |
| Build Guide v1.0 | `GDGOC_UITU_Build_Guide.docx` | Zero-to-production implementation guide, written for two developers plus AI assistance |
| UI Dev Plan v1.0 | `GDGOC_UITU_UI_Dev_Plan.docx` | MVP screen catalogue and build order |

Companion files in the same folder: `GDGOC_UITU_schema.sql` (the authoritative schema, still
live — **not** frozen), the two migration files, and the markdown `Security.md`,
`Performance.md`, `GDGOC_UITU_ERD.md`, `GDGOC_UITU_ERD_Mermaid.md`,
`GDGOC_UITU_Project_Summary.md`, `PLAN-forum-upgrade.md`.

> [!warning] `ProjectDocs/` is not in git
> It is excluded via `.git/info/exclude` — a **local-only** ignore file that is not shared by
> cloning. A teammate cloning this repository receives none of these documents. See `TODO-045`.
> This is also why they are referenced here rather than copied in.

## Where they diverged from reality

The most useful thing this folder can tell you is where intent and outcome parted. Each is
detailed in [[../00-core/Deployment|Deployment]] under "Deployed topology vs. designed
architecture":

| Intended | Actual |
|---|---|
| Backend deployed to Railway | Unverified — no deploy config exists anywhere in the repo |
| Row Level Security enforcing per-user access | Policies exist but are inert (`BUG-004`) |
| Audit log capturing who changed what | Actor is always NULL (`BUG-003`) |
| Forum moderation via `moderate_forum_content` | Procedure never called, and cannot run as written (`BUG-002`) |
| `pg_cron` refreshing the trending-topics view | Extension installed, nothing scheduled |
| Password hashing with bcrypt in `users.users` | Column vestigial; Supabase Auth owns credentials |
| PKR-denominated ticketing | Stored as PKR, charged as USD (`BUG-001`) |

The build phases named in the git history — `Phase 2 Completed` through `Phase 8 Completed` —
correspond to this plan's delivery milestones.

> [!warning] "Phase" is ambiguous in this repository
> Those are **build phases**, and they are finished. [[../01-planning/Phases|01-planning/Phases]]
> holds **doc phases**, which are unrelated. Always qualify.

## Should these be copied into the vault?

Open question, tracked as `TODO-044`. Arguments both ways:

- **For:** they are invisible to teammates today, and `.docx` is not searchable in Obsidian or
  greppable from the terminal.
- **Against:** they are frozen submission artefacts; converting them creates a second copy that
  can drift from the original, and the originals are what was submitted for the course.

## Maintenance rule

**Do not edit these.** If one becomes materially wrong, add a superseded banner to it naming
exactly which sections are stale and whether the old behaviour still runs — in the same commit
as whatever supersedes it. Never silently correct a frozen document.
