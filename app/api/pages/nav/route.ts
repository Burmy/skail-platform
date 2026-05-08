import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  getRecentPages,
  getStackTree,
  getTrashedPages,
} from '@/lib/pages/queries'

export const dynamic = 'force-dynamic'

// Returns sidebar/home payload: recents + stack tree + trash count.
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

  try {
    const [recents, tree, trash] = await Promise.all([
      getRecentPages(workspaceId, 10),
      getStackTree(workspaceId),
      getTrashedPages(workspaceId),
    ])
    return NextResponse.json({
      recents,
      stacks: tree,
      trashCount: trash.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
