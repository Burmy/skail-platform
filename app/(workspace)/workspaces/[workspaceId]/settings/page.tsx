import { notFound } from 'next/navigation'

import { WhiteLabelSettingsForm } from '@/components/workspaces/white-label-settings-form'
import { getWorkspaceForUser } from '@/lib/workspaces/queries'

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
  const workspaceContext = await getWorkspaceForUser(workspaceId)

  if (!workspaceContext.workspace || !workspaceContext.roleKey) {
    notFound()
  }

  return (
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
  )
}
