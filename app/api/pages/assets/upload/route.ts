import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 25 * 1024 * 1024
const SIGNED_TTL_SECONDS = 5 * 60

// We deliberately keep this list permissive (any image/video/audio/document)
// because page blocks include image/video/audio/file. Reject only obviously
// dangerous types.
const BLOCKED_MIMES = new Set([
  'application/x-msdownload', // .exe
  'application/x-sh',
  'application/javascript',
  'text/html',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  if (!form) {
    return NextResponse.json(
      { error: 'multipart/form-data required' },
      { status: 400 },
    )
  }

  const file = form.get('file')
  const workspaceId = form.get('workspaceId')
  const pageId = form.get('pageId')
  const blockId = form.get('blockId')

  if (
    !(file instanceof File) ||
    typeof workspaceId !== 'string' ||
    typeof pageId !== 'string' ||
    typeof blockId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'workspaceId, pageId, blockId, file required' },
      { status: 400 },
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds 25 MB limit.' },
      { status: 413 },
    )
  }

  if (file.type && BLOCKED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} is not allowed.` },
      { status: 400 },
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

  // Confirm the page belongs to the workspace
  const admin = createAdminClient()
  const { data: page } = await admin
    .from('pages')
    .select('id, workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .maybeSingle()
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const fileId = crypto.randomUUID()
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200)
  const storagePath = `${workspaceId}/${pageId}/${blockId}/${fileId}-${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('page-assets')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Issue a signed URL the editor can render immediately.
  const { data: signed } = await admin.storage
    .from('page-assets')
    .createSignedUrl(storagePath, SIGNED_TTL_SECONDS)

  return NextResponse.json({
    storagePath,
    filename: safeName,
    mimeType: file.type,
    sizeBytes: file.size,
    signedUrl: signed?.signedUrl ?? null,
  })
}
