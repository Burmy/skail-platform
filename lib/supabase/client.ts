import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-config'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from '@/lib/supabase/env'

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        encode: 'tokens-only',
      },
    },
  )
}
