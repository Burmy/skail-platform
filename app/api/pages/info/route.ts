import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns minimal page metadata for the page_link block.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const pageId = url.searchParams.get('pageId')
  if (!workspaceId || !pageId) {
    return NextResponse.json(
      { error: 'workspaceId and pageId required' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pages')
    .select('id, title, icon, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  if (data.archived_at) {
    return NextResponse.json({ error: 'Page is in trash' }, { status: 410 })
  }

  return NextResponse.json({ id: data.id, title: data.title, icon: data.icon })
}
