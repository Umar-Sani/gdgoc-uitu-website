// Post-login redirect targets come from `?redirect=` — attacker-controllable, so
// `/login?redirect=https://evil.test` must not bounce a freshly authenticated user off-site.
// Only same-site absolute paths are accepted; everything else returns null (use the default).
//
// Rejected on purpose: scheme-relative `//host`, backslash tricks `/\host` (browsers treat
// a backslash as a slash), any scheme (`https:`, `javascript:`), and control characters.
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null
  return value
}
