import { redirect } from 'next/navigation'

import { getLayoutBuilderData } from '@/lib/layout/queries'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces, requireUser } from '@/lib/workspaces/queries'
import { getThemePermissions, type ThemePermissions } from '@/lib/theme/permissions'
import {
  parsePageStyle,
  parseTheme,
  parseThemeTokens,
  parseViewStyle,
  parseWidgetStyle,
  type PageStyleWithConfig,
  type ThemeWithTokens,
  type ViewStyleWithConfig,
  type WidgetStyleWithConfig,
} from '@/lib/theme/types'

export type ThemeStylingData = NonNullable<
  Awaited<ReturnType<typeof getLayoutBuilderData>>
> & {
  sharedTheme: ThemeWithTokens | null
  personalTheme: ThemeWithTokens | null
  fallbackThemeTokens: ReturnType<typeof parseThemeTokens>
  pageStyles: PageStyleWithConfig[]
  widgetStyles: WidgetStyleWithConfig[]
  viewStyles: ViewStyleWithConfig[]
  permissions: ThemePermissions
}

export async function getWorkspaceIdForThemePage(workspaceId?: string) {
  if (workspaceId) {
    return workspaceId
  }

  const { workspaces } = await getUserWorkspaces()
  const firstWorkspace = workspaces[0]

  if (!firstWorkspace) {
    redirect('/workspaces/new')
  }

  redirect(`/settings/theme?workspace_id=${firstWorkspace.id}`)
}

export async function getThemeStylingData(
  workspaceId: string,
): Promise<ThemeStylingData | null> {
  const [{ user }, layoutData] = await Promise.all([
    requireUser(),
    getLayoutBuilderData(workspaceId),
  ])

  if (!layoutData) {
    return null
  }

  const supabase = await createClient()
  const pageIds = layoutData.pages.map((page) => page.id)
  const widgetIds = layoutData.pages.flatMap((page) =>
    page.widgets.map((widget) => widget.id),
  )
  const viewIds = layoutData.views.map((view) => view.id)

  const [themesResult, pageStylesResult, widgetStylesResult, viewStylesResult] =
    await Promise.all([
      supabase
        .from('themes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      pageIds.length > 0
        ? supabase
            .from('page_style_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .in('page_id', pageIds)
        : { data: [], error: null },
      widgetIds.length > 0
        ? supabase
            .from('widget_style_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .in('widget_id', widgetIds)
        : { data: [], error: null },
      viewIds.length > 0
        ? supabase
            .from('view_style_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .in('view_id', viewIds)
        : { data: [], error: null },
    ])

  if (themesResult.error) {
    throw new Error(themesResult.error.message)
  }

  if (pageStylesResult.error) {
    throw new Error(pageStylesResult.error.message)
  }

  if (widgetStylesResult.error) {
    throw new Error(widgetStylesResult.error.message)
  }

  if (viewStylesResult.error) {
    throw new Error(viewStylesResult.error.message)
  }

  const sharedTheme =
    themesResult.data
      ?.map((theme) => parseTheme(theme))
      .find((theme) => theme.is_default && theme.tokens.scope === 'shared') ?? null
  const personalTheme =
    themesResult.data
      ?.map((theme) => parseTheme(theme, user.id))
      .find(
        (theme) =>
          theme.tokens.scope === 'personal' &&
          theme.tokens.userId === user.id,
      ) ?? null

  return {
    ...layoutData,
    sharedTheme,
    personalTheme,
    fallbackThemeTokens: parseThemeTokens(null),
    pageStyles: pageStylesResult.data?.map(parsePageStyle) ?? [],
    widgetStyles: widgetStylesResult.data?.map(parseWidgetStyle) ?? [],
    viewStyles: viewStylesResult.data?.map(parseViewStyle) ?? [],
    permissions: getThemePermissions(layoutData.roleKey),
  }
}
