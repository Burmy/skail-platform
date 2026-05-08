import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Lightweight preview reader for the database_view block:
// returns up to 25 records (id + title + updated_at) for a collection / view.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const collectionId = url.searchParams.get('collectionId')

  if (!workspaceId || !collectionId) {
    return NextResponse.json(
      { error: 'workspaceId and collectionId required' },
      { status: 400 },
    )
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

  const { data, error } = await supabase
    .from('collection_records')
    .select('id, title, updated_at, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', collectionId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    records: (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      updated_at: r.updated_at,
    })),
  })
}
