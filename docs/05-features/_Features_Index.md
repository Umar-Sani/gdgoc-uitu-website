# Features Index

One folder per feature, seven files each — see [[_PSP_Template]].

| Feature | OST | FST | SST | LST | API | Security | Tests |
|---|---|---|---|---|---|---|---|
| [[event-registration-and-payment/OST\|Event registration and payment]] | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Only one feature is documented in depth. It was chosen because it is the most substantial
shipped feature, the only one that moves money, and the only one whose correctness depends on
concurrency control — so it has the highest cost of being misunderstood.

## Shipped features with no folder yet

These are **implemented and running in production**. They have no PSP folder because nobody has
written one, which is a documentation gap and nothing more.

| Feature | Where it lives | Why it deserves a folder |
|---|---|---|
| Forum | `backend/src/routes/forum.ts`; `frontend/app/(public)/forum/*` | Threaded replies, upvote toggling, full-text search over a trigger-maintained `tsvector`, soft-delete moderation, denormalised counters kept by three triggers |
| Notifications | `backend/src/lib/notifications.ts`, `routes/notifications.ts`; `components/ui/NotificationBell.tsx` | Seven types with a non-obvious preference model — in-app is opt-out, email is opt-in, and `registration_confirmed` overrides both |
| Authentication and onboarding | `middleware/auth.ts`; `context/AuthContext.tsx`; `app/(auth)/*`, `app/auth/callback` | Supabase delegation, the OAuth code-exchange dance, and the complete-profile gate |
| Admin panel and RBAC | `routes/admin.ts`; `app/(admin)/*` | A flat role allow-list with several per-route exceptions; the guard matrix is exactly where `BUG-007` hid |
| CMS | `routes/cms.ts`; `app/(admin)/admin/cms/*` | Eight editable content types, two similarly-named resources (`/cms/team` vs `/cms/teams`), and a transactional rename cascade |
| Event management | `routes/events.ts` (admin half); `app/(admin)/admin/events/*` | Publish-time fan-out email to newsletter subscribers; the draft→published transition has side effects |
| AI recommendations | `public.generate_ai_recommendations`; `routes/users.ts` | A scoring formula with a documented NULL-propagation edge case that silently drops category-only matches |

Tracked as `TODO-040`.

> [!important] Do not treat their absence here as evidence they do not exist
> Check the code and [`../../handoff.md`](../../handoff.md). This index reflects what has been
> **documented**, not what has been **built**.

## Maintenance rule

Add a new feature here as soon as its folder is created, even before all seven files are filled
in — an empty row with a folder is honest; a missing row is misleading.
