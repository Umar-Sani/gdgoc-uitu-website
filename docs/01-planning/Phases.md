# Documentation Phases

> [!warning] These are documentation phases, not delivery phases
> The **build phases** named in this repository's git history — `Phase 2 Completed`,
> `Phase 5 Completed: Added Forum Screens`, `Phase 8 Completed: Added 6 Public Screens` — are
> delivery milestones from Mar–Jun 2026. They are **finished** and unrelated to the numbering
> below.
>
> The phases on this page track the effort to populate *this vault*. Always qualify:
> write "build Phase 5" or "doc Phase 5", never a bare "Phase 5".

Current position: **doc Phase 1 complete, doc Phase 2 partially complete.**

---

## Phase 0 — Documentation Foundation ✅

**Objective.** Establish the vault structure, entry points, and conventions so later work has
somewhere to go.

- [x] Folder skeleton with numbered directories
- [x] `START_HERE.md` (human entry) and `AI_CONTEXT.md` (AI entry + routing)
- [x] Precedence rule and the two-systems distinction stated in both
- [x] Obsidian config committed; per-viewer state gitignored
- [x] `handoff.md` created at the repo root

**Exit criteria.** A newcomer can open the vault and know where to put a new note. ✅

---

## Phase 1 — Current-State Capture ✅

**Objective.** Document what is true now, verified against the code rather than from memory.

- [x] `00-core/Architecture.md` — verified against both apps
- [x] `00-core/Database.md` — verified against schema v1.3
- [x] `00-core/api.md` — full route inventory from `backend/src/routes/`
- [x] `00-core/Security.md` — 31-section checklist
- [x] `00-core/ErrorHandling.md`, `Testing_Strategy.md`, `Deployment.md`, `requirements.md`,
      `Glossary.md`
- [x] Every gap recorded as a `TODO-NNN` row rather than silently omitted

**Exit criteria.** Every `00-core` file exists, and each is either complete or explicitly marked
with its gaps. ✅

---

## Phase 2 — Decisions and Features ⏳

**Objective.** Explain *why* the system is shaped as it is, and document features in depth.

- [x] ADR template and decisions index with independent "written up" / "live" columns
- [x] ADR-001, ADR-002, ADR-003 written in full
- [ ] ADR-004 and ADR-005 backfilled from stubs — `TODO-039`
- [x] First PSP feature folder: event registration and payment
- [ ] PSP folders for the remaining six shipped features — `TODO-040`

**Exit criteria.** Every live architectural decision has a real ADR, and every shipped feature
has at least an OST and FST.

---

## Phase 3 — Operational Readiness ⬜

**Objective.** Make the system operable by someone who did not build it.

- [ ] Verify and document the backend hosting target — `TODO-036`
- [ ] Write real deploy and rollback runbooks in `08-ops` — `TODO-037`, `TODO-041`
- [ ] Restore-test a Supabase backup and document the procedure — `TODO-027`
- [ ] Define an incident response process and severity scale — `TODO-028`

**Exit criteria.** A teammate can deploy, roll back, and restore without asking anyone.

---

## Phase 4 — Verification ⬜

**Objective.** Replace claims with evidence.

- [ ] First automated tests, starting with the five cases in [[../00-core/Testing_Strategy]]
- [ ] CI running `tsc --noEmit` on both apps per PR — `TODO-034`
- [ ] Measure the non-functional targets currently asserted as intent — `TODO-030`

**Exit criteria.** No number in [[../00-core/requirements]] is unmeasured, and a gate blocks a
red PR.

---

## Phases 5–14 — Reserved ⬜

Deliberately unallocated. This project is a two-person coursework-origin codebase; inventing
ten more phases would be documentation theatre. Renumber or collapse these when there is real
work to hang on them.

---

## Phase 15 — Maintenance ⬜

**Objective.** Keep the vault true after the initial push.

- [ ] Every session performs the dual write (`handoff.md` **and** the vault)
- [ ] `00-core` re-verified against the code each time a feature lands
- [ ] `TODO-NNN` rows closed in the commit that closes them, never batch-swept
- [ ] Superseded documents get their banner in the same commit as their replacement

**Exit criteria.** Never "complete" — this is the steady state. The signal that it is working:
`handoff.md` and `00-core` never contradict each other.
