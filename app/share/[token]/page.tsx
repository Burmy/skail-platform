import { notFound, redirect } from 'next/navigation'

import { PageShell } from '@/components/pages/page-shell'
import { PortalLayout } from '@/components/pages/portal-layout'
import {
  getPageDocumentForAccess,
  getPageForAccess,
  pageIsInsideShareScope,
  resolveShareToken,
} from '@/lib/pages/access'
import { getPortalTreeForScope } from '@/lib/pages/portal-tree'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type SharePageProps = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function PublicSharePage({
  params,
  searchParams,
}: SharePageProps) {
  const { token } = await params
  const sp = await searchParams
  const resolution = await resolveShareToken(token)

  if (!resolution) notFound()
  if (resolution.link.link_type !== 'public') {
    redirect(`/invite/${token}`)
  }

  const scopeType = resolution.link.scope_type === 'stack' ? 'stack' : 'page'
  const requestedPageId = sp.page ?? resolution.landingPage?.id ?? null
  if (!requestedPageId) notFound()

  const inScope = await pageIsInsideShareScope({
    workspaceId: resolution.link.workspace_id,
    pageId: requestedPageId,
    scopeType,
    scopeId: resolution.link.scope_id,
  })
  if (!inScope) notFound()

  const admin = createAdminClient()
  const page = await getPageForAccess(admin, resolution.link.workspace_id, requestedPageId)
  if (!page) notFound()

  const [document, tree] = await Promise.all([
    getPageDocumentForAccess(admin, resolution.link.workspace_id, page.id),
    getPortalTreeForScope({
      workspaceId: resolution.link.workspace_id,
      scopeType,
      scopeId: resolution.link.scope_id,
    }),
  ])

  return (
    <PortalLayout
      workspaceName={resolution.workspace.brand_name || resolution.workspace.name}
      tree={tree}
      currentPageId={page.id}
      publicToken={token}
    >
      <PageShell
        workspaceId={resolution.link.workspace_id}
        pageId={page.id}
        title={page.title}
        icon={page.icon}
        cover={page.cover_image_url}
        initialContent={document?.content_json ?? null}
        initialVersion={document?.version ?? 0}
        accessLevel="view"
        canManageStructure={false}
        mode="public"
        publicToken={token}
        recordVisit={false}
      />
    </PortalLayout>
  )
}
