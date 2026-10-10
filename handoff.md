# Handoff

**Read this file first, every session.** It is the running log of what happened and when.

For *what is true about the system now*, read [`docs/START_HERE.md`](docs/START_HERE.md) (humans)
or [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) (AI). This file answers a different question — it
is history, not reference.

> **Append only. Never rewrite or condense past entries.** Their value is that they record what
> was true at the time. If paths change later, note the move in `docs/START_HERE.md` rather than
> editing history here.

---

## 0. Session operating rules

Every task follows this sequence, in order. Steps are not optional and not reorderable —
skipping step 8 (the dual write) is the specific failure mode this file exists to prevent, and
it is the one people skip because the code already works and the task *feels* done at step 7.

1. **Start from the latest `dev`.**
   ```
   git checkout dev
   git pull origin dev
   ```
   Never branch from a stale local `dev`, and never branch from `main`.

2. **Read this file first**, then only the vault documents the task actually needs. Do not read
   the whole vault.

3. **Create a new branch for the task**, off the `dev` you just pulled:
   ```
   git checkout -b <type>/<short-name>
   ```
   `type` is `feature`, `feat`, `fix`, `refactor`, or `chore` — whichever the git history
   already uses for that kind of change. One task per branch, one task per session. This is a
   small codebase with no tests and no CI — a branch that touches three unrelated things
   cannot be reviewed, tested, or reverted cleanly.

4. **A real technical decision needs an ADR before the code**, not after —
   [`docs/04-decisions/`](docs/04-decisions/_Decisions_Index.md). If you are not sure whether a
   choice rises to that level, it probably doesn't; when in doubt, a one-line note in the PR
   description is enough and an ADR is not required for every judgment call.

5. **Do the work** on that branch.

6. **Test before claiming done.** There is no test suite. `npm run build` in both apps (`tsc
   --strict`) is the only automated check — run it in whichever app you touched. Anything
   user-facing additionally needs a manual pass in the browser: load the page, exercise the
   change, and check the surrounding flow didn't regress. "It compiles" is not "it works."

7. **Update the documents** — this is the dual write, and it happens *before* you commit, not
   after, so the commit and the doc update land together:
   - **Always:** append an entry to this file (`handoff.md`) — what changed and why, dated.
     Append only; never edit a previous entry.
   - **If system behaviour changed:** update the relevant file(s) in
     [`docs/00-core/`](docs/00-core) in place, and add a `TODO-NNN` row in
     [`docs/01-planning/TODO.md`](docs/01-planning/TODO.md) for anything you left unfinished or
     unverified.
   - **If you found a defect you didn't fix:** add a `BUG-NNN` row in
     [`docs/01-planning/bugs.md`](docs/01-planning/bugs.md) rather than leaving it undocumented.
   - **Never invent a value.** If you can't verify a number, path, or key format against the
     code, write `TODO` and file a `TODO-NNN` — don't write a plausible guess.

8. **Commit and push**, with the doc updates in the same commit (or the same small set of
   commits) as the code change they describe — not a separate "docs" commit added later by
   someone else:
   ```
   git add <files>
   git commit -m "..."
   git push -u origin <type>/<short-name>
   ```

9. **Open a PR into `dev`.** Never merge directly to `dev` without a PR, even solo. The PR
   description should say what changed and point at the `handoff.md` entry rather than
   repeating it.

10. **On a milestone, or when the project owner (Umar) decides**, open a second PR from `dev`
    into `main`. This is a deliberate, separate step — `dev` accumulates work continuously;
    `main` advances in batches, not on every merge.

