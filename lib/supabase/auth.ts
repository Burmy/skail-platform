import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from '@/lib/supabase/env'

export function createStatelessAuthClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
}
