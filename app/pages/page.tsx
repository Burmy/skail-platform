import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { PagesHome } from '@/components/pages/pages-home'
import { getRecentPages, getStackTree } from '@/lib/pages/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

type PagesIndexProps = {
  searchParams: Promise<{ workspace_id?: string }>
}

async function resolveWorkspaceId(workspaceIdParam?: string): Promise<string> {
  if (workspaceIdParam) return workspaceIdParam
  const { workspaces } = await getUserWorkspaces()
  const first = workspaces[0]
  if (!first) redirect('/workspaces/new')
  redirect(`/pages?workspace_id=${first.id}`)
}

export default async function PagesIndex({ searchParams }: PagesIndexProps) {
  const sp = await searchParams
  const workspaceId = await resolveWorkspaceId(sp.workspace_id)

  const [{ workspaces }, ctx, appliedTheme, recents, stacks] = await Promise.all([
    getUserWorkspaces(),
    getWorkspaceForUser(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
    getRecentPages(workspaceId, 10),
    getStackTree(workspaceId),
  ])

  if (!ctx.workspace || !ctx.roleKey) notFound()

  return (
    <DashboardLayout
      description="Your workspace pages, stacks, and recents"
      title="Pages"
      userEmail={ctx.user?.email ?? null}
      workspace={{ ...ctx.workspace, role_key: ctx.roleKey }}
      workspaces={workspaces}
      theme={appliedTheme}
    >
      <PagesHome
        workspaceId={workspaceId}
        recents={recents}
        stacks={stacks}
      />
    </DashboardLayout>
  )
}
