import { notFound, redirect } from 'next/navigation'

import { PortalLayout } from '@/components/pages/portal-layout'
import { PageShell } from '@/components/pages/page-shell'
import {
  getCurrentUserPageAccess,
  getPageDocumentForAccess,
  getWorkspaceById,
} from '@/lib/pages/access'
import { getPortalTreeForGrants } from '@/lib/pages/portal-tree'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import { workspaceThemeToStyle } from '@/lib/theme/css'

export const dynamic = 'force-dynamic'

type PageEditorRouteProps = {
  params: Promise<{ pageId: string }>
  searchParams: Promise<{ workspace_id?: string }>
}

export default async function PageEditorRoute({
  params,
  searchParams,
}: PageEditorRouteProps) {
  const { pageId } = await params
  const sp = await searchParams

  // Resolve workspace: prefer ?workspace_id, otherwise look it up from the page row.
  let workspaceId = sp.workspace_id ?? null

  if (!workspaceId) {
    const admin = createAdminClient()
    const { data: pageOwner } = await admin
      .from('pages')
      .select('workspace_id')
      .eq('id', pageId)
      .is('archived_at', null)
      .maybeSingle()
    workspaceId = pageOwner?.workspace_id ?? null
    if (!workspaceId) notFound()
    redirect(`/p/${pageId}?workspace_id=${workspaceId}`)
  }

  const admin = createAdminClient()
  const [access, appliedTheme] = await Promise.all([
    getCurrentUserPageAccess({ workspaceId, pageId, minimum: 'view' }),
    getAppliedWorkspaceTheme(workspaceId),
  ])

  if (!access) notFound()

  const document = await getPageDocumentForAccess(admin, workspaceId, pageId)

  if (access.source === 'grant') {
    const workspace = await getWorkspaceById(admin, workspaceId)
    if (!workspace) notFound()
    const tree = await getPortalTreeForGrants({
      workspaceId,
      userId: access.userId,
    })

    return (
      <PortalLayout
        workspaceName={workspace.brand_name || workspace.name}
        userEmail={access.userEmail}
        tree={tree}
        currentPageId={pageId}
        workspaceId={workspaceId}
      >
        <div
          className="skail-themed-workspace min-h-dvh"
          style={appliedTheme ? workspaceThemeToStyle(appliedTheme) : undefined}
        >
          <PageShell
            workspaceId={workspaceId}
            pageId={access.page.id}
            title={access.page.title}
            icon={access.page.icon}
            cover={access.page.cover_image_url}
            initialContent={document?.content_json ?? null}
            initialVersion={document?.version ?? 0}
            accessLevel={access.level}
            canManageStructure={access.canManageStructure}
            mode="shared"
          />
        </div>
      </PortalLayout>
    )
  }

  return (
    <PageShell
      workspaceId={workspaceId}
      pageId={access.page.id}
      title={access.page.title}
      icon={access.page.icon}
      cover={access.page.cover_image_url}
      initialContent={document?.content_json ?? null}
      initialVersion={document?.version ?? 0}
      accessLevel="manage"
      canManageStructure={access.canManageStructure}
      mode="workspace"
    />
  )
}
