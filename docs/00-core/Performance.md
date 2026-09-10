# Performance

> Current state, verified against the code on 2026-09-10. See [[../START_HERE|START_HERE]] for
> the precedence rule when documents disagree.

## Purpose

Standing performance rules for this codebase — decided once so they don't need re-deciding on
every PR. Currently covers images only; expand this file as other performance work
(caching, bundle size, DB query performance) lands rather than starting a parallel document.

## Images — the rule

Source reference: `ProjectDocs/Image-Optimization.pdf` (Zeeshan Ali, "Frontend System Design:
Image Optimization — Performance"). The rules below are the subset of that document actually
adopted here, adapted to what this stack already gives for free.

> [!note] `next/image` already implements most of the PDF's advice
> Next.js's built-in image optimizer generates responsive `srcset`s, negotiates AVIF/WebP via
> the `Accept` header, lazy-loads by default, and prevents layout shift when `width`/`height`
> are set. The rule below is "use it", not "reimplement it".

**1. New images go through `next/image`, not a bare `<img>`.**
Exception: elements a component manipulates directly via DOM refs/GSAP where `next/image`'s
`fill`/intrinsic-size model doesn't fit cleanly (sprite-frame swaps, mask-reveal animations).
When skipping `next/image` for this reason, the image file itself must still be WebP/AVIF and
pre-compressed — the exception is about the React wrapper, not about shipping an unoptimized
asset.

**2. Mark every image inside the page's top/hero section `priority` — never leave it to
default.** `next/image` lazy-loads by default *regardless of scroll position on load*; only an
explicit `priority` prop makes it fetch immediately (via a `<link rel="preload">`) instead of
waiting for an Intersection Observer to fire. It is fine for more than one image on a page to be
`priority` if more than one genuinely sits in the hero/header — the "one LCP image" framing from
the source PDF assumes a single hero image, which does not hold for pages that have both a logo
and a decorative header graphic. Judge by page position ("does this render inside the first
screenful on load"), not by role ("is this decorative") — a decorative mascot inside the page
header still needs `priority`; only mascots/graphics that are actually further down the page
(passed a scroll trigger, inside a below-the-fold section) should stay lazy.

> [!bug] Four page-header mascots were lazy-loading despite being above-the-fold (fixed
> 2026-09-10)
> `about`, `contact`, `events`, and `forum` each have a mascot `<Image>` positioned inside the
> page's own top/hero block (`about/page.tsx:154`, `contact/page.tsx:96`,
> `events/page.tsx:309`, `forum/page.tsx:547`) — visible on initial page load, not something the
> user scrolls to. All four were classified as "decorative below-the-fold" and given a blur
> placeholder with no `priority`, which is wrong: they're decorative, but not below-the-fold.
> `next/image`'s default (no `priority`) is lazy regardless of layout position, so all four were
> genuinely delaying their own load on every visit to those four pages. Fixed by adding
> `priority` and removing the now-pointless blur placeholder (a `priority` image loads near
> instantly, so blur is noise) from all four. Caught by the user noticing real load delay on the
> live preview, not by any check this project runs automatically — there is no LCP/lazy-loading
> audit in CI, so this class of mistake will recur silently unless checked for by eye on every
> new page.

**3. Static assets in `frontend/public/images/` are WebP.** Run
`npm run images:webp` (in `frontend/`, wraps `scripts/convert-to-webp.mjs`) after adding any new
PNG/JPEG to that directory, then reference the `.webp` output. The script re-encodes at quality
80, which the source document's compression-quality table lists as the sweet spot for WebP.
Keep the original PNG/JPEG next to it if it's still used as a fallback source elsewhere;
otherwise delete the original once every reference is repointed.

**4. All Cloudinary uploads get `quality: 'auto', fetch_format: 'auto'`.** Set once in
`backend/src/routes/upload.ts`'s single upload route — every upload path in the app funnels
through this one route, so this is the only place the transform needs to be applied. Do not
re-derive per-caller transforms; if a caller needs a specific crop/size, add Cloudinary URL
transformation parameters at *read* time (e.g. `w_400,c_fill`), not by changing the upload
transform.

**4a. Every Cloudinary-hosted image is rendered through `cldUrl()`, not its raw `secure_url`.**
`lib/cloudinary-url.ts` inserts a size/crop/quality transform into the URL's `/image/upload/`
segment — Cloudinary resizes and recompresses on the fly at request time and caches the result
at its edge, which is the standard way to get responsive delivery from Cloudinary. This is a
**different mechanism from `next/image`** — do not wrap a Cloudinary image in `next/image`; that
would run it through two resizing pipelines for no benefit. `cldUrl()` is a no-op (returns the
input unchanged) on any URL that isn't a Cloudinary delivery URL, so it's safe to call
unconditionally on a field that might hold a Google OAuth avatar or a local `blob:` preview
during upload — never assume every `avatar_url` is Cloudinary-hosted. Pick the transform by
context, not by copy-pasting whatever the nearest call site used: `CLD_AVATAR` (128px) for small
avatars, `CLD_AVATAR_LARGE` (400px) for profile-page-sized ones, `CLD_EVENT_CARD` (600px) for
card thumbnails, `CLD_EVENT_HERO` (1200px) for full-width banners, `CLD_LOGO` (300px, fit not
fill) for sponsor logos, `CLD_THUMB` (150px) for small list-row thumbnails.

**5. Filenames referencing `frontend/public/images/*` must match on-disk casing exactly.**
Windows and macOS default filesystems are case-insensitive; Vercel's Linux build is not. Two
pre-existing mismatches were found and fixed while doing this work (`Android WOMAN Standing
Still.png` referenced vs. `...still.png` on disk; `Android%20Running/` referenced vs.
`Android running/` on disk) — both worked locally and would have 404'd in production. When
adding a new asset, copy the filename from a directory listing, not from memory or a mockup.

**6. `next/image` calls for anything below-the-fold or heavier than a logo get a blur
placeholder.** Look it up via `blurDataURL()` from `lib/blur-placeholder.ts` (backed by
`lib/blur-placeholders.json`, a 16x16 WebP thumbnail per asset). Regenerate the JSON with
`npm run images:blur` after adding or re-converting images — it's not run automatically, so a
new image without a regenerated JSON just renders with no blur (`empty` placeholder), never a
crash. Skip this for small `priority` images (logos) — they load essentially instantly, so a
blur flash is more visual noise than benefit.

**7. `width`/`height` passed to `next/image` must be the source image's real aspect ratio,
never a guessed placeholder value.** Next uses these two numbers to pick which `srcset` entry
to request — a wrong aspect ratio (e.g. one hardcoded landscape size applied to a mix of
portrait and landscape photos) causes the optimizer to serve an undersized or wrongly-cropped
buffer that then gets stretched by CSS, which reads as low quality regardless of format
(AVIF/WebP/JPEG). When a component renders a *set* of differently-shaped images (a carousel, a
gallery), give each one its own real `width`/`height` — never share one guessed pair across all
of them. Check real dimensions with `sharp(file).metadata()`, not by eyeballing the file.

**8. `sizes` must match the image's real rendered width, and should err generous, not exact.**
`next/image` trusts `sizes` completely — it has no way to inspect actual layout, so a `sizes`
value smaller than the real CSS width causes a genuinely undersized `srcset` request that gets
upscaled by the browser and reads as low quality, independent of source resolution or format.
Bias `sizes` to roughly 1.5x the real rendered width rather than matching it exactly: on
photographic content, quality here matters more than shaving the last bit of bandwidth, and a
generous `sizes` fails safe (costs bytes) where an exact or tight one fails visibly (costs
quality). Recompute `sizes` any time a component's width classes change — it does not update
itself.

- Converted all 35 raster assets in `frontend/public/images/` to WebP
  (`frontend/scripts/convert-to-webp.mjs`, quality 80). Total static image weight dropped from
  ~19.8MB to ~7.9MB (~60%) before Next's own AVIF/responsive negotiation is even applied on top.
- Swapped `<img>` → `next/image` for all safely-convertible call sites: all site logos (navbar,
  admin/member sidebars, footer), the four page-mascot decorations (`about`, `contact`,
  `events`, `forum`), `ParallaxBackdrop`, and `MissionScroll`'s event-photo carousel.
- Left `<img>` in place (extension-only fix to `.webp`) for: `WhoWeAre.tsx`'s hover-swap logo
  flip and building-silhouette/large-logo decorations, `AndroidRunner.tsx` /
  `CactusRunner.tsx`'s sprite-frame animations, and `page.tsx`'s ink-mask-reveal hero images —
  all of these are directly DOM/GSAP-manipulated in ways that don't fit `next/image` cleanly.
- Fixed the two case-sensitivity bugs noted in rule 5 above.
- Added `quality: 'auto', fetch_format: 'auto'` to the Cloudinary upload route
  (`backend/src/routes/upload.ts`).
- Added `minimumCacheTTL: 31536000` to `next.config.mjs`'s `images` block (optimized variants
  are immutable per source URL, so a long CDN cache is safe).
