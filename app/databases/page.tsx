import { notFound } from 'next/navigation'

import { DashboardLayout } from '@/components/dashboard-layout'
import { PropertyEngine } from '@/components/properties/property-engine'
import {
  getPropertyEngineData,
  getWorkspaceIdForDatabasesPage,
} from '@/lib/properties/queries'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'

export const dynamic = 'force-dynamic'

type DatabasesPageProps = {
  searchParams: Promise<{
    workspace_id?: string
  }>
}

export default async function DatabasesPage({
  searchParams,
}: DatabasesPageProps) {
  const params = await searchParams
  const workspaceId = await getWorkspaceIdForDatabasesPage(params.workspace_id)
  const [engineData, appliedTheme] = await Promise.all([
    getPropertyEngineData(workspaceId),
    getAppliedWorkspaceTheme(workspaceId),
  ])

  if (!engineData) {
    notFound()
  }

  const activeWorkspace = {
    ...engineData.workspace,
    role_key: engineData.roleKey,
  }

  return (
    <DashboardLayout
      description="Collections, fields, and records"
      title="Databases"
      userEmail={engineData.userEmail}
      workspace={activeWorkspace}
      workspaces={engineData.workspaces}
      theme={appliedTheme}
    >
      <PropertyEngine
        canManageSchema={engineData.canManageSchema}
        canSeeSystemFields={engineData.canSeeSystemFields}
        collections={engineData.collections}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  )
}
