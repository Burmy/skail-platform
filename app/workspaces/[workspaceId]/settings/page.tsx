import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { WhiteLabelSettingsForm } from '@/components/workspaces/white-label-settings-form'
import {
  getUserWorkspaces,
  getWorkspaceForUser,
} from '@/lib/workspaces/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'

export const dynamic = 'force-dynamic'

type WorkspaceSettingsPageProps = {
  params: Promise<{
    workspaceId: string
  }>
}

export default async function WorkspaceSettingsPage({
  params,
}: WorkspaceSettingsPageProps) {
  const { workspaceId } = await params
  const [{ user, workspaces }, workspaceContext, appliedTheme] =
    await Promise.all([
      getUserWorkspaces(),
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
      description="Manage workspace identity, domains, and Level 2 branding"
      title="Workspace settings"
      userEmail={user.email}
      workspace={activeWorkspace}
      workspaces={workspaces}
      theme={appliedTheme}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">Level 2 white label</h2>
          <p className="text-muted-foreground">
            Update client-facing workspace settings without changing stable
            backend IDs.
          </p>
        </div>
        <WhiteLabelSettingsForm workspace={workspaceContext.workspace} />
      </div>
    </DashboardLayout>
  )
}
