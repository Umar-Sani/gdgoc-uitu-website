# Runbook — Local Development

Verified against `package.json` and the source on 2026-09-09.

## Prerequisites

Node.js (the backend targets ES2020, CommonJS), and access to the Supabase project plus the
Stripe, Cloudinary and Brevo credentials.

> [!warning] There is no `.env.example` in either app
> The required variables are not discoverable from the repository — they are reconstructed by
> reading the code. Both lists are in [[../00-core/Deployment|Deployment]]. Get the actual
> values from a teammate, never from a commit. `TODO-014`.

## Start both apps

There is **no root `package.json`** — install and run each app separately, in two terminals.

**Backend** (port 4000):

```bash
cd backend
npm install
npm run dev          # nodemon --exec ts-node src/index.ts
```

**Frontend** (port 3000):

```bash
cd frontend
npm install
npm run dev          # next dev
```

The frontend needs `NEXT_PUBLIC_API_URL=http://localhost:4000`, and the backend needs
`FRONTEND_URL=http://localhost:3000` — the latter is the **only** allowed CORS origin, so a
mismatch presents as every API call failing in the browser with a CORS error.

## Verify it is up

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"connected","timestamp":"…"}
```

`db: "unreachable"` with a 503 means `DATABASE_URL` is wrong or Supabase is unreachable — the
process starts either way, because the pool's startup check logs but does not exit.

## Database

> [!warning] Local development appears to share the production database
> Nothing in the repository provisions a second Supabase project or a local PostgreSQL.
> Treat every local schema change as production-affecting until this is confirmed otherwise.
> `TODO-035`.

To stand up a schema from scratch, see [[Database_Setup]].

## Mock auth

Both apps have a development bypass, and **both switches must be set** — they are independent:

- **Backend:** `ALLOW_MOCK_AUTH=true` **and** `NODE_ENV !== 'production'`. Then the literal
  token `mock-token` authenticates as a hard-coded UUID and is treated as `admin` by
  `requireRole` regardless of the roles requested.
- **Frontend:** `MOCK_ENABLED` in `frontend/lib/mockAuth.ts` — a **hard-coded constant**,
  currently `false`. Changing it requires editing the file and restarting.

Which fixture is active is also hard-coded (`ACTIVE_MOCK_USER = mockUsers.admin`). See
`TODO-013`.

## Stripe webhooks locally

Stripe cannot reach `localhost`, so the webhook never fires without forwarding:

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

The CLI prints a signing secret — put it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`. Without
it, checkout completes at Stripe but no registration is ever created, because settlement happens
only in the webhook.

## Build

```bash
cd backend  && npm run build   # tsc → dist/, then: npm start
cd frontend && npm run build   # next build,   then: npm start
```

`npm run build` is currently the only automated correctness check in the project — it runs
`tsc` with `strict: true`. There is no test suite and no CI
([[../00-core/Testing_Strategy|Testing_Strategy]]).

## Common problems

| Symptom | Cause |
|---|---|
| Every API call fails with a CORS error | `FRONTEND_URL` does not exactly match the browser origin |
| `401` on every authenticated call | Supabase token expired, or `SUPABASE_SERVICE_ROLE_KEY` wrong |
| `500 Auth service unavailable` | Supabase unreachable — `requireAuth` calls it per request |
| Payment completes but no registration | Webhook not forwarded, or `STRIPE_WEBHOOK_SECRET` unset |
| `503` from `/health` | `DATABASE_URL` wrong or Supabase unreachable |
| Type error only in the frontend build | The two copies of `shared/types.ts` have drifted — `TODO-001` |
