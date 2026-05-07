import { getSupabaseUrl } from '@/lib/supabase/env'

export const SUPABASE_AUTH_COOKIE_NAME = 'skail-auth'

export const supabaseCookieOptions = {
  name: SUPABASE_AUTH_COOKIE_NAME,
  path: '/',
  sameSite: 'lax' as const,
}

export function getLegacySupabaseAuthCookieName() {
  try {
    const hostname = new URL(getSupabaseUrl()).hostname
    const projectRef = hostname.split('.')[0]

    if (!projectRef) {
      return null
    }

    return `sb-${projectRef}-auth-token`
  } catch {
    return null
  }
}

export function isChunkLikeCookieName(cookieName: string, baseName: string) {
  return cookieName === baseName || cookieName.startsWith(`${baseName}.`)
}
