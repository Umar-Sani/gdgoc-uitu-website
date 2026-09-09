# ADR-005 — Vendored Shared Types

> [!important] Template only — but the decision is live in production
> **What was chosen:** `shared/types.ts` was **copied** into `frontend/shared/types.ts` and the
> `@shared/*` TypeScript path alias repointed from `../shared/*` to `./shared/*`, so the
> frontend builds standalone on Vercel. Commit `72b3eec`, 2026-06-17, with the message
> *"Vercel's frontend-rooted build cannot reach ../shared."*
>
> This file is a stub because the alternatives were never weighed in writing. Backfilling it is
> `TODO-039`.

## Decision

Duplicate the shared type definitions into the frontend rather than making the monorepo root
buildable by Vercel.

## Alternatives

`TODO` — reconstruct. The obvious candidates, none of which is recorded as having been
considered:

| Option | Summary |
|---|---|
| Set Vercel's root directory to the repo root | Build from the monorepo root so `../shared` resolves. |
| npm/pnpm workspaces with `shared` as a package | The conventional monorepo answer. |
| Publish `shared` as a private package | Heavyweight for two consumers. |
| **Vendor the file** | Copy it. Zero configuration, immediate. |
| Generate types from the database schema | Removes the hand-maintained file entirely. |

## Selected

Vendor the file.

## Why

`TODO`. The verifiable driver is the commit message: Vercel's frontend-rooted build could not
reach `../shared`. This landed as the **last commit before the project went quiet**, which
suggests deadline pressure and a preference for the change with the smallest blast radius. That
is a defensible call under time pressure; it is a poor steady state.

## Cost

**Two files that must be edited together, with nothing enforcing it.** They are byte-identical
today apart from a trailing newline. Nothing — no test, no CI, no lint rule — will notice when
they diverge. The backend does not import either copy, so a drift would surface as a frontend
type error at best, or a silent runtime shape mismatch at worst.

Tracked as `TODO-001`.

## Migration Cost

Trivial to apply: one file copy and a one-line `tsconfig.json` change.

## Security Impact

None directly. Indirectly, a drifted `User` or `Transaction` type could let the frontend
mis-handle a field it believes exists — a correctness risk more than a security one.

## Performance Impact

None.

## Vendor Lock-in

**Low, and specifically to Vercel's build model.** The problem being solved exists only because
Vercel builds from a subdirectory. Any host building from the repo root would not need this.

## Reversal Plan

**Trigger.** The two copies drifting even once, or adding a third consumer of the shared types.

**Difficulty.** **Easy** — this is the cheapest reversal in the vault. Either adopt npm
workspaces and make `shared` a real package, or point Vercel's root directory at the repo root
and revert the alias. Delete the vendored copy in the same commit. No data migration, no runtime
behaviour change.

Given how easy the reversal is and how silent the failure mode is, this is a strong candidate to
fix rather than to keep documenting.

## Sources

- Commit `72b3eec` — *"chore: vendor shared types into frontend for standalone Vercel build"*
- `frontend/tsconfig.json` — the `@shared/*` alias
- `shared/types.ts` and `frontend/shared/types.ts`

## Date

Decided 2026-06-17 (commit `72b3eec`). Stub written 2026-09-09.
