# ADR-002 — Delegate Auth Verification to Supabase

> [!note] Written retroactively on 2026-09-09
> Reconstructed from the code. `jsonwebtoken` and `bcryptjs` remain in `backend/package.json`
> but are never imported, which suggests local verification was the original plan and was
> abandoned during the build.

## Decision

The Express API verifies every bearer token by calling `supabase.auth.getUser(token)` rather
than validating the JWT signature locally.

## Alternatives

| Option | Summary |
|---|---|
| Local JWT verification | Verify the signature against Supabase's public key (or shared secret) in process. No network call. Requires key handling and rotation awareness. |
| **Delegate to Supabase** | Call `getUser()` per request. Supabase is authoritative; no key handling. |
| Own the whole auth stack | Issue and verify our own tokens, hash passwords with bcrypt. Maximum control, maximum surface area. |

## Selected

Delegate to Supabase.

## Why

Correctness bought cheaply. Local verification is easy to get subtly wrong — algorithm
confusion, missing `exp`/`aud` checks, key rotation — and this was a two-person coursework build
with no security review. Delegating makes Supabase authoritative for token validity, revocation,
and expiry, and there is no key material in our code to mishandle.

It also means a disabled or deleted Supabase user stops authenticating immediately, with no
token blacklist to maintain.

The residual `jsonwebtoken` and `bcryptjs` dependencies suggest the original plan was to own
this and it was traded away — a reasonable trade for the constraints.

## Cost

**A network round-trip to Supabase on every authenticated request.** This is the real price, and
it is paid on every single guarded call. It also constructs a **new Supabase admin client per
request** rather than memoising one (`TODO-003`).

Consequences: Supabase Auth is on the critical path for all authenticated traffic, its latency
is added to every request, and if it is slow or down the API is effectively down —
`500 Auth service unavailable`. There is no circuit breaker and no cache
([[../00-core/ErrorHandling]]).

## Migration Cost

None — greenfield.

## Security Impact

**Positive, substantially.** No JWT verification code to get wrong, no signing key in our
environment, immediate effect for revoked users, and password handling stays entirely inside
Supabase (`users.users.password_hash` is vestigial).

**Negative:** availability is now a security property — a Supabase outage denies all
authenticated access. And the per-request call makes the mock-auth bypass
([[../00-core/Security]]) more tempting during development, which is how `mock-token` came to
exist.

## Performance Impact

**Unmeasured**, but structurally significant: a full network round-trip per authenticated
request, plus per-request client construction. This is the single clearest performance
improvement available in the backend — memoising the client is trivial; caching verification
results for a few seconds would remove most of the cost.

## Vendor Lock-in

**High.** Auth is the most locked-in part of the system. Replacing Supabase Auth means
replacing: the frontend session handling in `AuthContext`, the OAuth callback flow,
`requireAuth`, and the relationship between `auth.users` and `users.users` — which several
queries join across. Roughly a week of work and a user-migration exercise, not an afternoon.

## Reversal Plan

**Trigger.** Auth latency becoming a measured bottleneck, or a Supabase outage causing
unacceptable downtime.

**Difficulty.** Reversing *this specific decision* (delegation → local verification) is **easy**
and does not require leaving Supabase: verify the JWT locally against Supabase's key and fall
back to `getUser()` only when needed. That captures most of the performance benefit while
keeping Supabase authoritative. Leaving Supabase Auth entirely is the hard version — see
lock-in above.

## Sources

- `backend/src/middleware/auth.ts`
- `frontend/context/AuthContext.tsx`, `frontend/app/auth/callback/page.tsx`
- Unused deps in `backend/package.json`

## Date

Decided ~2026-03 (unrecorded). Written up 2026-09-09.
