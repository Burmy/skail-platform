import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getLinkedRecords, searchTargetRecords } from '@/lib/databases/phase3-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId')
  const sourceFieldId = url.searchParams.get('sourceFieldId')
  const sourceRecordId = url.searchParams.get('sourceRecordId')
  const search = url.searchParams.get('q') ?? ''

  if (!workspaceId || !sourceFieldId || !sourceRecordId) {
    return NextResponse.json(
      { error: 'workspaceId, sourceFieldId, sourceRecordId required' },
      { status: 400 },
    )
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

  // Resolve relation for the source field
  const { data: relation } = await supabase
    .from('collection_relations')
    .select('id, source_field_id, target_field_id, is_two_way')
    .eq('workspace_id', workspaceId)
    .eq('source_field_id', sourceFieldId)
    .maybeSingle()

  if (!relation) {
    return NextResponse.json({ error: 'No relation defined for this field.' }, { status: 404 })
  }

  // Find target collection id from settings_json on the source field
  const { data: sourceField } = await supabase
    .from('collection_fields')
    .select('settings_json, collection_id')
    .eq('id', sourceFieldId)
    .maybeSingle()

  let targetCollectionId: string | null = null
  if (sourceField?.settings_json && typeof sourceField.settings_json === 'object' && !Array.isArray(sourceField.settings_json)) {
    const t = (sourceField.settings_json as Record<string, unknown>).targetCollectionId
    if (typeof t === 'string') targetCollectionId = t
  }

  if (!targetCollectionId) {
    return NextResponse.json(
      { error: 'Relation has no target collection configured.' },
      { status: 500 },
    )
  }

  try {
    const [linked, candidates] = await Promise.all([
      getLinkedRecords({
        workspaceId,
        relationId: relation.id,
        sourceRecordId,
      }),
      searchTargetRecords({
        workspaceId,
        collectionId: targetCollectionId,
        query: search,
      }),
    ])
    return NextResponse.json({
      relationId: relation.id,
      targetCollectionId,
      linked,
      candidates,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
