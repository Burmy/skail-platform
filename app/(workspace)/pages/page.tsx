import { notFound, redirect } from 'next/navigation'

import { PagesHome } from '@/components/pages/pages-home'
import { getRecentPages, getStackTree } from '@/lib/pages/queries'
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

  const [ctx, recents, stacks] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getRecentPages(workspaceId, 10),
    getStackTree(workspaceId),
  ])

  if (!ctx.workspace || !ctx.roleKey) notFound()

  return (
    <PagesHome
      workspaceId={workspaceId}
      recents={recents}
      stacks={stacks}
    />
  )
}
