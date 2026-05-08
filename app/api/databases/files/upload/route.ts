import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })

  const file = form.get('file')
  const workspaceId = form.get('workspaceId')
  const recordId = form.get('recordId')
  const fieldId = form.get('fieldId')

  if (
    !(file instanceof File) ||
    typeof workspaceId !== 'string' ||
    typeof recordId !== 'string' ||
    typeof fieldId !== 'string'
  ) {
    return NextResponse.json({ error: 'workspaceId, recordId, fieldId, file required' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 25 MB limit.' }, { status: 413 })
  }

  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} is not allowed.` }, { status: 400 })
  }

  // Validate workspace membership
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

  const fileId = crypto.randomUUID()
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200)
  const storagePath = `${workspaceId}/${recordId}/${fieldId}/${fileId}-${safeName}`

  const admin = createAdminClient()
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('collection-files')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({
    storagePath,
    filename: safeName,
    mimeType: file.type,
    sizeBytes: file.size,
  })
}
