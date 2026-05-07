import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { getSupabaseUrl } from '@/lib/supabase/env'

function getJwtRole(key: string) {
  if (!key.startsWith('eyJ')) {
    return null
  }

  try {
    const payload = key.split('.')[1]
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(
      Buffer.from(normalizedPayload, 'base64').toString('utf8'),
    ) as { role?: unknown }

    return typeof claims.role === 'string' ? claims.role : null
  } catch {
    return null
  }
}

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  const role = getJwtRole(serviceRoleKey)

  if (role && role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is currently a ${role} key. Replace it with the real service_role key.`,
    )
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