11. **Immediately after the `dev` → `main` PR merges, merge `main` back into `dev`** so the two
    branches realign (this matters if the `main` PR was squash-merged or otherwise produced a
    commit that doesn't exist verbatim on `dev`):
    ```
    git checkout dev
    git pull origin dev
    git merge main
    git push origin dev
    ```
    Do this before anyone starts a new branch off `dev` — starting from a `dev` that has
    silently diverged from `main` is how the two branches drift apart.

**Summary of the branch flow:**

```
dev (pull latest)
 └─▶ feature/<task> ──▶ PR ──▶ dev
                                 │
                    (repeat per task, accumulating on dev)
                                 │
                    on milestone / owner's call
                                 ▼
                              PR ──▶ main
                                 │
                    merge main back into dev
                                 ▼
                          dev realigned, ready for the next branch
```

---

## 1. What the project is

The **GDGOC-UITU Community Platform** — the digital home of Google Developer Groups on Campus at
UIT University, Karachi. Members discover and register for events, pay for ticketed ones,
discuss on a forum, and organisers run the chapter from an admin dashboard with a built-in CMS.

It began as a Database Systems course project under Miss Laiba Mughal, and was built well past
coursework scope: real RBAC, Stripe payments, audit logging, notifications, and a normalised
9-schema PostgreSQL design.

Built by **Umar Sani** and **Umair Jan**.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 18, TypeScript, Tailwind 3, GSAP + Lenis, Radix/shadcn |
| Backend | Express, TypeScript, Zod v4, `pg` |
| Database | PostgreSQL on Supabase — 9 schemas, 31 tables, 4 stored procedures, 25 triggers |
| Auth | Supabase Auth (email/password + Google OAuth), verified server-side per request |
| Payments | Stripe hosted checkout + webhook |
| Media | Cloudinary · **Email** Nodemailer over Brevo SMTP |
| Hosting | Frontend on Vercel; backend host **unverified** — see `docs/00-core/Deployment.md` |

Monorepo with **no root `package.json`** — `frontend/` and `backend/` install and build
independently.

---

## 3. Working conventions

- **Response envelope:** `{ data, error }` everywhere; `error` is always a plain string.
  Paginated lists add `total`, `page`, `limit` as *siblings* of `data`.
- **Roles are a flat allow-list.** `requireRole('admin')` does **not** admit `super_admin`.
  Every call site enumerates every acceptable role.
- **Validation** is Zod on `req.body` only — query and route params are never validated.
- **SQL** is raw and parameterised (`$1`, `$2`). No ORM. Never interpolate user values.
- **Two paths to the database:** simple public reads go direct via the Supabase SDK; anything
  privileged or transactional goes through Express. See `docs/04-decisions/ADR-001-*`.
- **"Phase" is ambiguous here.** Build phases (git history, finished) vs. doc phases
  (`docs/01-planning/Phases.md`). Always qualify which.

---

## 4. Testing / gotchas

**There are no automated tests and no CI.** `npm run build` (which runs `tsc --strict`) is the
only automated check in the project.

Gotchas that have cost time:

- `FRONTEND_URL` is the **only** allowed CORS origin. A mismatch presents as every API call
  failing in the browser.
- Stripe webhooks need `stripe listen --forward-to localhost:4000/api/payments/webhook` locally.
  Without it, checkout completes but **no registration is created** — settlement happens only
  in the webhook.
- `express.raw()` must stay mounted on the webhook path **before** `express.json()`, or
  signature verification breaks.
- `shared/types.ts` exists **twice** (root and `frontend/shared/`). Nothing syncs them.
- Local development appears to share the **production** database — treat schema experiments
  accordingly.
- `requireAuth` calls Supabase on every request, so Supabase latency is your API's latency.

---

## 5. Build status

**Shipped and working:** public site (landing, about, contact, events, forum, public profiles),
auth with Google OAuth, event registration, Stripe checkout, member dashboard, admin panel with
full CMS, in-app + email notifications, audit logging.

**75 commits, 2026-03-07 → 2026-06-17**, across `main` / `dev` / feature branches, 23 PRs.

**Known serious defects** — full detail in `docs/01-planning/bugs.md`:

| ID | Summary |
|---|---|
| `BUG-005` | Audit partitions cover 2026 only — from 2027-01-01 most writes begin failing |
| `BUG-001` | Prices stored as PKR, charged to Stripe as USD, unconverted |
| `BUG-010` | Webhook has no replay protection and returns 200 on settlement failure |
| `BUG-003` / `BUG-004` | Audit log has no actor, and RLS is inert — same root cause |

---

## 6. Build Phases 2–8 — platform delivery (2026-03-11 → 2026-03-19)

The original build, delivered as numbered phases visible in the git history.

- **Phase 2** (2026-03-12) — Events: 4 screens plus the backend fully set up.
- **Phase 3** (2026-03-12) — Payment screens; the missing failed-payment page followed the
  same day.
- **Phase 4** (2026-03-13) — Member portal, 4 screens.
- **Phase 5** (2026-03-13) — Forum: 4 screens with the backend working.
- **Phase 6** (2026-03-13) — Admin panel, 6 screens, fully functional.
- **Phase 7** (2026-03-15) — CMS and social screens.
- **Phase 8** (2026-03-16) — 6 public screens.
- (2026-03-18) — Editor dashboard and role-based dashboard access.
- (2026-03-19) — Team hierarchy (lead, co-lead, members, mentors); about/teams/sponsors merged.

Earlier, 2026-03-07 → 2026-03-11: repository setup, auth screens, and the fix for the
"email already registered" flow.

---

## 7. UI redesign and hardening (2026-03-27 → 2026-06-17)

- **2026-03-27 → 2026-05-13** — Landing page redesign across several passes: hero, who-we-are,
  teams, upcoming events, about-me and featured-past-events sections.
- **2026-05-28 → 2026-06-12** — Forum UI improvements; about page rebuilt; OUR MISSION section
  redesigned.
- **2026-06-14** — *Performance*: implemented the fixes identified in
  `ProjectDocs/Performance.md`.
- **2026-06-14** — *Security*: worked through `ProjectDocs/Security.md` and hardened the
  application. **This is when helmet and rate limiting were actually applied** — that document
  still lists them as missing, which is why parts of it are now stale.
- **2026-06-14** — Landing and about pages redesigned; in-app and email notifications shipped
  with user-configurable preferences.
- **2026-06-16** — Fixed `backend` `tsc` `rootDir` so `dist/index.js` matches the `start`
  script; README added; logo fixes on member and admin dashboards.
- **2026-06-17** — Member dashboard layout reworked; public user profiles added; redundant
  `/profile` pages removed; custom events and forum pages added to the member dashboard.
- **2026-06-17** — `chore: vendor shared types into frontend for standalone Vercel build`
  (`72b3eec`) — Vercel's frontend-rooted build cannot reach `../shared`, so `shared/types.ts`
  was copied into `frontend/shared/` and the `@shared` alias repointed. Last commit before the
  project went quiet.

---

## 8. Documentation vault established (2026-09-09)

Set up the Obsidian documentation vault at [`docs/`](docs/START_HERE.md) and this handoff log.

**What was done.** Surveyed the codebase directly — backend routes and middleware, frontend
route groups and auth, and the full `GDGOC_UITU_schema.sql` — then wrote the vault from what the
code actually says rather than from the frozen course specifications. Built:

- Entry points: `START_HERE.md` (human) and `AI_CONTEXT.md` (AI routing).
- `00-core/` — nine current-state documents, all verified against the code.
- One full PSP feature folder: event registration and payment (7 files).
- Five ADRs — three written in full, two honest stubs for decisions that are live but were never
  written up.
- `01-planning/` with a 45-row `TODO-NNN` ledger and 11 `BUG-NNN` entries.
- `03-research/`, `06-ideas/`, `02-prompts/`, `07-build-docs/`, `08-ops/` with four runbooks.

**Notable findings from the survey**, none of which were previously written down:

- `BUG-005` — `audit.logs` has partitions for 2026 only and no `DEFAULT` partition. Because ten
  audit triggers fire `AFTER` inside the writing transaction, from 2027-01-01 this will abort
  writes to users, events, registrations, transactions, threads and replies. Highest-severity
  item found.
- `BUG-001` — paid registrations are charged in USD using the PKR figure, unconverted.
- `BUG-010` — the Stripe webhook returns 200 on database failure so Stripe will not retry,
  meaning a paid registration can be silently lost.
- `BUG-003` / `BUG-004` — one root cause: the backend never sets `app.current_user_id`, so the
  audit log records no actor and every RLS policy evaluates against NULL.
- `ProjectDocs/Security.md` is partly stale — its ❌ entries for helmet and rate limiting were
  fixed on 2026-06-14.
- `ProjectDocs/` is excluded via `.git/info/exclude`, a **local-only** ignore file, so a
  teammate cloning this repository receives none of the course documents (`TODO-045`).

**State of the vault.** Partially populated by design: one of seven shipped features is
documented in depth, two ADRs are stubs, and several `00-core` sections are explicitly marked
`TODO`. Every gap has a numbered row rather than being silently omitted.

**Suggested next session.** Add the `DEFAULT` audit partition — it is one SQL statement and
removes a scheduled outage. Then decide the currency question blocking `BUG-001`, reading the
unmerged `feat/payfast_integration` branch first.

---

## 9. First production deploy — backend to Railway, frontend to Vercel (2026-09-09)

Closed `TODO-036`: the backend host, unverified as of section 8, is now Railway. Deployed from
the same GitHub repo with Root Directory set to `backend`; frontend deploy to Vercel (Root
Directory `frontend`) was already partly done and got finished the same session.

**Two production defects found and fixed** — not from reading the code, but from watching the
first deploy fail:

- **`BUG-012` (new, fixed)** — `db/client.ts` used `ssl: { rejectUnauthorized: true }` in
  production. Supabase's pooler certificate chain doesn't validate cleanly against Node's
  default CA store, so this rejected *every* database connection —
  `GET /health` returned `db: unreachable` on every request. Changed to
  `rejectUnauthorized: false` (still TLS-encrypted, only CA-chain validation skipped, matching
  Supabase's own connection guidance). `TODO-046` filed for the stricter fix — pin Supabase's CA
  cert instead of a blanket disable.
- **`BUG-008` (fixed)** — `trust proxy` was never set, exactly as predicted when the bug was
  written down in section 8. Railway sits one reverse-proxy hop in front of the app, so
  `index.ts` now sets `app.set('trust proxy', 1)`.

Also fixed: a Vercel 404 on first deploy, caused by Root Directory not being set to `frontend`
(same monorepo issue as Railway, different dashboard).

**Doc updates in the same session** (the dual-write this file's own rules call for):
`docs/00-core/Deployment.md` rewritten to state the backend host as fact instead of "unverified"
and to record both fixes; `TODO-036` marked `done`; `TODO-046` and `TODO-047` (no in-repo
Railway deploy manifest) filed; `BUG-008` and `BUG-012` marked `fixed` in
[`docs/01-planning/bugs.md`](docs/01-planning/bugs.md) with resolution notes.

**Unrelated small change, same session.** Forum page ([forum/page.tsx](frontend/app/(public)/forum/page.tsx)) —
the Pinned Posts / Forum Rules sidebar is now `sticky` on large screens instead of scrolling out
of view immediately.

**Suggested next session.** File a `railway.json` (or equivalent) to close `TODO-047` — right
now a fresh Railway environment can only be reconstructed by reading this vault and re-clicking
through the dashboard by hand.

---

## 10. Vercel frontend deploy finished; Google OAuth broke, fixed via dashboard config (2026-09-09)

Continuation of section 9's session, after `dev` was merged to `main` and Umair's Railway/forum
work landed there.

**Vercel deploy issue.** The frontend was already partly configured on Vercel; the remaining
problem was environment variables likely copied straight from `frontend/.env.local`, which
would carry `NEXT_PUBLIC_API_URL=http://localhost:4000` into production — the frontend would
then try to call the developer's own machine instead of the Railway backend. Resolved by
setting `NEXT_PUBLIC_API_URL` to the Railway public URL in the Vercel project's env vars.
Confirmed working.

**Google OAuth then failed on the deployed site.** The frontend code was already correct — both
`signInWithOAuth` call sites (`login/page.tsx`, `register/page.tsx`) and the `/auth/callback`
handler build the redirect from `window.location.origin`, with no hardcoded `localhost`
anywhere in the repo. The cause was outside the codebase entirely: Supabase's Authentication →
Redirect URLs allow-list rejects any redirect target it doesn't recognise, independent of what
the frontend sends. The production `/auth/callback` entry was already present; **`/reset-password`
and `/verify` were missing** for the production domain (`https://gdgoc-uitu.vercel.app`) and
have been added, alongside the existing `localhost:3000` entries for local dev. Google Cloud
Console's OAuth client redirect URI (which points at Supabase's own callback, not the frontend)
did not need to change.

**Doc updates this session** (dual write, done before this entry): `docs/00-core/Deployment.md`
gained a Vercel deploy callout (mirroring the existing Railway one) recording the Root
Directory requirement and both dashboard-config gotchas, plus a warning box in "Production
configuration" about the Supabase/Google OAuth redirect-URL requirement; `TODO-048` filed for
the fact that Vercel's Root Directory and both OAuth redirect allow-lists live only in
dashboards with nothing committed in-repo — the same class of gap as Railway's `TODO-047`.

**Also this session:** rewrote `handoff.md` §0 from a loose rule list into an explicit,
numbered, start-from-`dev` → branch → work → test → dual-write → commit → push → PR-to-`dev` →
PR-to-`main`-on-milestone → merge-`main`-back-into-`dev` sequence, at the user's request, so the
workflow this file already implied is now a procedure rather than something to infer.

**Suggested next session.** Consider whether Vercel's preview-deployment URLs (a new unlisted
origin per PR) need to be handled — either wildcarded in Supabase's redirect allow-list
(`https://*.vercel.app/auth/callback` if Supabase's wildcard support covers this shape) or
accepted as a known limitation that OAuth only works on the production domain and `localhost`,
not on preview deploys. Also still open: `TODO-047` (Railway) and now `TODO-048` (Vercel) — a
`vercel.json` would close half of the latter.

---

## 11. Post-launch punch list scoped; image optimization shipped (2026-09-10)

Umar handed over seven post-launch tasks to work through one at a time, each its own branch and
commit, per the existing branch-per-task rule in §0: image optimization, DB/frontend dead-weight
cleanup, host/speakers-at-event-creation, Redis, client-side caching, mobile UI fixes, and a
security audit pass. Surveyed the codebase first (`Explore`/general-purpose agent pass across
all seven areas) before scoping, then wrote `TODO-049` through `TODO-054` in
[`docs/01-planning/TODO.md`](docs/01-planning/TODO.md) so each task has a ledger row; the
security-audit task deliberately got no new TODO rows since `TODO-013`–`TODO-029` and the
`BUG-NNN` ledger already cover that ground in full.

**This session shipped the first task**, `perf/image-optimization` (branched off freshly-pulled
`dev`), after the user supplied `ProjectDocs/Image-Optimization.pdf` (a 44-page frontend-system-
design reference) partway through and asked for the standing rules to be written down for future
sessions too. Full detail — what changed, and the rules going forward — is in the new
[`docs/00-core/Performance.md`](docs/00-core/Performance.md); summary:

- Converted all 35 raster assets in `frontend/public/images/` to WebP via a new
  one-off-turned-permanent script (`frontend/scripts/convert-to-webp.mjs`, `npm run images:webp`)
  — static image weight dropped from ~19.8MB to ~7.9MB (~60%), before Next's own AVIF/responsive
  negotiation is applied on top.
- Moved the safely-convertible `<img>` call sites to `next/image` (all site logos, the four
  page-mascot decorations, `ParallaxBackdrop`, `MissionScroll`'s photo carousel). Left `<img>` in
  place — extension-fixed to `.webp` only — for GSAP/DOM-ref-driven animations
  (`AndroidRunner`/`CactusRunner` sprite frames, `WhoWeAre`'s hover-flip logo, the landing page's
  ink-mask-reveal hero) where `next/image`'s sizing model doesn't fit cleanly.
- Added `quality: 'auto', fetch_format: 'auto'` to the single Cloudinary upload route
  (`backend/src/routes/upload.ts`) so every future upload is auto-optimized at delivery.
- **Found and fixed two live case-sensitivity bugs** while repointing references: `Android WOMAN
  Standing Still.png` (code) vs. `...still.png` (disk), and `Android%20Running/` (code) vs.
  `Android running/` (disk). Both worked locally on Windows's case-insensitive filesystem and
  would have 404'd on Vercel's Linux build — this was a real risk with no test coverage that
  would have caught it, only manual verification against the actual filenames on disk.
- Confirmed four static assets are dead code (unreferenced anywhere in `frontend/`) —
  `Android Doind Society Stuff.png`/`...11.png`, `human doing society stuff.png`, both
  `GDGoC Logo with...Mascot.png` files — filed as part of `TODO-050` rather than deleted, to keep
  this branch scoped to optimization and not cleanup.
- Verified via `npm run build` in both apps (clean) and a running dev server: every touched
  image path returns 200, including through the `/_next/image` optimizer endpoint. No headless
  browser was available this session (Playwright MCP failed to connect), so this was an HTTP-level
  check, not a pixel-level visual regression pass — flagged to the user as a gap, not silently
  skipped.

**Doc updates in the same session** (dual write): new `docs/00-core/Performance.md`; linked from
`AI_CONTEXT.md`'s routing table; `TODO-049` marked `done`; `TODO-050` reworded from a guess into
a confirmed finding.

**Suggested next session.** Pick up `TODO-051` (host/speakers at event creation) or `TODO-052`
(Redis) next — both have concrete file:line starting points already recorded in the TODO ledger
from this session's survey. `TODO-050`'s dead-asset deletion is a small, low-risk warm-up if a
short session is wanted first.

---

## 12. `perf/image-optimization` continued — wrong diagnosis caught and fixed, Cloudinary
    responsive delivery added (2026-09-10)

Direct continuation of §11, same branch, same day. Umar tested the Vercel preview live after
each push and caught two real problems the earlier verification (build + HTTP status checks
only) could not have caught — this section exists because "it builds and returns 200" turned out
not to mean "it looks right."

**Problem 1 — Mission carousel photos looked low quality, especially in AVIF.** First
diagnosis was wrong: AVIF was suspected and removed from `next.config.mjs`'s `images.formats`
(commit `b0c089b`), then **reverted** (`5a58a69`) once the real cause was found. The actual bug:
every one of `MissionScroll.tsx`'s ten `next/image` slots shared one hardcoded `sizes` string
that didn't match their real Tailwind width classes (`xl:w-[30rem]` renders at 480px; `sizes`
said 320px). `next/image` trusts `sizes` completely and has no way to inspect real layout, so it
deliberately requested an undersized `srcset` entry that the browser then upscaled via CSS —
that upscaling read as low quality on every format, AVIF included. Fixed (`35c98d8`) by giving
each carousel slot its own `sizes` value biased to ~1.5x its real rendered width rather than an
exact match, per Umar's explicit preference for quality over squeezing out marginal bandwidth
savings — a generous `sizes` fails safe (costs bytes), a tight one fails visibly (costs
quality). This is now rule 7/8 in [`docs/00-core/Performance.md`](docs/00-core/Performance.md),
with the wrong-diagnosis-then-right-fix sequence recorded there in full so a future session
doesn't repeat the AVIF theory.

**Gap surfaced by discussion, not by testing — Cloudinary images had none of this optimization
at all.** Umar asked whether event/team/sponsor images (all Cloudinary-hosted, not static
assets) benefited from any of the session's work. They did not: an `Explore`-style audit across
the whole frontend found every single Cloudinary-backed image (event banners/cards, team and
forum avatars, sponsor logos, featured events, every admin CMS upload preview) rendered via
plain `<img src={field}>` with no resizing — Cloudinary's own on-the-fly transformation
capability (append `w_400,c_fill,q_auto,f_auto` etc. into the URL's `/image/upload/` segment)
was configured for none of them; only the upload-time `quality/fetch_format: auto` from §11
existed. Closed in commit `6e3b5a1`: new `lib/cloudinary-url.ts` (`cldUrl()` helper + six named
presets by context — avatar/avatar-large/event-card/event-hero/logo/thumb) applied across
~30 render sites in 25 files. Deliberately **not** routed through `next/image` — Cloudinary's
edge-cached on-the-fly resizing is a separate, complete mechanism, and stacking `next/image` on
top would double-process for no benefit. `cldUrl()` is a verified no-op on non-Cloudinary URLs
(Google OAuth avatars, local `blob:` upload previews), so it's safe to call unconditionally.

**Problem 2 — after that shipped, Cloudinary images looked slightly pixelated, hero banners
worst of all.** Found via the same live-preview testing pattern, same day. Two compounding
causes: (a) every preset used plain `q_auto`, which is Cloudinary's more-aggressive default
tier rather than its higher-quality `q_auto:best` tier; (b) `CLD_EVENT_HERO` requested only
1200px wide, but that image renders at full unclamped viewport width (`w-full h-full`, no
max-width) in both the event-detail hero and the homepage's expanded-event pop-up — the same
"requested size smaller than real display size" bug class as problem 1, just via a hardcoded
Cloudinary width instead of a `next/image` `sizes` string. Fixed in the same commit (`6e3b5a1`):
every preset switched to `q_auto:best`; `CLD_EVENT_HERO` widened 1200→1920px with an extra
quality allowance since it's the most visually prominent, most tightly-cropped image on the
site. Confirmed fixed via Umar testing a locally-run dev server (both apps started and health-
checked this session) before the commit landed, not just the build/HTTP-level check from §11.

**Doc updates in the same continuation** (dual write): `docs/00-core/Performance.md` gained
rule 4a (Cloudinary responsive delivery, with the "why not next/image" reasoning), the corrected
rule 7/8 bug note above, and a "what was done" entry for the Cloudinary work; this handoff entry
itself, written after Umar asked directly whether documentation was being kept current — it was
not, until this entry, since §11 predates roughly two-thirds of what actually happened on this
branch. No TODO ledger changes this continuation — `TODO-049` was already `done` from §11 and
nothing here reopened it, it only refined the same delivered feature.

**State at end of this continuation.** `perf/image-optimization` has 8 commits, pushed to
`origin`, not yet opened as a PR into `dev`. Two local dev servers (frontend :3000, backend
:4000) were left running in the background this session for Umar's live testing — **not
stopped as of this entry**; a future session picking this branch back up should check for and
clean up stray `next dev` / `nodemon` processes before starting its own, per the port-conflict
already hit once in §11/§12 (a leftover `next dev` from an earlier attempt held port 3000 and
had to be killed by PID before a clean restart).

**Suggested next session.** Open the PR from `perf/image-optimization` into `dev` if Umar is
satisfied with the current preview state — nothing further is planned on this branch. Otherwise
pick up `TODO-051` (host/speakers at event creation) or `TODO-052` (Redis) next, per §11.

---

## 13. `perf/image-optimization` — one more fix, then PR opened (2026-09-10)

Final continuation of §11/§12, same day, same branch.

**Problem 3 — Umar noticed the mascots at the top of the about/contact/events/forum pages were
slow to appear, and asked directly whether they'd been set to lazy-load.** They effectively had:
none of the four had a `priority` prop, and `next/image` lazy-loads by default regardless of
where the image sits in the page layout — all four are inside their page's own header/hero
block (visible on initial load, not scrolled to), but had been classified as "decorative
below-the-fold" back in §11 and given a blur placeholder instead of `priority`. That
classification was the mistake: decorative and below-the-fold are independent properties, and
these four are decorative but *not* below-the-fold. Fixed in commit `d850f90` — added
`priority` to all four, removed the now-pointless blur placeholder from each (a `priority` image
loads near-instantly, so blur is noise). Before applying the fix, checked every navbar/sidebar
logo across public, member, and admin layouts (6 render sites) and confirmed all already had
`priority` correctly set — the bug was isolated to the four mascots, not a systemic miss.
Verified via the still-running local dev server that each mascot now emits a `<link
rel="preload" as="image">` in the document head and no longer carries a `loading` attribute.

**Doc updates in the same continuation** (dual write): `docs/00-core/Performance.md` rule 2
rewritten from "mark the true above-the-fold/LCP image `priority`" (correct in principle, but
its "one LCP image" framing invited exactly the below-the-fold misjudgment that caused this bug)
to an explicit "judge by page position, not by decorative-vs-functional role" rule, plus a dated
bug note recording the mistake and fix; a missing `## What was done` heading (dropped by an
earlier edit, found while updating this section) restored above its bullet list; three
"what was done" bullets added for the Cloudinary quality tuning and this priority fix, which had
landed in commits but not yet been reflected in that section's summary.

**PR opened this continuation**: `perf/image-optimization` → `dev`. See the PR description for
the consolidated commit summary; this file remains the narrative record.

**State at end of session.** All planned work on this branch is done pending review/merge. The
two local dev servers from §12 are still running as of this entry — clean them up (or confirm
they're still wanted for further review) before starting new work on this repo.

**Suggested next session.** After the PR merges to `dev`, pick up `TODO-051` (host/speakers at
event creation) or `TODO-052` (Redis) next, per §11 — both already have concrete file:line
starting points recorded in the TODO ledger.

---

## 14. `feat/people-directory` — TODO-051 redesigned as a reusable people directory (2026-09-22)

Umar picked up `TODO-051` (event-creation blocked on host/speakers because `event_people` had a
`NOT NULL` FK to `events.events` and stored a full profile per row). Rather than the
draft-event-first flow the TODO originally suggested, Umar wanted a standalone speakers/guests
directory — people entered once, reusable across events and eventually shown in a public
catalog independent of any single event. New branch `feat/people-directory` off `dev`.

**Design, agreed with Umar before writing code:**
- New table `content.people` (mirrors the existing `content.team_members` shape: bio, avatar,
  linkedin, organization, `is_active`, `display_order`) — a reusable directory independent of
  events.
- `events.event_people` rebuilt as a pure join table: `(event_id, person_id, role_at_event,
  display_order)`, PK on `(event_id, person_id)`. `role_at_event` is a deliberate per-event
  override of the person's `default_role`, so the same person can be "Speaker" at one event and
  "Panelist" at another — Umar chose this explicitly over a single shared role field.
- Soft-delete (`is_active`), not hard delete — Umar's reasoning: a person can be attached to
  multiple past events via the join table, so hard-deleting or cascading would silently remove
  them from event pages that already shipped. Deactivating removes them from the public catalog
  and the event-attach picker only.
- `GET /api/events/:id/people` returns a **nested** shape (`{ role_at_event, display_order,
  person: {...} }`), not flattened — Umar's call after I raised both options: "do what is the
  optimal way / best way for the system, don't look at how long it will take." This is more
  correct modeling (event-attachment vs. person-profile are separate concerns) even though it
  touched more call sites than a flat shape would have.
- Existing `event_people` rows are test data and were intentionally **not migrated** — table is
  dropped and recreated. Umar was explicit about this up front.

**What shipped this session:**
- Schema: the master schema file and hand-applied migrations were moved from `ProjectDocs/`
  (locally git-excluded, invisible to Umair) to a new tracked `backend/db/` — `backend/db/schema/
  GDGOC_UITU_schema.sql` and `backend/db/migrations/`. All vault docs referencing the old path
  (`Database.md`, `Deployment.md`, `Database_Setup.md`, `Prompts.md`,
  `Payment_Gateway_Alternatives_Research.md`, `ADR-003`) updated to the new one. `content.people`
  added to the schema file; `event_people` moved into the `content` schema section since it now
  FKs `content.people`, which must be created first. Standalone hand-applied migration written to
  `backend/db/migrations/migration_people.sql` (drops old `event_people`, creates both tables,
  grants `gdgoc_app`) — **not yet run against Supabase**, per the existing no-migration-tool
  pattern (`TODO-009`).
- Backend: `content.people` CRUD added to `backend/src/routes/cms.ts` (`GET /api/cms/people`,
  `?all=true` admin variant, `POST`, `PATCH`, `DELETE` → soft-deactivate, `PATCH .../reactivate`).
  `backend/src/routes/events.ts`'s `/:id/people` block reworked: `GET` now joins `content.people`
  and returns the nested shape; `POST` attaches an existing person by `person_id`; new
  `POST /:id/people/new` creates a person and attaches them in one transaction (`pool.connect()`
  + `BEGIN`/`COMMIT`/`ROLLBACK`, mirroring the existing pattern in `events.ts`'s registration
  route and `cms.ts`'s team-rename route); `PATCH`/`DELETE` now only touch the join row
  (role/order or detach), never the person's profile. New Zod schemas in `backend/src/lib/validate.ts`.
- Frontend: new admin screen `frontend/app/(admin)/admin/cms/people/page.tsx` (list, inline
  add/edit, deactivate/reactivate toggle — copied the structure of the Team CMS page, dropped its
  teams-tab grouping since people don't need it). `EventForm.tsx`'s "Hosts, Speakers & Guests"
  panel reworked from a full-profile inline form into a directory search-and-pick UI with a
  "+ New person instead" toggle for the combined create-and-attach flow; stays edit-mode-only
  (attaching still needs `eventId` for the join table's FK — an accepted scope boundary, not a
  gap). Public event detail page (`events/[id]/page.tsx`) updated for the nested response shape.
  New public catalog page `frontend/app/(public)/speakers/page.tsx`, added to the nav
  (`app/(public)/layout.tsx`) between Forum and About.
- Both `npm run build` (frontend, Next.js/Turbopack) and `tsc` (backend) pass clean.

**Not done yet — next session or before merging:**
- The SQL migration has not been run against the dev Supabase instance. Nothing in this feature
  works end-to-end until it is.
- No live testing yet (create a person, attach to an event, verify the public pages) — the plan's
  verification checklist is written but unexecuted.
- `TODO-051` marked `in-progress` in the ledger, not `done`, until the migration is applied and
  verified live.

**Suggested next session.** Apply `backend/db/migrations/migration_people.sql` to Supabase, then
run through the verification checklist (create/attach/detach a person, deactivate one still
attached to a past event, check the public `/speakers` and event-detail pages). Mark `TODO-051`
`done` once verified. Open the PR from `feat/people-directory` into `dev` after that.

---

## 15. `feat/people-directory` — indexing pass, migration applied and verified live (2026-09-22)

Continuation of §14, same day. Umar asked to run the migration and make sure it was optimized
(indexing, RLS) before applying it.

**Indexing fix caught before applying.** The original migration had
`idx_event_people_event_id` on `events.event_people(event_id)` — but the table's own
`PRIMARY KEY (event_id, person_id)` already produces a composite btree whose leading column is
`event_id`, so that index duplicated the PK exactly the way `BUG-006`'s `idx_notif_prefs_user`
duplicates its table's PK. Dropped it; kept only `idx_event_people_person_id` (the PK doesn't
cover person-first lookups). Added `idx_people_is_active` on `content.people(display_order)
WHERE is_active = true` — a partial index matching the one real filter every query in this
feature runs (`content.team_members`'s `idx_team_section` was the precedent: index the filter
column, not `display_order` alone, since these are small CMS tables where a plain sorted scan is
already cheap). Both `backend/db/schema/GDGOC_UITU_schema.sql` and
`backend/db/migrations/migration_people.sql` updated to match.

**RLS — deliberately not added.** Checked every `content.*` table in the schema
(`team_members`, `sponsors`, `gallery`, etc.) — none has RLS enabled; only tables with a
`user_id` column do (`users.users`, `events.registrations`, `payments.transactions`,
`audit.logs`, `notifications.notifications`), and `BUG-004` already documents that even those
policies are inert (no `TO <role>`, no `FORCE ROW LEVEL SECURITY`). `content.people` and
`events.event_people` have no `user_id` to scope a policy against and are publicly readable by
design, with writes gated by `requireAuth`/`requireRole` at the API layer — adding RLS here
would be dead policy code matching the exact mistake `BUG-004` flags elsewhere, not a real
optimization. Documented this reasoning inline in both SQL files so a future session doesn't
second-guess it without context.

**Migration applied to the live Supabase dev instance.** No `psql` available in this
environment, so ran it via a one-off Node script using the `pg` package already in
`backend/`'s dependencies, against `DATABASE_URL` from `backend/.env`. Checked
`events.event_people` first — found 13 existing rows (placeholder names like "Sara Khan",
"Dr. Laiba Mughal" across 4 events) — confirmed with Umar before running the destructive
`DROP TABLE`, consistent with what he'd already said about test data, then proceeded. Verified
after: both tables' columns, the two indexes (no duplicate), `gdgoc_app` grants (`SELECT`,
`INSERT`, `UPDATE`, `DELETE` on both), and `rowsecurity = false` on both, all match the design.

**Live end-to-end verification via the API** (backend dev server started locally, mock auth
`ALLOW_MOCK_AUTH=true` with the mock user resolving to `super_admin` — confirmed via a DB query
before use). Exercised: create a person, confirm they appear in the public and admin directory
listings; attach to an existing event and confirm the nested `{ role_at_event, ..., person: {...}
}` response shape; duplicate-attach correctly 409s; the combined `POST /:id/people/new`
create-and-attach transaction works and the new person shows up in the directory too; `PATCH`
role-at-event edits only the join row; deactivating a person removes them from the public
catalog **immediately** while they remain visible (with `is_active: false`) on the event they're
already attached to — the core soft-delete guarantee the design was built around — confirmed,
not assumed; reactivate restores them; detach removes the join row without touching the
person's profile; detaching twice 404s. All test rows cleaned up afterward — both tables are
empty again, ready for real data. Backend dev server stopped after verification.

**Not done yet.** Frontend UI flows (the admin person picker in `EventForm.tsx`, the
`/admin/cms/people` screen, the public `/speakers` page) were verified only via API calls this
session, not clicked through in an actual browser. `TODO-051` marked `done` in the ledger on the
strength of the API-level verification; if the UI has a bug the API test wouldn't catch (e.g. a
frontend field-name mismatch), it would surface on first real use.

**Suggested next session.** Click through the admin and public UI in a browser before merging,
per the gap above. Then open the PR from `feat/people-directory` into `dev`.

---

## 16. `chore/security-hardening` — nine TODOs from the security ledger (2026-10-10)

One commit per task, each with its own TODO/Security/api/Deployment doc updates. Branch is
local only, cut from `dev`; nothing pushed, nothing merged.

| TODO | Status | What changed |
|---|---|---|
| 046 | done | `db/client.ts` pins Supabase Root 2021 CA (`backend/certs/`), `rejectUnauthorized: true`. Verified chain + real query + negative control |
| 013 | done | Backend refuses to boot with `ALLOW_MOCK_AUTH` under `NODE_ENV=production`; bypass off when `FRONTEND_URL` is non-local. Frontend switch is `NEXT_PUBLIC_ENABLE_MOCK_AUTH`, compiled out of prod builds |
| 015 | **in-progress** | Schema creates `gdgoc_app` `NOLOGIN`; `migration_gdgoc_app_nologin.sql` written. **Not applied to Supabase** (live inspection was blocked by the permission classifier) |
| 017 | done | Folder allow-list + per-folder roles, magic-byte sniffing (SVG rejected), `DELETE /api/upload` with avatar ownership check. Real Cloudinary upload→delete→404 verified |
| 018 | done | Zod for forum pin/lock (strict booleans) and gallery create; `validateParams`; pin/lock 404 on missing thread |
| 019 | done | `middleware/userRateLimit.ts` applied from `requireAuth`; forum thread/reply limiters; env-tunable |
| 020 | done | `rehype-sanitize` via shared `frontend/lib/markdown.ts` at all 5 sites; browser-verified |
| 004 | done (needs real sign-in check) | `frontend/proxy.ts`; Supabase session moved to a cookie via `lib/supabaseCookieStorage.ts` (implicit flow kept on purpose); new dep `@supabase/ssr` |
| 024 | **in-progress** | Turnstile middleware + widget; view-count de-dupe. Dormant until `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set |

**Decisions worth remembering.** (a) `proxy.ts`, not `middleware.ts` — Next 16 renamed it.
(b) Did not use `createBrowserClient`: it hard-codes PKCE, which would change email-verify and
password-reset link behaviour. (c) View counts are de-duplicated, not captcha'd — a captcha per
page view is poor UX. (d) Turnstile and `gdgoc_app` are shipped inert/unapplied rather than
risking a production break.

**Found, not fixed.** `@mention` pills never render (react-markdown blanks `mention:` hrefs) —
noted under bugs.md Notes. `login/page.tsx` pushes `?redirect=` without validating it is a
same-site path (open redirect). The Supabase DB returned "tenant/user not found" for a while at
session start (project likely paused) and recovered; free-tier pausing is a standing risk.

**Before merging.** (1) Real email + Google sign-in on a preview deploy — `TODO-004` was only
tested against a fake Supabase. Existing sessions auto-migrate localStorage→cookie. (2) Run the
`gdgoc_app` migration after confirming nothing connects as that role. (3) Create the Turnstile
site and set both keys. (4) Test a non-admin token against `/api/upload` — role-denied path was
not exercised.
