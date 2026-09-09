# Ideas Index

The uncommitted space. Nothing here is planned, scheduled, or agreed.

## What belongs here

A half-formed idea needs somewhere to live that is **not** an ADR, a feature folder, or
`TODO.md` — all three of which imply intent to build. This folder is that place.

Dropped ideas stay here, marked `Dropped` with the reasoning, so the same debate is not reopened
in six months by someone who does not know it already happened.

## Not this — put it here instead

| If it is… | It belongs in |
|---|---|
| A decision you have actually made | [[../04-decisions/_Decisions_Index\|04-decisions]] |
| Work someone intends to do | [[../01-planning/TODO\|01-planning/TODO]] |
| A defect in shipped code | [[../01-planning/bugs\|01-planning/bugs]] |
| A description of what already exists | [[../00-core/Architecture\|00-core]] or a feature folder |
| A record of what happened in a session | [`../../handoff.md`](../../handoff.md) |
| Options weighed for a decision now being made | [[../03-research/_Research_Index\|03-research]] |

The distinction that matters most: **`01-planning` implies someone intends to do it;
`06-ideas` explicitly does not.**

## Lifecycle

```text
        capture
           │
           ▼
        ┌──────┐   someone digs in    ┌───────────┐
        │ Raw  │────────────────────▶ │ Exploring │
        └──────┘                      └─────┬─────┘
           │                                │
           │ not now, but not dead          │ decided to build
           ▼                                ▼
        ┌────────┐                   ┌──────────┐
        │ Parked │                   │ Promoted │──▶ ADR / TODO / feature folder
        └────────┘                   └──────────┘
           │
           │ actively rejected
           ▼
        ┌─────────┐
        │ Dropped │  (stays here, with the reasoning)
        └─────────┘
```

Once an idea is `Promoted`, stop editing it. It becomes a pointer to what it turned into.

## Status vocabulary

| Status | Meaning |
|---|---|
| `Raw` | Captured, not thought through. Most notes start and stay here |
| `Exploring` | Someone is actively looking into it. Not a commitment |
| `Promoted` | Became an ADR, a TODO, or a feature. Frozen; links to what it became |
| `Dropped` | Considered and rejected. **Kept**, with the reasoning, to prevent re-litigation |
| `Parked` | Sound idea, wrong time. Names what would need to change |

## Open ideas

| Idea | Status | One line |
|---|---|---|
| [[deferred-and-known-gaps]] | Raw | Everything the codebase and history show was consciously deferred |

## Maintenance rule

Add an idea here the moment it is voiced, before it hardens into an assumption that it is
planned. When one is promoted, set its status, link what it became, and stop editing it — the
note is then a historical record, not a live document.
