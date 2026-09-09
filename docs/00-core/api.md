# API

> Route inventory verified against `backend/src/routes/` and `backend/src/index.ts` on
> 2026-09-09. Express API, default port 4000.

## API Conventions

**Base URL** — the frontend reads `process.env.NEXT_PUBLIC_API_URL` (local:
`http://localhost:4000`). All routes are mounted under `/api/*`.

**Response envelope** — two fields, always:

```json
{ "data": <payload>, "error": null }
{ "data": null, "error": "Human-readable message" }
```

`error` is always a plain **string**, never an object or array.

**Paginated lists** add `total`, `page` and `limit` as *siblings* of `data`, not nested
inside it:

```json
{ "data": [...], "total": 42, "page": 1, "limit": 20, "error": null }
```

> [!note] Three endpoints deliberately break the envelope
> `GET /health` returns `{ status, db, timestamp }`; `POST /api/upload` returns
> `{ url, public_id }`; `POST /api/payments/webhook` returns `{ received: true }`.
> `GET /api/forum/search` returns `data`, `total`, `query` — **no `page`/`limit`**.

**Content type** — JSON, capped at 50 KB by `express.json({ limit: '50kb' })`. The one
exception is `POST /api/upload`, which is `multipart/form-data` capped at 5 MB.

## Authentication and Versioning

**There is no API versioning.** No `/v1` prefix, no version header. A breaking change to any
endpoint breaks the deployed frontend immediately. See `TODO-011`.

**Authentication** is a Supabase access token as a bearer credential:

```http
Authorization: Bearer <supabase access_token>
```

`requireAuth` (`backend/src/middleware/auth.ts`) calls `supabase.auth.getUser(token)` against
Supabase on every request — tokens are not verified locally. It attaches the Supabase user to
`req` via an untyped `(req as any).user` cast.

**Guards**, applied per route in this order:

| Guard | Effect on failure |
|---|---|
| `requireAuth` | `401` `Authentication required` / `Invalid or expired token` |
| `requireUsername` | `403` with `code: 'PROFILE_INCOMPLETE'` — the only error response carrying a third field |
| `requireRole(...roles)` | `403` `Access denied. Required role: …` |

> [!warning] Roles are a flat allow-list, not a hierarchy
> `requireRole('admin')` does **not** admit `super_admin`. Every call site enumerates every
> acceptable role explicitly. Adding a role means auditing every guard.

Role names in use: `user`, `editor`, `admin`, `super_admin`. A fifth role `viewer` is seeded in
the database but is never assignable through the API and is filtered out of
`GET /api/admin/roles`.

> [!warning] A mock-auth bypass exists in the backend
> When `NODE_ENV !== 'production'` **and** `ALLOW_MOCK_AUTH === 'true'`, the literal token
> `mock-token` authenticates as a hard-coded UUID and is treated as `admin` by `requireRole`
> regardless of the roles requested. Both conditions are required. See [[Security]].

## Endpoints

### Events — `/api/events`

| Endpoint | Access |
|---|---|
| `GET /api/events` | Public |
| `GET /api/events/categories` | Public |
| `GET /api/events/:id` | Public |
| `GET /api/events/:id/people` | Public |
| `GET /api/events/:id/registration-status` | Auth |
| `POST /api/events/:id/register` | Auth + username |
| `POST /api/events` | admin, super_admin |
| `PATCH /api/events/:id` | admin, super_admin |
| `POST /api/events/:id/people` | editor, admin, super_admin |
| `PATCH /api/events/:id/people/:personId` | editor, admin, super_admin |
| `DELETE /api/events/:id/people/:personId` | editor, admin, super_admin |

