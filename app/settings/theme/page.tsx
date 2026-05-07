import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
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

  const activeWorkspace = {
    ...themeData.workspace,
    role_key: themeData.roleKey,
  }

  return (
    <DashboardLayout
      description="Workspace themes, page styles, widget styles, and view styling"
      title="Theme + Styling"
      userEmail={themeData.userEmail}
      workspace={activeWorkspace}
      workspaces={themeData.workspaces}
      theme={themeData.personalTheme ?? themeData.sharedTheme}
    >
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
    </DashboardLayout>
  )
}
