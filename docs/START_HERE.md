# START HERE

Orientation for humans. If you are an AI agent, read [[AI_CONTEXT]] instead.

This is the documentation vault for the **GDGOC-UITU Community Platform**. Open it in Obsidian
with **Open folder as vault** → select `<repo>/docs` (**not** the repo root).

---

## The directory

```text
docs/
├─ START_HERE.md               ← you are here (humans)
├─ AI_CONTEXT.md               ← AI entry point + task routing
├─ 00-core/                    ← what is true NOW (rewritten in place)
├─ 01-planning/                ← TODO ledger, bugs, doc roadmap, postmortems
├─ 02-prompts/                 ← reusable AI task prompts
├─ 03-research/                ← options considered, no commitment
├─ 04-decisions/               ← ADRs: what was chosen and why
├─ 05-features/                ← one folder per feature, 7 files each, deep
├─ 06-ideas/                   ← uncommitted thoughts; explicitly NOT a plan
├─ 07-build-docs/              ← frozen original course specs (PRD/SRD/AFD/DSD/UI plan)
└─ 08-ops/                     ← runbooks: how to deploy and operate it

../handoff.md                  ← repo ROOT, outside the vault. Append-only session log.
```

---

## The one distinction that matters

**The vault is current. Build docs are frozen.**

`00-core/` is rewritten in place and always describes the system as it is today. If it is
wrong, fix it — do not add a dated note beside the error.

`07-build-docs/` holds the original course specification documents (PRD, SRD, AFD, DB Schema,
UI Development Plan). They are **historical**. They record what was intended in Feb–Mar 2026.
Parts of the system diverged from them during the build. Do not edit them to match reality —
that destroys their value as a record of intent.

---

## Where to look

| I need… | Go to |
|---|---|
| To understand the system quickly | [[00-core/Architecture]] |
| The database tables and procedures | [[00-core/Database]] |
| An endpoint's exact path and response shape | [[00-core/api]] |
| To know if something is a security risk | [[00-core/Security]] |
| To deploy, or fix a broken deploy | [[08-ops/_Ops_Index\|08-ops]] and [[00-core/Deployment]] |
| To know why we chose X over Y | [[04-decisions/_Decisions_Index\|04-decisions]] |
| Everything about one feature, in depth | [[05-features/_Features_Index\|05-features]] |
| To know what is broken right now | [[01-planning/bugs]] |
| To know what happened last session | [`../handoff.md`](../handoff.md) |
| To record a thought I am not committing to | [[06-ideas/_Ideas_Index\|06-ideas]] |

---

## Folder by folder

| Folder | What it holds | Can I trust it? |
|---|---|---|
| `00-core/` | Current-state reference for the whole system, shallow | **Yes** — verified against the code on 2026-09-09 — but several files are partly unwritten; see the gaps table below |
| `01-planning/` | `TODO-NNN` ledger, `BUG-NNN` defects, doc roadmap, postmortems | **Yes** for what is listed; the list is not exhaustive of all work remaining |
| `02-prompts/` | Reusable AI task prompts | **Yes** — but prompts go stale as the codebase moves; re-read the code they reference |
| `03-research/` | Options that were weighed | **As history only.** A research note is a menu, not a commitment |
| `04-decisions/` | ADRs | **Partly.** Several decisions are live in production but written up as template-only stubs — see the index's two status columns |
| `05-features/` | Deep per-feature documentation | **Yes for event registration + payment only.** That is the only feature with a folder |
| `06-ideas/` | Uncommitted ideas, including dropped ones | **Not a plan.** Nothing here is scheduled or agreed |
| `07-build-docs/` | Frozen course specs | **As intent, not as current state.** Written Feb–Mar 2026; the build diverged |
| `08-ops/` | Deploy and operate runbooks | **Partly** — the backend hosting target is unverified; see [[00-core/Deployment]] |

---

## Why these are separate

- `03-research` is a **menu**; `04-decisions` is the **order that was placed**.
- `04-decisions` says *why* X; `05-features` says *what X actually does*.
- `00-core` is the whole system, shallow; `05-features` is one feature, deep.
- `00-core/Deployment.md` says *what is deployed*; `08-ops` says *how to deploy it*.
- `01-planning` implies someone intends to do it; `06-ideas` explicitly does not.

---

## What's out of date

