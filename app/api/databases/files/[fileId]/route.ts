import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { fileId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: file } = await supabase
    .from('collection_files')
    .select('id, workspace_id, source, storage_path, external_url, filename, mime_type')
    .eq('id', fileId)
    .maybeSingle()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', file.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (file.source === 'external_link') {
    return NextResponse.json({ url: file.external_url, filename: file.filename })
  }

  if (!file.storage_path) {
    return NextResponse.json({ error: 'Missing storage path' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: signed, error: signError } = await admin.storage
    .from('collection-files')
    .createSignedUrl(file.storage_path, 60 * 5)

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? 'Sign failed' }, { status: 500 })
  }

  return NextResponse.json({
    url: signed.signedUrl,
    filename: file.filename,
    mimeType: file.mime_type,
  })
}
