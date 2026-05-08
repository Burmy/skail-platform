import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SIGNED_TTL_SECONDS = 5 * 60

// Re-issues a signed URL for a previously uploaded page asset.
// Body: { storagePath: string, workspaceId: string }
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as {
    storagePath?: string
    workspaceId?: string
  } | null
  if (!body || !body.storagePath || !body.workspaceId) {
    return NextResponse.json(
      { error: 'storagePath and workspaceId required' },
      { status: 400 },
    )
  }

  const { storagePath, workspaceId } = body

  // Path layout: workspaceId/pageId/blockId/fileId-name.ext
  const segments = storagePath.split('/')
  if (segments[0] !== workspaceId) {
    return NextResponse.json(
      { error: 'storagePath does not belong to workspace' },
      { status: 403 },
    )
  }

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

  const admin = createAdminClient()
  const { data: signed, error } = await admin.storage
    .from('page-assets')
    .createSignedUrl(storagePath, SIGNED_TTL_SECONDS)

  if (error || !signed) {
    return NextResponse.json(
      { error: error?.message ?? 'Could not sign URL.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    expiresIn: SIGNED_TTL_SECONDS,
  })
}
