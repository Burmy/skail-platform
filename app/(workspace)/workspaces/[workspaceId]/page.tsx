import { notFound } from 'next/navigation'

import { WorkspaceDashboard } from '@/components/workspaces/workspace-dashboard'
import {
  getWorkspaceForUser,
  getWorkspaceOverview,
} from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string
  }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params
  const [workspaceContext, overview] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getWorkspaceOverview(workspaceId),
  ])

  if (!workspaceContext.workspace || !workspaceContext.roleKey) {
    notFound()
  }

  return (
    <WorkspaceDashboard
      overview={overview}
      roleKey={workspaceContext.roleKey}
      workspace={workspaceContext.workspace}
    />
  )
}