- Added `loading="lazy"` to the two `WhoWeAre.tsx` marquee frames that sit off-screen at load
  (the horizontal-scroll track's building silhouette and final UITU-logo flip). Left the other
  `<img>` holdouts on their default `eager` behavior since they're genuinely above-the-fold
  (hero ink-mask images, `CactusRunner`'s obstacle sprites in the `about` page header, and
  `WhoWeAre`'s opening "WE ARE" logo frame).
- Added blur placeholders (rule 6) to every `next/image` call site added in this work except
  the small `priority` logos: `ParallaxBackdrop`, `MissionScroll`'s photo carousel, and the four
  page-mascot decorations. Generated via a new script, `scripts/generate-blur-placeholders.mjs`,
  which writes `lib/blur-placeholders.json`; looked up through `lib/blur-placeholder.ts`.
- Added `lib/cloudinary-url.ts` (rule 4a) and applied it to every Cloudinary-hosted image
  render site across the whole frontend (~30 call sites): event banners/cards, team and forum
  avatars, sponsor logos, featured events, and every admin CMS upload preview (the last group
  in one place, `components/ui/ImageUpload.tsx`, which every admin form reuses). This closes a
  gap the original static-asset work didn't touch at all — before this, every Cloudinary image
  in the app was served at full upload resolution to every device, regardless of display size.

> [!bug] `MissionScroll`'s photo carousel was serving visibly degraded images (fixed — twice)
> Two separate bugs stacked here, and the first fix didn't fully solve it — worth recording both
> since the wrong diagnosis was tried first.
>
> **Bug 1 (aspect ratio).** Every one of the ten `next/image` slots had been given the same
> hardcoded `width={480} height={320}` (a 3:2 landscape guess), but the real source photos range
> from `4032x3024` landscape to `3000x4000` portrait. Fixed by measuring each photo's real
> dimensions with `sharp(file).metadata()` and giving every slot its own correctly-proportioned
> `width`/`height` (rule 7).
>
> **Bug 2 (the actual main cause).** After fixing bug 1, images were still visibly soft. AVIF was
> suspected and removed from `next.config.mjs` — **this was the wrong diagnosis and was
> reverted.** The real cause: the `sizes` prop was a single hardcoded string
> (`"(min-width: 1280px) 320px, ..."`) that didn't match the slots' actual Tailwind width classes
> (`xl:w-[30rem]` = 480px, not 320px). `next/image` trusts `sizes` completely — it has no way to
> know the real rendered width, so an under-declared `sizes` makes it deliberately request a
> smaller `srcset` entry than the image actually displays at, which a browser then upscales via
> CSS. That upscaling is what read as low quality, on every format, AVIF included — AVIF was
> never the problem. Fixed by giving each slot a `sizes` value intentionally ~1.5x its real
> rendered width (not an exact match — a generous bias means a future small miscalculation costs
> bandwidth, not visible quality).

**Left for a later session** (filed as `TODO-050`): four static assets confirmed unreferenced
anywhere in the frontend — `Android Doind Society Stuff.png`, `Android Doind Society
Stuff11.png`, `human doing society stuff.png`, and both `GDGoC Logo with...Mascot.png` files.
Not deleted in this pass to keep the branch scoped to optimization, not cleanup.

> [!note] The original PNG/JPEG files are still in the repo, deliberately
> Every code reference now points at the `.webp` output, so the original PNG/JPEG files in
> `frontend/public/images/` are currently unreferenced dead weight (~12MB) — kept intentionally
> as a rollback/comparison safety net for a few sessions rather than deleted immediately. Once
> the WebP swap has been confirmed visually correct in production, delete the originals in a
> small follow-up commit (they're recoverable from git history regardless).

## Related

- [[../01-planning/TODO|TODO-049]] — this work item
- [[../01-planning/TODO|TODO-050]] — dead asset / dead table cleanup, not yet done
- [[Architecture]] — where this fits in the wider stack