`POST /api/events/:id/register` is documented in depth at
[[../05-features/event-registration-and-payment/API|the feature's API note]].

### Forum — `/api/forum`

| Endpoint | Access |
|---|---|
| `GET /api/forum/threads`, `/threads/:id`, `/search`, `/categories` | Public |
| `POST /api/forum/threads/:id/view` | **Public** — unauthenticated view-count increment |
| `POST /api/forum/threads` | Auth + username |
| `POST /api/forum/threads/:id/replies` | Auth + username |
| `POST /api/forum/threads/:id/upvote` | Auth + username (toggles) |
| `PUT /api/forum/threads/:id/pin`, `/lock` | admin, super_admin |
| `DELETE /api/forum/threads/:id`, `/replies/:id` | admin, super_admin (soft delete) |

### Payments — `/api/payments`

| Endpoint | Access |
|---|---|
| `POST /api/payments/create-checkout-session` | Auth |
| `POST /api/payments/webhook` | **Public** — authenticated by Stripe signature only |
| `GET /api/payments/my-tickets` | Auth |
| `GET /api/payments/verify-session` | Auth |

### Users — `/api/users`

| Endpoint | Access |
|---|---|
| `GET /api/users/me`, `PATCH /api/users/me` | Auth |
| `GET /api/users/me/registrations`, `/me/activity` | Auth |
| `GET /api/users/me/preferences`, `PATCH /api/users/me/preferences` | Auth |
| `POST /api/users/recommendations/generate` | Auth |
| `GET /api/users/search` | **Public** |
| `GET /api/users/:username` | Public — declared last so it does not shadow `/me`, `/search` |

### Admin — `/api/admin`

Router-level `requireAuth` + `requireRole('editor','admin','super_admin')` applies to every
route; the table shows any *additional* restriction.

| Endpoint | Additional restriction |
|---|---|
| `GET /api/admin/stats`, `/events`, `/roles` | — (editor and up) |
| `DELETE /api/admin/events/:id` | — (editor and up); soft delete → `status = 'cancelled'` |
| `GET /api/admin/users` | admin, super_admin |
| `PATCH /api/admin/users/:id/role` | admin, super_admin; assigning `super_admin` requires super_admin |
| `PATCH /api/admin/users/:id/status` | admin, super_admin; cannot target a super_admin |
| `DELETE /api/admin/users/:id` | **super_admin only**; blocks self-delete |
| `GET /api/admin/payments` | admin, super_admin |
| `GET /api/admin/audit` | **super_admin only** |

### CMS — `/api/cms`

Public reads: `/homepage`, `/about`, `/team`, `/teams`, `/gallery`, `/sponsors`,
`/featured-events`, `/testimonials`. Public writes: `POST /contact`, `POST /newsletter`.
All other mutations require admin or super_admin.

> [!warning] Two similar paths, two different resources
> `/api/cms/team` manages **individual people** (`content.team_members`).
> `/api/cms/teams` manages **named groups** (`content.teams`). This is not a typo.

> [!warning] Two CMS endpoints are under-guarded
> `GET /api/cms/team?all=true` returns inactive members with **no auth check at all**, and
> `GET /api/cms/featured-events/all` requires only `requireAuth` despite being commented
> "Admin". See `BUG-007`.

### Social, Upload, Notifications

| Endpoint | Access |
|---|---|
| `GET/POST/PATCH/DELETE /api/social/posts*` | admin, super_admin (+ `writeLimiter`) |
| `POST /api/upload` | **Auth only — no role guard** (+ `writeLimiter`). 5 MB, images only, field name `image` |
| `GET /api/notifications`, `/unread-count` | Auth, scoped to the caller |
| `PATCH /api/notifications/read-all`, `/:id/read`, `DELETE /:id` | Auth, scoped to the caller |

### Health

`GET /health` — public, runs `SELECT 1`. Returns `200 {status:'ok', db:'connected'}` or
`503 {status:'error', db:'unreachable'}`.

## Error Responses & Throttling

**Status codes in use:** `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `500`, `503`.
No `204`, and no `422` — validation failures return `400`.

**Validation failure** returns `400` with only the **first** Zod issue's message, as a string.
The field path is discarded, so a client cannot map the error back to a form field. See
`TODO-012`. Query and route parameters are **never** Zod-validated — only `req.body` is.

**Rate limits** (`express-rate-limit`, keyed by IP):

| Scope | Window | Max |
|---|---|---|
| Global | 15 minutes | 300 requests |
| `/api/social`, `/api/upload` | 1 minute | 20 requests |

> [!warning] `trust proxy` is not set
> Express is never told to trust a proxy, so behind a reverse proxy or PaaS all requests may
> rate-limit against the proxy's IP as a single bucket. See `BUG-008`.

Full error semantics, retry behaviour and idempotency: [[ErrorHandling]].
