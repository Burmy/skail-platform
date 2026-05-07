import { notFound, redirect } from 'next/navigation'

import { AiBuilderChat } from '@/components/ai-builder/ai-builder-chat'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import {
  getUserWorkspaces,
  getWorkspaceForUser,
} from '@/lib/workspaces/queries'
import { canApplyAiBuilderChanges } from '@/lib/ai-builder/permissions'

export const dynamic = 'force-dynamic'

type AIBuilderPageProps = {
  searchParams: Promise<{
    workspace_id?: string
  }>
}

export default async function AIBuilderPage({
  searchParams,
}: AIBuilderPageProps) {
  const params = await searchParams
  const { user, workspaces } = await getUserWorkspaces()
  const workspaceId = params.workspace_id ?? workspaces[0]?.id

  if (!workspaceId) {
    redirect('/workspaces/new')
  }

  if (!params.workspace_id) {
    redirect(`/ai-builder?workspace_id=${workspaceId}`)
  }

  const [workspaceContext, appliedTheme] = await Promise.all([
    getWorkspaceForUser(workspaceId),
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
      description="Preview and confirm AI-generated workspace changes"
      title="AI Builder"
      userEmail={user.email}
      workspace={activeWorkspace}
      workspaces={workspaces}
      theme={appliedTheme}
    >
      <AiBuilderChat
        canApply={canApplyAiBuilderChanges(workspaceContext.roleKey)}
        userEmail={user.email ?? null}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  )
}
