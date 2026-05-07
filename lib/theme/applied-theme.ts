import { createClient } from '@/lib/supabase/server'
import { parseTheme, type ThemeWithTokens } from '@/lib/theme/types'

export async function getAppliedWorkspaceTheme(
  workspaceId?: string | null,
): Promise<ThemeWithTokens | null> {
  if (!workspaceId) {
    return null
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    return null
  }

  const themes = data?.map((theme) => parseTheme(theme, user.id)) ?? []
  const personalTheme =
    themes.find(
      (theme) =>
        theme.tokens.scope === 'personal' && theme.tokens.userId === user.id,
    ) ?? null
  const sharedTheme =
    themes.find(
      (theme) => theme.is_default && theme.tokens.scope === 'shared',
    ) ?? null

  return personalTheme ?? sharedTheme
}
