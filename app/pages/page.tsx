import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { LayoutBuilder } from '@/components/layout-builder/layout-builder'
import {
  getLayoutBuilderData,
  getWorkspaceIdForPagesPage,
} from '@/lib/layout/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'

export const dynamic = 'force-dynamic'

type PagesPageProps = {
  searchParams: Promise<{
    workspace_id?: string
  }>
}

export default async function PagesPage({ searchParams }: PagesPageProps) {
  const params = await searchParams
  const workspaceId = await getWorkspaceIdForPagesPage(params.workspace_id)
  const [builderData, appliedTheme] = await Promise.all([
    getLayoutBuilderData(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
  ])

  if (!builderData) {
    notFound()
  }

  const activeWorkspace = {
    ...builderData.workspace,
    role_key: builderData.roleKey,
  }

  return (
    <DashboardLayout
      description="Pages, tabs, widgets, and connected layouts"
      title="Pages"
      userEmail={builderData.userEmail}
      workspace={activeWorkspace}
      workspaces={builderData.workspaces}
      theme={appliedTheme}
    >
      <LayoutBuilder
        collections={builderData.collections}
        pages={builderData.pages}
        views={builderData.views}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  )
}
