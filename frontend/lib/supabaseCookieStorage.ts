import {
  combineChunks,
  createChunks,
  stringFromBase64URL,
  stringToBase64URL,
  DEFAULT_COOKIE_OPTIONS,
} from '@supabase/ssr'

// Cookie-backed storage for the Supabase browser client (TODO-004).
//
// Why this exists: the default supabase-js storage is localStorage, which the Next.js
// server can never see, so route protection could only run after hydration. Storing the
// session in a cookie lets `proxy.ts` verify it before any HTML is served.
//
// Why not `createBrowserClient` from @supabase/ssr: it hard-codes the PKCE flow, which
// changes how email-verification and password-reset links work (they stop working when
// opened on a different device than the one that requested them). This keeps the existing
// implicit flow and only swaps where the session is persisted. The cookie format
// (`base64-` + base64url JSON, chunked at ~3.2 KB) is exactly what @supabase/ssr's
// createServerClient reads, so the server side needs no custom parsing.
//
// The cookie is deliberately NOT HttpOnly — supabase-js must read and refresh it in the
// browser. That is the same exposure the session had in localStorage.

const PREFIX = 'base64-'

function readAll(): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof document === 'undefined' || !document.cookie) return out
  for (const part of document.cookie.split('; ')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    try {
      out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1))
    } catch {
      /* skip malformed cookie */
    }
  }
  return out
}

function write(name: string, value: string, maxAge: number) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Path=${DEFAULT_COOKIE_OPTIONS.path}` +
    `; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

// Removes the base cookie and every numbered chunk (`key.0`, `key.1`, …).
function clear(key: string) {
  const names = Object.keys(readAll()).filter((n) => n === key || n.startsWith(`${key}.`))
  for (const n of names) write(n, '', 0)
}

export const supabaseCookieStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof document === 'undefined') return null

    const all = readAll()
    const stored = await combineChunks(key, (name) => all[name])
    if (stored) {
      return stored.startsWith(PREFIX) ? stringFromBase64URL(stored.slice(PREFIX.length)) : stored
    }

    // One-time migration: sessions created before this change live in localStorage.
    // Move them to the cookie so existing users are not signed out by the deploy.
    try {
      const legacy = window.localStorage.getItem(key)
      if (legacy) {
        await supabaseCookieStorage.setItem(key, legacy)
        window.localStorage.removeItem(key)
        return legacy
      }
    } catch {
      /* storage unavailable — treat as signed out */
    }
    return null
  },

  async setItem(key: string, value: string): Promise<void> {
    if (typeof document === 'undefined') return
    // Clear first so a shorter value does not leave stale trailing chunks behind.
    clear(key)
    const encoded = PREFIX + stringToBase64URL(value)
    for (const chunk of createChunks(key, encoded)) {
      write(chunk.name, chunk.value, DEFAULT_COOKIE_OPTIONS.maxAge ?? 400 * 24 * 60 * 60)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof document === 'undefined') return
    clear(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}
