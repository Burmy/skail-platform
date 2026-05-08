import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { DatabaseShell } from '@/components/databases/database-shell'
import { getCollectionWorkspaceData } from '@/lib/databases/queries'
import { migrateWorkspaceDatabasesIfNeeded } from '@/lib/databases/migrate'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

type CollectionPageProps = {
  params: Promise<{ collectionId: string }>
  searchParams: Promise<{
    workspace_id?: string
    view?: string
    q?: string
  }>
}

async function resolveWorkspaceId(
  workspaceIdParam: string | undefined,
  collectionId: string,
): Promise<string> {
  if (workspaceIdParam) return workspaceIdParam
  const { workspaces } = await getUserWorkspaces()
  const first = workspaces[0]
  if (!first) redirect('/workspaces/new')
  redirect(`/databases/${collectionId}?workspace_id=${first.id}`)
}

export default async function CollectionWorkspacePage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { collectionId } = await params
  const sp = await searchParams
  const workspaceId = await resolveWorkspaceId(sp.workspace_id, collectionId)

  await migrateWorkspaceDatabasesIfNeeded(workspaceId)

  const [data, ctx, appliedTheme] = await Promise.all([
    getCollectionWorkspaceData({
      workspaceId,
      collectionId,
      viewId: sp.view ?? null,
      search: sp.q ?? null,
    }),
    getWorkspaceForUser(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
  ])

  if (!data) notFound()
  if (!ctx.workspace || !ctx.roleKey) notFound()

  return (
    <DashboardLayout
      description="Collections, fields, and records"
      title={data.collection.name}
      userEmail={data.userEmail}
      workspace={{ ...ctx.workspace, role_key: ctx.roleKey }}
      workspaces={data.workspaces}
      theme={appliedTheme}
    >
      <DatabaseShell data={data} />
    </DashboardLayout>
  )
}
