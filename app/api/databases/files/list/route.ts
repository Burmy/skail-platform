import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCollectionFiles } from '@/lib/databases/phase3-queries'

export const dynamic = 'force-dynamic'

const SIGNED_TTL_SECONDS = 5 * 60

export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const recordId = url.searchParams.get('recordId')
  const fieldId = url.searchParams.get('fieldId')
  if (!workspaceId || !recordId || !fieldId) {
    return NextResponse.json({ error: 'workspaceId, recordId, fieldId required' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const files = await getCollectionFiles({ workspaceId, recordId, fieldId })
    const admin = createAdminClient()
    const enriched = await Promise.all(
      files.map(async (f) => {
        if (f.source !== 'upload' || !f.storage_path) {
          return { ...f, signedUrl: f.external_url ?? null }
        }
        const { data: signed } = await admin.storage
          .from('collection-files')
          .createSignedUrl(f.storage_path, SIGNED_TTL_SECONDS)
        return { ...f, signedUrl: signed?.signedUrl ?? null }
      }),
    )
    return NextResponse.json({ files: enriched })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
