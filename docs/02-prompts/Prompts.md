# Prompts

Reusable AI task prompts for this repository. Each assumes the agent has read
[[../AI_CONTEXT|AI_CONTEXT]] first.

> [!note] Prompts go stale
> Every prompt below names specific files, functions, and defects. Re-read what it references
> before trusting it — the code moves, the prompt does not.

---

## Onboard to the codebase

```text
Read docs/AI_CONTEXT.md, then docs/00-core/Architecture.md. Do not read the rest of the vault.

Summarise in under 200 words: the two paths to the database and when each is used, where
authorization is actually enforced, and the three most serious known defects.

Then name one thing in 00-core you could not verify from the code.
```

---

## Add a backend endpoint

```text
Add a <METHOD> <path> endpoint to backend/src/routes/<file>.ts.

Follow the conventions already in that file — do not introduce new patterns:
- Guards in order: requireAuth → requireUsername → requireRole(...) → validate(schema)
- Roles are a FLAT allow-list: requireRole('admin') does NOT admit super_admin. Enumerate
  every acceptable role explicitly.
- Add the Zod schema to backend/src/lib/validate.ts. Note validate() only inspects req.body —
  query and route params are not validated anywhere.
- Respond with { data, error }. On failure: { data: null, error: "<string>" }.
- Paginated lists put total/page/limit as SIBLINGS of data, not inside it.
- Parameterised SQL only ($1, $2). Never interpolate user values.

Then update docs/00-core/api.md with the new route, and add a TODO-NNN row in
docs/01-planning/TODO.md if you leave anything unverified.
```

---

## Change the database schema

```text
Read docs/00-core/Database.md before touching ProjectDocs/GDGOC_UITU_schema.sql.

Constraints specific to this project:
- There is NO migration tool. The schema file is authoritative and idempotent (IF NOT EXISTS).
- Adding a table that should be audited requires a trigger calling audit.log_change('<pk>').
- Adding an index? Check for a name collision first — BUG-006 exists precisely because
  CREATE INDEX IF NOT EXISTS silently no-ops on a duplicate name.
- If your change touches the two payment enums, remember they do not share values: a
  registration is 'completed', a transaction is 'success'.

Update docs/00-core/Database.md in the same commit, and append to handoff.md.
```

---

## Investigate a bug

```text
Read docs/01-planning/bugs.md for BUG-NNN, then read the code it points at.

Do not fix anything yet. Report:
1. Whether the diagnosis in bugs.md is still accurate against current code.
2. A concrete reproduction — exact inputs and expected vs. actual result.
3. The blast radius: what else touches this code path.
4. Whether a test could have caught it, and which of the planned tests in
   docs/00-core/Testing_Strategy.md would be the right home.

If the diagnosis is wrong, say so plainly and correct the entry.
```

---

## Write the first test

```text
This repository has ZERO automated tests and no test framework installed. You are setting up
the first one.

Read docs/00-core/Testing_Strategy.md and
docs/05-features/event-registration-and-payment/Tests.md.

Start with P1: concurrent registration for the last seat. It needs a real PostgreSQL — the
property under test is SERIALIZABLE isolation plus a FOR UPDATE row lock plus a trigger
re-check, none of which survives mocking pg.

Propose the harness before writing it. Then update TODO-033 and TODO-034.
```

---

## Document a shipped feature

```text
Write a PSP folder for <feature> under docs/05-features/<feature-name>/.

Read docs/05-features/_PSP_Template.md for the seven files and their order, and read
docs/05-features/event-registration-and-payment/ as the worked example.

Rules that matter here:
- Verify every claim against the code. If you cannot verify a value, write TODO and file a
  TODO-NNN row. Never write a plausible guess.
- Non-goals in FST.md are mandatory.
- Every failure state in SST.md needs a mitigation — "none, see BUG-NNN" is a valid one.
- Add the row to _Features_Index.md the moment you create the folder, not at the end.
```

---

## End-of-session dual write

```text
Before finishing, do BOTH:

1. Append an entry to handoff.md (repo root). Append only — never rewrite or condense earlier
   entries. Include the date and what changed.

2. If system state changed, update docs/00-core/ in place and add a TODO-NNN row in
   docs/01-planning/TODO.md for traceability.

Doing only (1) is the failure mode this rule exists to prevent: it leaves the vault silently
wrong while looking maintained.
```

---

## Verify the vault against reality

```text
Pick one file in docs/00-core/. Re-verify every factual claim in it against the current code.

Report: claims that are still true, claims that have drifted, and claims you could not verify
either way. Fix the drifted ones in place — 00-core is rewritten, never appended to.

Note the correction in your handoff.md entry. Remember the precedence rule:
running code > 00-core > newest build doc > older build doc.
```

## Maintenance rule

Add a prompt here once you have used it twice. Delete one when the workflow it encodes no longer
exists — a stale prompt is worse than a missing one, because it looks authoritative.
