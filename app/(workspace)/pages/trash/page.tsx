import { notFound, redirect } from 'next/navigation'

import { TrashView } from '@/components/pages/trash-view'
import { getTrashedPages } from '@/lib/pages/queries'
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

  const [ctx, trashed] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getTrashedPages(workspaceId),
  ])

  if (!ctx.workspace || !ctx.roleKey) notFound()

  return <TrashView workspaceId={workspaceId} initialItems={trashed} />
}
