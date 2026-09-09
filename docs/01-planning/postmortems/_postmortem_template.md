# Postmortem — <short incident name>

**Date of incident:** YYYY-MM-DD
**Author:** <name>
**Status:** draft · final

> Copy this file to `YYYY-MM-DD-<slug>.md` in this folder. Postmortems are blameless: describe
> what the system allowed to happen, not who typed the command.

## What happened

Two or three sentences, in plain language, that someone who was not there can follow. State the
failure, not the fix.

## Impact

Who was affected, how, and **for how long**. Be specific — "registrations failed for all users
between 14:05 and 15:40 PKT (95 minutes)" is useful; "some users saw errors" is not.

If money or data was involved, say exactly what: how many transactions, whether any were lost,
whether anyone was charged incorrectly.

| | |
|---|---|
| Users affected | |
| Duration | |
| Data lost | |
| Money involved | |
| Detected by | (a person? a user report? nothing — found later?) |

## Timeline

All times in one timezone, stated. Include the gap between when it started and when anyone
noticed — that gap is usually the most actionable finding in the whole document.

| Time | Event |
|---|---|
| | |

## Root cause

Why the system permitted this. Keep asking "and why was that possible?" until the answer is a
property of the system rather than a property of a person.

Note any contributing factors that were not the root cause but made it worse or slower to
resolve — missing alerting, an unrehearsed procedure, a misleading error message.

## What went well

Genuinely. If detection was fast, or a guard rail limited the blast radius, record it — those
are the things worth protecting when the system changes.

## What we are changing

Each item gets a `TODO-NNN` row in [[../TODO|TODO]]. An action item without an ID is a wish.

| Change | TODO |
|---|---|
| | |

Prefer changes that remove the possibility of the failure over changes that ask people to be
more careful.

## Related

- Closed defect in [[../bugs|bugs]]: `BUG-NNN`
- ADR this reinforced or invalidated: [[../../04-decisions/_Decisions_Index|Decisions]]
- Session entry in [`../../../handoff.md`](../../../handoff.md)

---

> [!note] No postmortem has been written for this project yet
> This template is unused. The project has no incident response process — `TODO-028`. If you
> are reading this because something just broke, this file is the right place to start.
