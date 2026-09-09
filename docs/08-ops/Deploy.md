# Runbook — Deploy

> [!warning] Only the frontend half of this runbook is verified
> The backend hosting target could not be determined from the repository — there is no
> Dockerfile, CI workflow, `railway.json`, Procfile, or any deploy manifest. Rather than invent
> a procedure, the backend section records what is known and what must be discovered.
> `TODO-036`, `TODO-041`.

## Before any deploy

There is **no CI**, so nothing has verified the change. At minimum, run locally:

```bash
cd backend  && npm run build    # tsc, strict
cd frontend && npm run build    # next build
```

If either fails, stop. `npm run build` is the only automated check this project has
([[../00-core/Testing_Strategy|Testing_Strategy]]).

Also confirm the two copies of `shared/types.ts` still agree — nothing enforces it (`TODO-001`):

```bash
diff shared/types.ts frontend/shared/types.ts
```

## Frontend — Vercel ✅

Vercel builds from GitHub on push. The project is configured with the **frontend directory as
the build root**, which is why `shared/types.ts` had to be vendored into `frontend/shared/`
(commit `72b3eec`, [[../04-decisions/ADR-005-Vendored-Shared-Types|ADR-005]]).

Required environment variables in the Vercel project:

| Variable | Note |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `NEXT_PUBLIC_API_URL` | Must point at the deployed backend, not localhost |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Currently referenced by no source file |

`next.config.mjs` allows remote images only from `res.cloudinary.com` and
`lh3.googleusercontent.com` — a new image host requires a code change and redeploy.

**Verify after deploy:** load the landing page, the events list, and a forum thread. All three
read through the API, so they exercise CORS and `NEXT_PUBLIC_API_URL` together.

## Backend — target unverified ⚠️

What is known:

- `npm run build` compiles `src/` → `dist/` (`tsc`, `rootDir: ./src`, `outDir: ./dist`).
- `npm start` runs `node dist/index.js`.
- It listens on `process.env.PORT || 4000`, with no host binding argument.
- It needs the 18 environment variables listed in [[../00-core/Deployment|Deployment]].

What must be discovered before this runbook is trustworthy: the actual host, how a deploy is
triggered, where environment variables are set, and whether TLS terminates at a proxy.

Two settings that **must** be correct in any production environment:

| Variable | Why it matters |
|---|---|
| `NODE_ENV=production` | Enables database TLS certificate validation **and** disables the `mock-token` auth bypass |
| `FRONTEND_URL` | The only permitted CORS origin, and the base for Stripe return URLs |

Once the host is known, also set `trust proxy` to the correct hop count — without it, IP rate
limiting buckets all traffic behind the proxy together ([[../01-planning/bugs|BUG-008]]).

## Stripe webhook

The webhook endpoint must be registered in the Stripe dashboard pointing at
`<backend-url>/api/payments/webhook`, and its signing secret set as `STRIPE_WEBHOOK_SECRET`.

If this is wrong, **checkout completes at Stripe but no registration is ever created**, and
nothing alerts anyone — settlement happens only in the webhook. Verify with a real test payment
after any backend URL change.

## Database changes

Apply by hand — see [[Database_Setup]]. There is no migration step in any deploy pipeline, so
schema changes and code changes are **not** atomic. Deploy order matters: apply additive schema
changes before the code that uses them.

## Post-deploy verification

```bash
curl <backend-url>/health          # {"status":"ok","db":"connected",…}
```

Then manually: sign in, load the dashboard, and — if payments changed — complete one test
checkout end to end and confirm the registration and invoice number appear. Nothing automated
covers this path ([[../05-features/event-registration-and-payment/Tests|Tests]]).

## If it goes wrong

See [[Rollback]] — and read it before you need it, because it is currently a stub.
