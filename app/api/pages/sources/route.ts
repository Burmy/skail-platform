import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns collections + views for the source picker dialog.
// GET /api/pages/sources?workspaceId=...
export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [collectionsResult, viewsResult] = await Promise.all([
    supabase
      .from('collections')
      .select('id, name, icon')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('name'),
    supabase
      .from('views')
      .select('id, name, view_type, collection_id')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('name'),
  ])

  if (collectionsResult.error) {
    return NextResponse.json(
      { error: collectionsResult.error.message },
      { status: 500 },
    )
  }
  if (viewsResult.error) {
    return NextResponse.json(
      { error: viewsResult.error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    collections: collectionsResult.data ?? [],
    views: viewsResult.data ?? [],
  })
}
