# AI_CONTEXT

## Purpose

AI reads this first. Do not read the entire vault by default. Follow only links relevant to
the current task.

This vault documents the **GDGOC-UITU Community Platform** — a Next.js + Express + Supabase
PostgreSQL monorepo built for the Database Systems course at UIT University, Karachi, and
engineered beyond coursework scope (RBAC, Stripe payments, a forum, a CMS, audit logging).

---

## How To Use This Map

1. Read the task. Decide which **one or two** documents in the routing table below actually
   bear on it. Open those.
2. Check [[01-planning/TODO|TODO]] for an existing `TODO-NNN` covering the work. If one exists,
   use its ID; do not open a parallel thread of work.
3. If the task involves a real technical decision, check [[04-decisions/_Decisions_Index|Decisions]]
   before implementing — the decision may already exist, or need an ADR written first.
4. Read the actual code before trusting any document. The precedence rule below is not
   decorative: this vault is partially populated and several sections are unwritten.
5. Make the change. Add or update tests where the project has them (see
   [[00-core/Testing_Strategy]] — currently the project has none).
6. At end of session, perform the **dual write** described under Documentation Rules, so that
   documentation and implementation stay traceable.

---

## Task Routing

| If the task is about… | Read |
|---|---|
| Overall system shape, request flow, components | [[00-core/Architecture]] |
| Tables, schemas, procedures, triggers, indexes | [[00-core/Database]] |
| Endpoint paths, request/response shapes, status codes | [[00-core/api]] |
| Auth, roles, RLS, threats, secrets | [[00-core/Security]] |
| What the system must do, and its constraints | [[00-core/requirements]] |
| Error envelopes, retries, idempotency, failure modes | [[00-core/ErrorHandling]] |
| Tests, coverage, quality gates | [[00-core/Testing_Strategy]] |
| What is deployed, where, and how releases happen | [[00-core/Deployment]] |
| Image optimization rules, or other standing performance rules | [[00-core/Performance]] |
| Domain vocabulary and abbreviations | [[00-core/Glossary]] |
| A defect in shipped code | [[01-planning/bugs]] |
| Outstanding work and gap traceability | [[01-planning/TODO]] |
| Documentation effort roadmap | [[01-planning/Phases]] |
| Reusable AI task prompts | [[02-prompts/Prompts]] |
| Options considered, with no commitment | [[03-research/_Research_Index\|Research]] |
| Why a choice was made | [[04-decisions/_Decisions_Index\|Decisions]] |
| What one feature actually does, in depth | [[05-features/_Features_Index\|Features]] |
| A half-formed thought with no commitment to build | [[06-ideas/_Ideas_Index\|Ideas]] |
| What happened in past sessions, and when | [`../handoff.md`](../handoff.md) |
| The original frozen course specifications | [[07-build-docs/_Build_Docs_Index\|Build Docs]] |
| How to deploy or operate the system | [[08-ops/_Ops_Index\|Ops]] |
| Human orientation to this directory | [[START_HERE]] |

---

## Two Documentation Systems

This repository runs two documentation systems at once. Neither replaces the other.

| | Vault (`docs/00-core` … `06-ideas`) | Build docs & log (`07-build-docs`, `08-ops`, `handoff.md`) |
|---|---|---|
| **Files** | `00-core/*`, `04-decisions/*`, `05-features/*` | `07-build-docs/*` (frozen PRD/SRD/AFD/DSD/UI plan), `08-ops/*`, `../handoff.md` |
| **Answers** | "What is true about the system now?" | "What are we building, and what happened?" |
| **Shape** | Rewritten in place; always reflects current state | Append-only or frozen; reflects a moment in time |
| **Authority** | Authoritative for current behaviour | Authoritative for intent, history, and operating procedure |

**Precedence when they contradict:**

```text
running code  >  00-core  >  newest build doc  >  older build doc
```

---

## Ambiguous vocabulary in this project

