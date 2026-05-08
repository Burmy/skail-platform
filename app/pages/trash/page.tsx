import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { TrashView } from '@/components/pages/trash-view'
import { getTrashedPages } from '@/lib/pages/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

type TrashPageProps = {
  searchParams: Promise<{ workspace_id?: string }>
}

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const sp = await searchParams
  const workspaceId = sp.workspace_id
  if (!workspaceId) {
    const { workspaces } = await getUserWorkspaces()
    const first = workspaces[0]
    if (!first) redirect('/workspaces/new')
    redirect(`/pages/trash?workspace_id=${first.id}`)
  }

  const [{ workspaces }, ctx, appliedTheme, trashed] = await Promise.all([
    getUserWorkspaces(),
    getWorkspaceForUser(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
    getTrashedPages(workspaceId),
  ])

  if (!ctx.workspace || !ctx.roleKey) notFound()

  return (
    <DashboardLayout
      description="Pages archived in the last 30 days"
      title="Trash"
      userEmail={ctx.user?.email ?? null}
      workspace={{ ...ctx.workspace, role_key: ctx.roleKey }}
      workspaces={workspaces}
      theme={appliedTheme}
    >
      <TrashView workspaceId={workspaceId} initialItems={trashed} />
    </DashboardLayout>
  )
}
