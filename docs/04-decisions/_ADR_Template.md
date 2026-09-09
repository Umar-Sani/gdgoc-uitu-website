# ADR-NNN — <Topic>

> Copy to `ADR-NNN-<Topic>.md`. Write it **before** implementing, not after. Add the row to
> [[_Decisions_Index]] in the same commit.

## Decision

One sentence. What was decided, in the active voice. If it takes a paragraph, the decision is
not yet made.

## Alternatives

What else was genuinely on the table. Include the option of doing nothing. An ADR listing one
alternative is usually a rationalisation rather than a decision record.

| Option | Summary |
|---|---|
| | |

## Selected

Which option, stated plainly.

## Why

The reasoning that actually drove the choice — including the constraints that were not
technical (time, coursework deadline, what the team already knew, what the free tier allowed).
Those constraints are the first thing a future reader will fail to reconstruct.

## Cost

What this costs to run and to live with: money, latency, operational burden, complexity a
future maintainer must hold in their head.

## Migration Cost

What it took to get here from the previous state. If it was greenfield, say so.

## Security Impact

What this makes safer, and what it makes riskier. "None" is a valid answer only if you have
thought about it.

## Performance Impact

Measured where possible. If unmeasured, say **unmeasured** — do not estimate and then let the
estimate harden into a fact.

## Vendor Lock-in

**None · Low · Medium · High** — with reasoning. The reasoning matters more than the label:
name what specifically would have to be rewritten, and roughly how much of it there is.

## Reversal Plan

Two parts:

1. **What would trigger reconsidering this.** A concrete signal, not "if it becomes a problem".
2. **How hard it is to reverse.** What would have to change, and whether data migration is
   involved.

## Sources

Links, benchmarks, documentation, or the conversation this came out of.

## Date

YYYY-MM-DD
