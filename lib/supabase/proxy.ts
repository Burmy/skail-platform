import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  getLegacySupabaseAuthCookieName,
  isChunkLikeCookieName,
  supabaseCookieOptions,
} from '@/lib/supabase/cookie-config'
import type { Database } from '@/lib/supabase/database.types'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from '@/lib/supabase/env'

const publicPaths = ['/login', '/signup', '/auth']

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname.startsWith(path))
}

function getLegacyAuthCookiesToClear(request: NextRequest) {
  const legacyCookieName = getLegacySupabaseAuthCookieName()

  if (!legacyCookieName || legacyCookieName === supabaseCookieOptions.name) {
    return []
  }

  return request.cookies
    .getAll()
    .filter(({ name }) => isChunkLikeCookieName(name, legacyCookieName))
    .map(({ name }) => name)
}

function getAuthCookiesByBaseName(request: NextRequest, baseName: string) {
  return request.cookies
    .getAll()
    .filter(({ name }) => isChunkLikeCookieName(name, baseName))
    .map(({ name }) => name)
}

function clearAuthCookies(response: NextResponse, cookieNames: string[]) {
  const uniqueCookieNames = Array.from(new Set(cookieNames))

  uniqueCookieNames.forEach((name) => {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    })
  })
}

export async function updateSession(request: NextRequest) {
  const legacyAuthCookies = getLegacyAuthCookiesToClear(request)
  let supabaseResponse = NextResponse.next({
    request,
  })
  clearAuthCookies(supabaseResponse, legacyAuthCookies)

  if (!hasSupabasePublicEnv()) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })
          clearAuthCookies(supabaseResponse, legacyAuthCookies)

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()

  const pathname = request.nextUrl.pathname

  const invalidCurrentAuthCookies = data?.claims
    ? []
    : getAuthCookiesByBaseName(request, supabaseCookieOptions.name)
  const authCookiesToClear = [...legacyAuthCookies, ...invalidCurrentAuthCookies]
  clearAuthCookies(supabaseResponse, authCookiesToClear)

  if (!data?.claims && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    )

    const redirectResponse = NextResponse.redirect(redirectUrl)
    clearAuthCookies(redirectResponse, authCookiesToClear)

    return redirectResponse
  }

  return supabaseResponse
}
