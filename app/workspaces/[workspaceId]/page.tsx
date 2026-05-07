import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { WorkspaceDashboard } from '@/components/workspaces/workspace-dashboard'
import {
  getUserWorkspaces,
  getWorkspaceForUser,
  getWorkspaceOverview,
} from '@/lib/workspaces/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'

export const dynamic = 'force-dynamic'

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string
  }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params
  const [{ user, workspaces }, workspaceContext, overview, appliedTheme] =
    await Promise.all([
      getUserWorkspaces(),
      getWorkspaceForUser(workspaceId),
      getWorkspaceOverview(workspaceId),
      getAppliedWorkspaceTheme(workspaceId),
    ])

  if (!workspaceContext.workspace || !workspaceContext.roleKey) {
    notFound()
  }

  const activeWorkspace = {
    ...workspaceContext.workspace,
    role_key: workspaceContext.roleKey,
  }

  return (
    <DashboardLayout
      description={workspaceContext.workspace.name}
      title="Dashboard"
      userEmail={user.email}
      workspace={activeWorkspace}
      workspaces={workspaces}
      theme={appliedTheme}
    >
      <WorkspaceDashboard
        overview={overview}
        roleKey={workspaceContext.roleKey}
        workspace={workspaceContext.workspace}
      />
    </DashboardLayout>
  )
}
