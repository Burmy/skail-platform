import { notFound } from 'next/navigation'

import { ThemeStylingEngine } from '@/components/theme/theme-styling-engine'
import {
  getThemeStylingData,
  getWorkspaceIdForThemePage,
} from '@/lib/theme/queries'

export const dynamic = 'force-dynamic'

const themeSections = ['theme', 'pages', 'widgets', 'views', 'ai'] as const

function parseThemeSection(value?: string) {
  return themeSections.includes(value as (typeof themeSections)[number])
    ? (value as (typeof themeSections)[number])
    : 'theme'
}

type ThemeSettingsPageProps = {
  searchParams: Promise<{
    workspace_id?: string
    section?: string
  }>
}

export default async function ThemeSettingsPage({
  searchParams,
}: ThemeSettingsPageProps) {
  const params = await searchParams
  const workspaceId = await getWorkspaceIdForThemePage(params.workspace_id)
  const themeData = await getThemeStylingData(workspaceId)

  if (!themeData) {
    notFound()
  }

  return (
    <ThemeStylingEngine
      fallbackThemeTokens={themeData.fallbackThemeTokens}
      initialSection={parseThemeSection(params.section)}
      pageStyles={themeData.pageStyles}
      pages={themeData.pages}
      permissions={themeData.permissions}
      personalTheme={themeData.personalTheme}
      sharedTheme={themeData.sharedTheme}
      viewStyles={themeData.viewStyles}
      views={themeData.views}
      widgetStyles={themeData.widgetStyles}
      workspaceId={workspaceId}
    />
  )
}
