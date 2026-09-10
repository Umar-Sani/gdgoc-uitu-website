// Inserts a Cloudinary transformation string into a Cloudinary delivery URL, e.g.
// cldUrl(url, 'w_400,q_auto,f_auto') turns
// https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg into
// https://res.cloudinary.com/<cloud>/image/upload/w_400,q_auto,f_auto/v123/folder/name.jpg
//
// Cloudinary resizes/recompresses on the fly at request time and caches the result at
// its edge — this is the standard way to get responsive, optimized delivery from
// Cloudinary, and needs no next/image involvement. Safe to call on any string: URLs
// that aren't Cloudinary delivery URLs (e.g. Google OAuth avatars) are returned
// unchanged rather than mangled.
const UPLOAD_MARKER = '/image/upload/';

export function cldUrl(url: string | null | undefined, transform: string): string | null {
  if (!url) return null;
  const idx = url.indexOf(UPLOAD_MARKER);
  if (idx === -1) return url;
  const cut = idx + UPLOAD_MARKER.length;
  return url.slice(0, cut) + transform + '/' + url.slice(cut);
}

// Common transforms, named by where they're used rather than by pixel size, so a
// future size tweak has one place to change rather than a grep-and-replace.
//
// q_auto:best (not plain q_auto, which defaults to a more aggressive "good" tier) on
// every preset — quality is prioritized over squeezing out the last bit of size here,
// matching next/image's WebP-at-quality-80 static assets rather than being noticeably
// softer than them.
export const CLD_AVATAR = 'w_160,h_160,c_fill,g_face,q_auto:best,f_auto';
export const CLD_AVATAR_LARGE = 'w_500,h_500,c_fill,g_face,q_auto:best,f_auto';
export const CLD_EVENT_CARD = 'w_800,c_fill,q_auto:best,f_auto';
// Hero banner renders full-viewport-width (w-full h-full, no max-width cap), so on any
// desktop screen a too-small request gets upscaled by the browser — the same class of
// bug as the MissionScroll aspect-ratio fix. 1920 covers up to a 1080p-wide viewport
// without upscaling; quality is bumped further than the other presets since this is
// the most visually prominent, most cropped-in image on the site.
export const CLD_EVENT_HERO = 'w_1920,c_fill,q_auto:best,f_auto';
export const CLD_LOGO = 'w_400,c_fit,q_auto:best,f_auto';
export const CLD_THUMB = 'w_200,c_fill,q_auto:best,f_auto';
