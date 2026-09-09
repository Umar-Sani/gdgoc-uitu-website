# Requirements

> [!note] These are reconstructed from shipped behaviour
> This project had a formal PRD and SRD written in Feb 2026 (now frozen in
> [[../07-build-docs/_Build_Docs_Index|07-build-docs]]). The requirements below describe what
> the system **actually does** as of 2026-09-09, which is not identical to what those documents
> specified. Where a target is intent rather than measurement, it says so.

## Functional Requirements

### Identity and access

| ID | Requirement | Status |
|---|---|---|
| FR-1 | Users register with email/password or Google OAuth, via Supabase Auth | ✅ |
| FR-2 | A user must set a unique username before posting or registering for events | ✅ enforced by `requireUsername` |
| FR-3 | Four assignable roles: `user`, `editor`, `admin`, `super_admin` | ✅ |
| FR-4 | Only a super_admin may grant super_admin, delete users, or read the audit log | ✅ |
| FR-5 | A disabled account (`is_active = false`) is signed out on next profile fetch | ✅ client-enforced |

### Events

| ID | Requirement | Status |
|---|---|---|
| FR-6 | Admins create, edit and cancel events; cancellation is a soft delete to `status = 'cancelled'` | ✅ |
| FR-7 | Events carry a seat cap; registration must never exceed it under concurrency | ✅ SERIALIZABLE + row lock + trigger re-check |
| FR-8 | A user may register for a given event at most once | ✅ UNIQUE `(event_id, user_id)` |
| FR-9 | Free events register immediately; paid events require completed payment first | ✅ |
| FR-10 | Editors and above may manage the speaker/people list on an event | ✅ |

### Payments

| ID | Requirement | Status |
|---|---|---|
| FR-11 | Paid registration goes through Stripe hosted checkout | ✅ |
| FR-12 | A transaction row is created before checkout and settled by webhook | ✅ |
| FR-13 | Successful payment generates an invoice number `INV-<YYYY>-<NNNNNN>` | ✅ |
| FR-14 | Users can view their tickets | ✅ `/dashboard/tickets` |
| FR-15 | Prices are denominated in PKR | ❌ **stored as PKR, charged as USD** — `BUG-001` |

### Forum

| ID | Requirement | Status |
|---|---|---|
| FR-16 | Authenticated users create threads and threaded replies with markdown | ✅ |
| FR-17 | Upvoting is a toggle, once per user per item | ✅ |
| FR-18 | Full-text search across threads | ✅ GIN on `tsvector` |
| FR-19 | Admins pin, lock and soft-delete threads and replies | ✅ |
| FR-20 | Users are notified of replies to their threads and of @mentions | ✅ in-app + email |

### Content management

| ID | Requirement | Status |
|---|---|---|
| FR-21 | Admins edit homepage, about, team, teams, sponsors, featured events, testimonials, gallery without a deploy | ✅ |
| FR-22 | Testimonials are submitted by users and require approval before display | ✅ inserted with `is_approved = FALSE` |
| FR-23 | Public contact form and newsletter subscription | ✅ |

### Notifications

| ID | Requirement | Status |
|---|---|---|
| FR-24 | Seven notification types, delivered in-app and optionally by email | ✅ |
| FR-25 | Users configure per-type preferences; in-app is opt-out, email is opt-in | ✅ |
| FR-26 | `registration_confirmed` is transactional and always emails | ✅ |
| FR-27 | Delivery is real-time | ❌ — client polls; no WebSocket or push |

### Auditing

| ID | Requirement | Status |
|---|---|---|
| FR-28 | All changes to 10 sensitive tables are logged immutably | ⚠️ logged, but **without the acting user** — `BUG-003` |
| FR-29 | Super admins can review recent activity | ✅ |

## Non-Functional Requirements

> [!warning] None of these targets has been measured
> No load test, benchmark or profiling run exists in this repository. The figures below are
> **design intent carried from the frozen PRD**, not observed behaviour. Treat them as
> unverified. See `TODO-030`.

| ID | Requirement | Verified? |
|---|---|---|
| NFR-1 | Support ~1,000 registered members and ~500 concurrent users | ❌ never tested |
| NFR-2 | Handle ~100 events per semester without degradation | ❌ never tested |
| NFR-3 | No overbooking under concurrent registration | ⚠️ correct by construction (SERIALIZABLE + lock + trigger); never load-tested |
| NFR-4 | Financial records must never be orphaned | ✅ `ON DELETE RESTRICT` |
| NFR-5 | Secrets never committed | ✅ `.env` files gitignored |
| NFR-6 | Uptime / availability target | ❌ none defined, nothing monitors it |
| NFR-7 | Recovery point / recovery time objective | ❌ none defined, restore never tested |
| NFR-8 | Accessibility standard | ❌ none defined or tested |

## Dependencies

**Runtime services** — Supabase (PostgreSQL + Auth), Stripe, Cloudinary, Brevo SMTP, Vercel.
Every one is a single point of failure with no fallback path; see [[ErrorHandling]].

**Notable library constraints** — Zod v4 (uses v4-only top-level APIs); Stripe API pinned to
`2023-10-16`; Next.js App Router with React 18; the unified `radix-ui` package rather than
individual `@radix-ui/react-*` packages.

## Technology Choices

Recorded as ADRs in [[../04-decisions/_Decisions_Index|04-decisions]]. In brief: Supabase for
managed Postgres + auth in one product; Express alongside it for logic that must not run in the
browser; stored procedures for the two invariants that must hold under concurrency; Stripe
hosted checkout to avoid handling card data; Vercel because the frontend is Next.js.

## Acceptance Criteria

The project was delivered as coursework and accepted on demonstration rather than against a
written test plan. There is **no automated acceptance suite** — see [[Testing_Strategy]].

For future work, a change is acceptable when: it is covered by an ADR if it is a real decision;
the vault's `00-core` reflects it; a `TODO-NNN` row traces it; and it has been exercised
manually against the running app. That is a weak bar, and `TODO-031` proposes replacing it.
