import placeholders from './blur-placeholders.json';

// Looks up a pre-generated LQIP data URI for a public/images path (see
// scripts/generate-blur-placeholders.mjs). Keys in the JSON are literal
// filesystem paths, but call sites often pass %20-encoded src strings, so
// decode before lookup. Falls back to undefined so a missing entry just
// means no blur, not a crash.
export function blurDataURL(src: string): string | undefined {
  return (placeholders as Record<string, string>)[decodeURIComponent(src)];
}
