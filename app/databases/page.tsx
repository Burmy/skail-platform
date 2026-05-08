import { notFound, redirect } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  getDatabaseShellData,
} from '@/lib/databases/queries'
import { migrateWorkspaceDatabasesIfNeeded } from '@/lib/databases/migrate'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

type DatabasesPageProps = {
  searchParams: Promise<{
    workspace_id?: string
  }>
}

async function resolveWorkspaceId(workspaceIdParam?: string): Promise<string> {
  if (workspaceIdParam) return workspaceIdParam
  const { workspaces } = await getUserWorkspaces()
  const first = workspaces[0]
  if (!first) {
    redirect('/workspaces/new')
  }
  redirect(`/databases?workspace_id=${first.id}`)
}

export default async function DatabasesPage({ searchParams }: DatabasesPageProps) {
  const params = await searchParams
  const workspaceId = await resolveWorkspaceId(params.workspace_id)

  // Idempotent on-load migration: ensures title field exists for every collection,
  // copies legacy titles into record_values, ensures every collection has at least one view.
  await migrateWorkspaceDatabasesIfNeeded(workspaceId)

  const data = await getDatabaseShellData(workspaceId)
  if (!data) notFound()

  if (data.collections.length > 0) {
    redirect(`/databases/${data.collections[0]!.id}?workspace_id=${workspaceId}`)
  }

  const [appliedTheme, ctx] = await Promise.all([
    getAppliedWorkspaceTheme(workspaceId),
    getWorkspaceForUser(workspaceId),
  ])

  if (!ctx.workspace || !ctx.roleKey) notFound()

  return (
    <DashboardLayout
      description="Collections, fields, and records"
      title="Databases"
      userEmail={data.userEmail}
      workspace={{ ...ctx.workspace, role_key: ctx.roleKey }}
      workspaces={data.workspaces}
      theme={appliedTheme}
    >
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No collections yet</EmptyTitle>
            <EmptyDescription>
              Create your first collection to start adding records and views. Collections are
              workspace-scoped databases — like Notion databases.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </DashboardLayout>
  )
}
