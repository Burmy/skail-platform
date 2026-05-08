import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCollectionWorkspaceData,
  getCollectionWorkspaceDataForEmbeddedPage,
} from '@/lib/databases/queries'
import {
  getCurrentUserPageAccess,
  getPageDocumentForAccess,
  pageIsInsideShareScope,
  resolveShareToken,
} from '@/lib/pages/access'
import { pageDocumentReferencesSource } from '@/lib/pages/document-sources'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const collectionId = url.searchParams.get('collectionId')
  const viewId = url.searchParams.get('viewId')
  const pageId = url.searchParams.get('pageId')
  const publicToken = url.searchParams.get('publicToken')

  if (!workspaceId || !collectionId) {
    return NextResponse.json(
      { error: 'workspaceId and collectionId required' },
      { status: 400 },
    )
  }

  try {
    let data = null

    if (publicToken) {
      if (!pageId) {
        return NextResponse.json({ error: 'pageId required' }, { status: 400 })
      }
      const resolution = await resolveShareToken(publicToken)
      if (
        !resolution ||
        resolution.link.link_type !== 'public' ||
        resolution.link.workspace_id !== workspaceId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const inScope = await pageIsInsideShareScope({
        workspaceId,
        pageId,
        scopeType: resolution.link.scope_type === 'stack' ? 'stack' : 'page',
        scopeId: resolution.link.scope_id,
      })
      if (!inScope) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const admin = createAdminClient()
      const document = await getPageDocumentForAccess(admin, workspaceId, pageId)
      if (
        !pageDocumentReferencesSource(
          document?.content_json ?? null,
          collectionId,
          viewId,
        )
      ) {
        return NextResponse.json({ error: 'Source not shared on this page' }, { status: 403 })
      }
      data = await getCollectionWorkspaceDataForEmbeddedPage({
        workspaceId,
        collectionId,
        viewId: viewId ?? null,
        accessLevel: 'view',
      })
    } else {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership) {
        data = await getCollectionWorkspaceData({
          workspaceId,
          collectionId,
          viewId: viewId ?? null,
        })
      } else if (pageId) {
        const access = await getCurrentUserPageAccess({
          workspaceId,
          pageId,
          minimum: 'view',
        })
        if (!access) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const admin = createAdminClient()
        const document = await getPageDocumentForAccess(admin, workspaceId, pageId)
        if (
          !pageDocumentReferencesSource(
            document?.content_json ?? null,
            collectionId,
            viewId,
          )
        ) {
          return NextResponse.json({ error: 'Source not shared on this page' }, { status: 403 })
        }
        data = await getCollectionWorkspaceDataForEmbeddedPage({
          workspaceId,
          collectionId,
          viewId: viewId ?? null,
          accessLevel: access.level,
        })
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (viewId && data.activeView.id !== viewId) {
      return NextResponse.json(
        { error: 'The selected database view no longer exists.' },
        { status: 404 },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    )
  }
}
