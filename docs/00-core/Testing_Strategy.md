# Testing Strategy

> [!warning] This document describes an absence
> **There are no automated tests in this repository.** Not in `frontend/`, not in `backend/`,
> not at the database layer. No test runner is installed, no test script is defined, and no CI
> pipeline exists. Verified 2026-09-09.
>
> This page is written as a current-state record, not as a plan. The plan is `TODO-033`.

## Test Levels

| Level | Status | Evidence |
|---|---|---|
| Unit | ❌ none | No Jest, Vitest, Mocha, or `*.test.*` / `*.spec.*` files anywhere |
| Integration | ❌ none | No test database, no fixtures, no seeding script for tests |
| End-to-end | ❌ none | No Playwright or Cypress config. `.playwright-mcp/` at the repo root is MCP browser-tool scratch output, **not** a test suite |
| Contract | ❌ none | No schema or contract tests between frontend and backend |
| Load / performance | ❌ none | NFR targets in [[requirements]] are unverified intent |
| Security | ❌ none | Two manual audits (2026-06-14); no SAST or dependency scanning |
| Manual | ⚠️ the actual practice | Features were exercised by hand in the browser before merge |

### What stands in for tests today

- **The type system.** Both apps are TypeScript with `strict: true`. `tsc` is the only
  automated correctness check that runs, and it runs as a side effect of `npm run build`.
- **Database constraints.** A meaningful amount of correctness is enforced by the schema
  rather than by application code — `UNIQUE (event_id, user_id)`, `CHECK` constraints,
  `ON DELETE RESTRICT`, and the seat-capacity re-check in `trg_seat_counter`. These are
  genuine invariants, and they hold whether or not anyone writes a test.
- **Manual verification.** The delivery history shows features being demonstrated and fixed
  in place across build Phases 2–8.

### Highest-value tests to write first

Ranked by the cost of the bug they would have caught, not by ease:

1. **Concurrent registration on the last seat** — the SERIALIZABLE + row-lock + trigger design
   is the most intricate logic in the system and is entirely unverified under concurrency.
2. **Stripe webhook replay** — `BUG-010`; the only guard is a state check in a procedure.
3. **Role guard matrix** — one test per role per protected endpoint would have caught
   `BUG-007` immediately.
4. **Audit partition boundary** — inserting a row dated 2027-01-01 reproduces `BUG-005` in
   one line.
5. **Currency handling on paid registration** — `BUG-001`.

## Quality Gates

> [!important] No gate below is currently enforced anywhere
> There is no CI, no pre-commit hook, no branch protection rule that runs anything. Everything
> in this table is aspirational and is tracked as `TODO-034`.

| Gate | Target | Enforced? |
|---|---|---|
| `tsc` passes in both apps | required | ❌ only incidentally, via `npm run build` |
| `next lint` passes | required | ❌ script exists, nothing runs it |
| Unit tests pass | required | ❌ none exist |
| Coverage threshold | ≥ 60% on `backend/src/routes` and `lib` | ❌ none exist |
| No high-severity dependency advisories | required | ❌ `npm audit` is not run |
| Migration applies cleanly to an empty database | required | ❌ never verified |
| Manual smoke of the payment path before release | required | ⚠️ done informally |

### Suggested first step

The cheapest meaningful gate is a GitHub Actions workflow running `tsc --noEmit` on both apps
for every pull request. That requires no test framework, no fixtures and no database, and it
would catch the class of error the vendored-types drift (`TODO-001`) can produce.
