# ADR-001 — Split Data Access Path

> [!note] Written retroactively on 2026-09-09
> This decision was made during the build (Mar 2026) and is reconstructed from the code and the
> frozen Build Guide. The reasoning below is inferred from the implementation, not recorded at
> the time.

## Decision

The frontend reads simple public data directly from Supabase via its SDK, and routes anything
involving a stored procedure, a payment, or a file upload through the Express API.

## Alternatives

| Option | Summary |
|---|---|
| Everything through Express | One code path, one place to enforce rules. More endpoints to write, and Express becomes a pass-through for reads that Supabase already serves. |
| Everything through Supabase | No custom backend at all. Requires RLS to carry the entire authorization burden, and leaves nowhere to hold secrets (Stripe, Cloudinary) or call stored procedures with elevated rights. |
| **Split by operation type** | Direct SDK reads for public data; Express for anything privileged or transactional. |

## Selected

The split.

## Why

The deciding constraint is that some operations **cannot** safely run in the browser. Stripe's
secret key, Cloudinary's API secret, and the Supabase service-role key all have to live
server-side, and the two invariants that matter — no overbooking, no double-settlement — need
`SERIALIZABLE` transactions calling stored procedures. None of that is expressible from a
browser SDK.

At the same time, writing an Express endpoint to proxy `SELECT * FROM events WHERE status =
'published'` adds a hop and a maintenance burden for no gain, when Supabase already exposes that
safely.

The rule that emerged is stated in the Build Guide and holds in the code: *if it is a simple
`SELECT`, use the SDK; if it involves a stored procedure, payment, or upload, go through
Express.*

## Cost

Two client libraries and two mental models for "how do I get data". A developer must know which
path a given operation belongs to, and the answer is not enforced by anything — it is a
convention. In practice the boundary has held.

The larger cost is that authorization logic exists in two places: RLS policies for the SDK path,
and `requireRole` guards for the Express path. Because RLS turned out to be inert
([[../01-planning/bugs|BUG-004]]), the SDK path is currently protected only by Supabase's anon
key permissions — which is why only genuinely public data goes that way.

## Migration Cost

None — greenfield.

## Security Impact

**Positive:** secrets stay server-side; privileged operations are guarded and auditable.

**Negative:** two authorization surfaces to keep correct, and one of them (RLS) is not currently
doing its job. The split is only safe while the SDK path is restricted to data that is genuinely
public. Adding a private read to the SDK path without working RLS would be a data exposure.

## Performance Impact

**Unmeasured.** Direct SDK reads avoid an Express hop, which should help public pages. No
benchmark exists — see `TODO-030`.

## Vendor Lock-in

**Medium.** The SDK read path is Supabase-specific and would need rewriting against any other
provider. The Express path is portable — it is standard `pg` and would move to any PostgreSQL.
Roughly: the frontend's direct-read call sites and all auth handling are locked in; the backend
is not.

## Reversal Plan

**Trigger.** Moving off Supabase, or needing private data on the read path while RLS remains
inert.

**Difficulty.** Moderate. Collapsing to "everything through Express" means writing read
endpoints for the SDK call sites and replacing Supabase Auth — the auth replacement is the hard
part, not the reads. No data migration is involved.

## Sources

- `frontend/lib/supabase.ts`, `frontend/context/MemberDataContext.tsx`
- `backend/src/routes/`, `backend/src/db/client.ts`
- The frozen Build Guide's data-flow diagram

## Date

Decided ~2026-03 (unrecorded). Written up 2026-09-09.