> [!warning] Two numbering systems collide in this repository
> **"Phase"** means two unrelated things here.
>
> - **Build phases** — the delivery milestones in the git history and the frozen course
>   Build Guide. Commits literally read `Phase 2 Completed`, `Phase 5 Completed`,
>   `Phase 8 Completed`. These ran Mar–Jun 2026 and are **finished**.
> - **Documentation phases** — [[01-planning/Phases]], the roadmap for populating *this vault*.
>   Phase 0 there is "Documentation Foundation", not a delivery milestone.
>
> Always qualify: write **"build Phase 5"** or **"doc Phase 5"**. Never bare "Phase 5".

> [!warning] Two "team" concepts, and two near-identical API paths
> `content.team_members` (individual people on the chapter team) and `content.teams`
> (named groups) are different tables, and the API exposes **both** `/api/cms/team` and
> `/api/cms/teams`. They are not a typo for each other. See [[00-core/api]].

> [!warning] Two payment-status enums that do not share values
> `events.payment_status_enum` uses `completed`/`failed`; `payments.transaction_status_enum`
> uses `success`/`failed`. A registration is `completed`; a transaction is `success`.
> See [[00-core/Database]].

> [!note] `TODO-NNN` is not a GitHub issue
> This project uses GitHub PRs but has no issue tracker in use. `TODO-NNN` IDs live only in
> [[01-planning/TODO]] and are unrelated to PR numbers.

---

## Current Project State

- **Shipped and working:** public site (landing, about, contact, events, forum, public
  profiles), email/password + Google OAuth auth, event registration, Stripe hosted checkout,
  a member dashboard, a full admin panel with CMS, in-app + email notifications, and audit
  logging. 75 commits, Mar 7 – Jun 17 2026, across `main` / `dev` / feature branches.
- **Deployed:** frontend on Vercel; database on Supabase. The backend's actual hosting is
  **unverified from the repository** — there is no Dockerfile, CI config, or deploy manifest.
  See [[00-core/Deployment]].
- **Documented in full:** one feature — [[05-features/event-registration-and-payment/OST|event
  registration and payment]]. Every other shipped feature is covered only by the shallow
  `00-core` layer.
- **No automated tests exist anywhere in this repository**, and no CI pipeline. See
  [[00-core/Testing_Strategy]].
- **This vault is partially populated.** Several sections are deliberately unwritten and are
  listed as gaps in [[START_HERE]] with `TODO-NNN` rows in [[01-planning/TODO]]. An empty
  section means "not written down", never "not decided".

---

## Documentation Rules

### AI behaviour

Do not read the whole vault. Do not duplicate source code into documentation. Do not invent
values — if a number, path, or key format cannot be verified in the code, write `TODO` and
file a row in [[01-planning/TODO]].

### Decisions

Add an ADR the moment a decision is made — **before** implementing it, not after. Use
[[04-decisions/_ADR_Template|the ADR template]]. A decision that is live in production but
unwritten is still a gap; see the `Written up?` / `Decision live?` columns in
[[04-decisions/_Decisions_Index|the decisions index]].

### Ideas vs. decisions

If it is not committed to, it belongs in [[06-ideas/_Ideas_Index|06-ideas]] — not in an ADR,
not in a feature folder, not in `TODO.md`. All three of those imply intent to build.

### End-of-session dual write

Every session **must** do both of the following before it ends:

1. **Append** an entry to [`../handoff.md`](../handoff.md) — what was done, dated.
2. **Update the vault in place** if system state changed, and add a `TODO-NNN` row in
   [[01-planning/TODO]] for traceability.

Doing only (1) is the most common failure mode; it leaves the vault silently wrong.

### When the two disagree

The vault wins for "what is true now"; `handoff.md` wins for "what happened and when".
A contradiction means an earlier session skipped step 2 — fix the vault and note the
correction in the current handoff entry.

### Traceability

```text
Idea (06-ideas, optional) → Research → Decision/ADR → Architecture/Database/Security
→ TODO → Implementation → Tests → Verification → handoff.md session entry
```

---

## Important Rule

This vault is a map of the project, not a copy of it. Do not duplicate source code inside
documentation without a specific documentation reason.