| Document | Status | Note |
|---|---|---|
| [[00-core/Architecture]] | ✅ | Verified against code 2026-09-09 |
| [[00-core/Database]] | ✅ | Verified against `GDGOC_UITU_schema.sql` v1.3 |
| [[00-core/api]] | ✅ | Full route inventory verified against `backend/src/routes/` |
| [[00-core/Security]] | ⚠️ | Structure complete; several sections are `TODO` pending a fresh audit |
| [[00-core/requirements]] | ⚠️ | Derived from shipped behaviour, not from a signed-off requirements process |
| [[00-core/ErrorHandling]] | ✅ | Verified; documents real gaps (no idempotency, no retries) |
| [[00-core/Testing_Strategy]] | ⚠️ | Accurate, but describes an absence — there are no tests |
| [[00-core/Deployment]] | ⚠️ | Frontend target verified; backend hosting unverified |
| [[00-core/Glossary]] | ✅ | — |
| `ProjectDocs/Security.md` (outside vault) | ⚠️ | **Partly stale.** Its ❌ entries for helmet and rate limiting were fixed on 2026-06-14 and are now live. Superseded by [[00-core/Security]] |
| `ProjectDocs/Performance.md` (outside vault) | ⚠️ | Audited 2026-06-14; not re-verified since |

---

## Vault gaps

> [!important] An empty section means "not written down", never "not decided".
> Every gap below has a `TODO-NNN` row in [[01-planning/TODO]]. If you fill one in, close
> its row in the same commit.

| File | Gap |
|---|---|
| [[00-core/Security]] | Sections 12–14 (WebSocket, background job, file upload beyond basics), 19–24 (SSRF, IDOR/BOLA, webhook replay, credential stuffing, abuse/spam) and 26–30 (monitoring, alerting, backup/recovery, incident response, security testing) are `TODO` — no monitoring or alerting exists to describe |
| [[00-core/requirements]] | Non-functional targets are unverified — no load testing was ever run, so the numbers are design intent from the frozen PRD, not measurements |
| [[00-core/Deployment]] | Backend hosting provider, domain, and TLS termination are unverified from the repo |
| [[00-core/Testing_Strategy]] | Quality gates are aspirational; no gate is currently enforced anywhere |
| [[04-decisions/_Decisions_Index\|04-decisions]] | ADR-004 and ADR-005 are template-only stubs for decisions that are already live in production |
| [[05-features/_Features_Index\|05-features]] | Only one of ~7 shipped features has a PSP folder |
| `08-ops/` | Rollback and incident runbooks are stubs — no rollback has ever been rehearsed |

---

## Two things to know before you edit

**1. Qualify the word "Phase."**

> [!warning] "Phase 5" is ambiguous in this repository
> **Build phases** are the delivery milestones in the git history (`Phase 5 Completed:
> Added Forum Screens`). They ran Mar–Jun 2026 and are done.
> **Doc phases** are [[01-planning/Phases]] — the roadmap for populating this vault.
> Always write "build Phase 5" or "doc Phase 5".

**2. When two documents disagree, this is the order of authority:**

```text
running code  >  00-core  >  newest build doc  >  older build doc
```

The code is the only thing that actually runs. A document is a claim about the code.

---

## Editing rules

| Situation | Do this |
|---|---|
| System state changed | Update `00-core` **and** append to [`../handoff.md`](../handoff.md). Both, same session |
| You made a real technical decision | Write the ADR **before** implementing, not after |
| You had an idea you are not committing to | [[06-ideas/_Ideas_Index\|06-ideas]] — not TODO, not an ADR |
| You found a bug in shipped code | [[01-planning/bugs]] with a `BUG-NNN` ID |
| A doc is superseded by a newer one | Add the superseded banner to the old doc **in the same commit** as the new one |
| You are materially changing a design doc | Create a `_v2` rather than editing in place |
| You are touching [`../handoff.md`](../handoff.md) | **Append only.** Never rewrite or condense past entries |
| You cannot verify a value from the code | Write `TODO` and file a `TODO-NNN`. Never write a plausible guess |

---

## Using Obsidian

Install Obsidian → **Open folder as vault** → select `<repo>/docs` → trust the vault. Only
built-in core plugins are enabled; there are no community plugins to install.

**Tracked** (shared with the team, committed to git):

- `.obsidian/app.json` — link behaviour
- `.obsidian/core-plugins.json` — which built-in plugins are on
- `.obsidian/templates.json` — template folder
- `.obsidian/appearance.json`

**Gitignored** (per-viewer UI state Obsidian rewrites just from opening the vault):

- `.obsidian/workspace.json`
- `.obsidian/workspace-mobile.json`
- `.obsidian/graph.json`

If you see those three appear in `git status`, the ignore rules are not being applied — check
the repo root `.gitignore`.
