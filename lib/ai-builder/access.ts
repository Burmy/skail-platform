import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getThemePermissions } from '@/lib/theme/permissions'
import { canApplyAiBuilderChanges } from '@/lib/ai-builder/permissions'

export type AiBuilderAccess =
  | {
      ok: true
      admin: ReturnType<typeof createAdminClient>
      roleKey: string
      user: {
        id: string
        email?: string
      }
      canApply: boolean
      canManageLayouts: boolean
    }
  | {
      ok: false
      status: number
      message: string
    }

export async function requireAiBuilderAccess(
  workspaceId: string,
): Promise<AiBuilderAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      status: 401,
      message: 'Sign in before using AI Builder.',
    }
  }

  const { data: membership, error } = await supabase
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      status: 500,
      message: error.message,
    }
  }

  if (!membership) {
    return {
      ok: false,
      status: 403,
      message: 'You do not have access to this workspace.',
    }
  }

  try {
    const permissions = getThemePermissions(membership.role_key)

    return {
      ok: true,
      admin: createAdminClient(),
      roleKey: membership.role_key,
      user: {
        id: user.id,
        email: user.email,
      },
      canApply: canApplyAiBuilderChanges(membership.role_key),
      canManageLayouts: permissions.canManageLayouts,
    }
  } catch (adminError) {
    return {
      ok: false,
      status: 500,
      message:
        adminError instanceof Error
          ? adminError.message
          : 'Supabase admin writes are not configured.',
    }
  }
}
