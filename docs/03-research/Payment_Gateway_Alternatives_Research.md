# Payment Gateway Alternatives — Research

**Status:** Open — no decision made
**Opened:** 2026-09-09

> [!note] This is a menu, not an order
> Nothing here is decided. The decision, when made, becomes an ADR and this note stays as the
> record of what was considered.

## Why this is open

[[../01-planning/bugs|BUG-001]]: ticket prices are stored as `PKR` but the Stripe checkout
session is created with `currency: 'usd'` and no conversion, so a ₨2,000 ticket is charged as
$2,000.00. A code comment acknowledges Stripe does not support PKR and defers the problem —
"for demo/sandbox purposes."

Fixing it requires answering a product question first: **what currency should the chapter
actually charge in?** Until that is answered, any code change is guesswork.

## Options

| Option | Summary |
|---|---|
| A — Price events in USD | Accept that pricing is USD-denominated. Change `transactions.currency` and the UI to match. |
| B — Convert PKR → USD at checkout | Keep PKR pricing; apply a rate at session creation and record both amounts. |
| C — Switch to a PKR-native gateway | PayFast or similar. A `feat/payfast_integration` branch already exists, unmerged. |
| D — Manual/offline payment only | Drop online payment; record transactions with `gateway = 'manual'` — the enum already allows it. |
| E — Do nothing | Leave it. Only defensible while no real money moves. |

## What each would cost

**A — Price in USD.** Smallest change: the currency literal is already `usd`, so the fix is
making the stored currency and the displayed price agree. Cost is product-level — Pakistani
students seeing USD prices for a campus event, and Stripe's cross-border fees.

**B — Convert at checkout.** Keeps PKR-native pricing. Needs a rate source, a decision about
staleness, and storing both source and charged amounts on the transaction for reconciliation.
Introduces an external dependency in the payment path. `transactions.metadata` (JSONB) could
hold the rate used.

**C — PKR-native gateway.** Solves the problem at its root and matches the audience. Highest
effort: a new integration, a new webhook, new settlement semantics. But `payments.gateway_enum`
already anticipates multiple gateways, and the abandoned branch suggests this was once the
intended direction. Worth checking what that branch contains before estimating.

**D — Manual only.** Cheapest to make *correct*, since nothing is charged incorrectly. Loses
online payment, which was a stated project goal.

**E — Nothing.** Zero effort, and the defect stays. Only tenable if this is a portfolio artefact
rather than a running platform — an open question in
[[../06-ideas/deferred-and-known-gaps|deferred-and-known-gaps]].

## What is not yet known

- What the abandoned `feat/payfast_integration` branch actually implements. **This should be
  read before comparing options** — it may make C much cheaper than it looks.
- Whether the chapter has ever charged for an event in production, and if so, whether anyone was
  overcharged. That is an incident question, not a design question.
- Whether Stripe supports the chapter's account region for the flows in question.

## Sources

- `backend/src/routes/payments.ts` — the hard-coded `'usd'` and its comment
- `ProjectDocs/GDGOC_UITU_schema.sql` — `payments.gateway_enum` allowing `stripe | manual | simulated`
- Unmerged branch `feat/payfast_integration`

## Next step

Read the PayFast branch, then answer the product question. Only then write the ADR.
