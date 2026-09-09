# PSP Template

Every feature folder holds the same seven files:

```text
05-features/<feature-name>/
├─ OST.md        Operational Scenario  — who does what, end to end
├─ FST.md        Feature Specification — what it must do, and its non-goals
├─ SST.md        State Specification   — states, transitions, failure states
├─ LST.md        Logic Specification   — algorithms, formats, edge cases, dependencies
├─ API.md        Endpoints, payloads, status codes, headers
├─ Security.md   Threats this feature faces, and the controls that address them
└─ Tests.md      Coverage, planned tests, and the TODO-NNN IDs they trace to
```

## Documentation order

Write them in this order. Each one supplies the vocabulary the next depends on:

1. **OST** — the scenario, in the user's terms. Establishes the actors and the happy path.
2. **FST** — pin the requirements the scenario implies. **Non-goals are mandatory**; they are
   what stops the next reader from assuming a missing capability is a bug.
3. **SST** — the states behind the flow, the guarded transitions between them, and every
   failure state. **Each failure state needs a mitigation** — write "none, see BUG-NNN" if
   that is the truth.
4. **LST** — the actual algorithms, key formats, and formulas. Real numbers and real names.
5. **API** — the surface, once the behaviour is settled.
6. **Security** — the threats, now that the states and surface are known.
7. **Tests** — what is covered, what is planned, and the `TODO-NNN` IDs each planned test
   traces to.

## Rules

- **Concrete over abstract.** Real endpoint paths, real status codes, real key formats
  (`INV-2026-000042`, not "an invoice identifier"), real class and function names.
- If a value cannot be verified in the code, write `TODO` and file a `TODO-NNN`. Never write a
  plausible guess.
- Link `TODO-NNN` IDs from `Tests.md` so planned coverage is traceable to the ledger.
- Add the folder to [[_Features_Index]] **the moment it is created**, even if all seven files
  are still empty.
