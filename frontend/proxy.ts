import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { MOCK_ENABLED } from '@/lib/mockAuth'

// Server-side route protection (TODO-004). In Next.js 16 this file convention is `proxy.ts`
// (formerly `middleware.ts`). It runs before the page is rendered, so protected HTML is no
// longer served to anonymous visitors.
//
// This is the first gate, not the only one: the client layouts still redirect, and every
// API route still enforces auth and roles. It only decides who gets the page shell.

const ADMIN_ROLES = new Set(['editor', 'admin', 'super_admin'])

function redirectTo(request: NextRequest, path: string, search = '') {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = search
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  // Local-only mock mode has no real session to verify. MOCK_ENABLED is a build-time
  // `false` in production bundles, so this branch cannot exist there.
  if (MOCK_ENABLED) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // If the access token had expired, getUser() refreshes it; persist the rotated
        // tokens on both the forwarded request and the response so the browser keeps them.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // getUser() validates the JWT with Supabase Auth — unlike getSession(), which only
  // decodes whatever the cookie claims and must never be trusted on the server.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user) {
    // `redirect` is read by the login page. Only same-site paths are ever produced here.
    return redirectTo(request, '/login', `?redirect=${encodeURIComponent(pathname + search)}`)
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const { data: { session } } = await supabase.auth.getSession()
    let role: string | null = null
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        cache: 'no-store',
      })
      if (res.ok) role = (await res.json())?.data?.role_name ?? null
    } catch {
      /* fall through: role stays null → denied */
    }

    // Fail closed: an unreachable API or unknown role never grants admin HTML.
    if (!role || !ADMIN_ROLES.has(role)) {
      return redirectTo(request, '/dashboard')
    }
  }

  // Authenticated, role-dependent HTML must not be stored by shared caches.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*'],
}
