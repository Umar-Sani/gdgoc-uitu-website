# ADR-004 — Stripe Hosted Checkout

> [!important] Template only — but the decision is live in production
> **What was chosen:** Stripe **hosted** checkout. The backend creates a Checkout Session
> (`stripe.checkout.sessions.create`) and the frontend redirects the browser to Stripe's own
> page via `window.location.href`. No card details ever touch this application, and
> `@stripe/stripe-js` is not used on the client despite being installed.
>
> This file is a stub because the *reasoning* was never written down, not because the decision
> is open. Backfilling it is `TODO-039`.

## Decision

Collect payment through Stripe's hosted Checkout page rather than an embedded card form.

## Alternatives

`TODO` — reconstruct. Plausibly considered: Stripe Elements embedded in the checkout page;
PayFast (a `feat/payfast_integration` branch exists in this repository and was never merged);
manual/offline payment recording.

## Selected

Stripe hosted Checkout.

## Why

`TODO`. The verifiable driver is PCI scope: with hosted checkout the application never receives
card data. The actual deliberation, and why the PayFast branch was abandoned, is unrecorded.

## Cost

`TODO` — Stripe's per-transaction fees for this account are unknown to this document.

Known non-monetary cost: the customer leaves the site for payment, and the return legs
(`/payment-success`, `/payment-failed`) must reconcile state on the way back.

## Migration Cost

None — greenfield. Note the abandoned `feat/payfast_integration` branch, which suggests a
direction that was started and dropped.

## Security Impact

Strongly positive: no card data enters the application, so PCI scope is minimal. The webhook is
signature-verified.

Counterweight: the webhook has no replay protection and returns 200 on database failure —
[[../01-planning/bugs|BUG-010]].

## Performance Impact

`TODO` — unmeasured. A full page redirect to Stripe and back.

## Vendor Lock-in

**Medium.** The integration surface is small — three Stripe API calls and one webhook handler —
so swapping providers is contained. But `payments.gateway_enum` already anticipates
`stripe | manual | simulated`, and PKR is not supported by Stripe, which is the direct cause of
[[../01-planning/bugs|BUG-001]]. A local gateway supporting PKR would remove that whole class of
problem.

## Reversal Plan

**Trigger.** The currency problem in `BUG-001` forcing a decision, or Stripe becoming
unavailable for Pakistani accounts.

**Difficulty.** `TODO` — assess. The blast radius is `backend/src/routes/payments.ts`, the three
frontend return-leg pages, and `payments.transactions.gateway`.

## Sources

- `backend/src/routes/payments.ts`
- `frontend/app/(public)/events/[id]/checkout/page.tsx` and the payment-result pages
- Unmerged branch `feat/payfast_integration`

## Date

Decided ~2026-03 (unrecorded). Stub written 2026-09-09.
