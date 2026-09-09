# Ops Index

Runbooks: **how to deploy and operate** the system. What *is* deployed is in
[[../00-core/Deployment|00-core/Deployment]].

> [!warning] These runbooks are partly unverified
> The backend hosting target could not be determined from the repository, so any backend deploy
> or rollback procedure here would be invented rather than documented. Sections marked `TODO`
> are honest gaps, not omissions. `TODO-036`, `TODO-041`.

| Runbook | Status |
|---|---|
| [[Local_Development]] | ✅ verified from the code |
| [[Database_Setup]] | ✅ verified from the SQL files |
| [[Deploy]] | ⚠️ frontend only; backend unverified |
| [[Rollback]] | ❌ stub — never rehearsed |

## Operational facts worth knowing before an incident

- **There is no monitoring and no alerting.** `GET /health` exists and nothing polls it. You
  will learn about an outage from a user.
- **There is no CI.** Nothing verifies a change before it merges.
- **Local development appears to share the production database** (`TODO-035`). Assume any local
  schema experiment is production-affecting until proven otherwise.
- **Audit logging stops working on 2027-01-01** and will take most writes down with it —
  [[../01-planning/bugs|BUG-005]]. This is the single most important operational item in the
  vault.

## Maintenance rule

A runbook is only true if someone has followed it. When you run one of these end to end, note
the date at the top; when you find a step wrong, fix it in the same session rather than
remembering to later.
