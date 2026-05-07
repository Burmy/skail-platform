import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { ViewEngine } from '@/components/views/view-engine'
import {
  getViewEngineData,
  getWorkspaceIdForViewsPage,
} from '@/lib/views/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'

export const dynamic = 'force-dynamic'

type ViewsPageProps = {
  searchParams: Promise<{
    workspace_id?: string
  }>
}

export default async function ViewsPage({ searchParams }: ViewsPageProps) {
  const params = await searchParams
  const workspaceId = await getWorkspaceIdForViewsPage(params.workspace_id)
  const [engineData, appliedTheme] = await Promise.all([
    getViewEngineData(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
  ])

  if (!engineData) {
    notFound()
  }

  const activeWorkspace = {
    ...engineData.workspace,
    role_key: engineData.roleKey,
  }

  return (
    <DashboardLayout
      description="Saved table, kanban, calendar, and dashboard views"
      title="Views"
      userEmail={engineData.userEmail}
      workspace={activeWorkspace}
      workspaces={engineData.workspaces}
      theme={appliedTheme}
    >
      <ViewEngine
        collections={engineData.collections}
        views={engineData.views}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  )
}
