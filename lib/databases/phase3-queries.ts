import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type WorkspaceMemberLite = {
  user_id: string
  email: string | null
  display_name: string | null
  status: string
}

export type CollectionRecordLite = {
  id: string
  title: string | null
  collection_id: string | null
}

export type CollectionFileLite = {
  id: string
  record_id: string
  field_id: string
  source: 'upload' | 'external_link'
  storage_path: string | null
  external_url: string | null
  filename: string
  mime_type: string | null
  size_bytes: number | null
}

export type RelationDescriptor = {
  id: string
  source_field_id: string
  target_field_id: string | null
  is_two_way: boolean
  is_self_ref: boolean
  // We resolve the target collection id from settings_json on the source field.
  target_collection_id: string | null
}

// Load workspace members for the person field picker.
// Reads via admin to resolve user emails, since the auth.users table is gated.
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberLite[]> {
  const admin = createAdminClient()
  const { data: memberships, error } = await admin
    .from('workspace_members')
    .select('user_id, status')
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)

  const ids = (memberships ?? []).map((m) => m.user_id)
  if (ids.length === 0) return []

  const result: WorkspaceMemberLite[] = []
  for (const member of memberships ?? []) {
    const { data: userResp } = await admin.auth.admin.getUserById(member.user_id)
    const u = userResp?.user
    result.push({
      user_id: member.user_id,
      email: u?.email ?? null,
      display_name:
        (u?.user_metadata?.full_name as string | undefined) ??
        (u?.user_metadata?.name as string | undefined) ??
        u?.email ??
        null,
      status: member.status,
    })
  }
  return result
}

export async function searchTargetRecords(input: {
  workspaceId: string
  collectionId: string
  query: string
  limit?: number
}): Promise<CollectionRecordLite[]> {
  const supabase = await createClient()
  const limit = Math.min(input.limit ?? 25, 100)
  let q = supabase
    .from('collection_records')
    .select('id, title, collection_id')
    .eq('workspace_id', input.workspaceId)
    .eq('collection_id', input.collectionId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (input.query.trim().length > 0) {
    q = q.ilike('title', `%${input.query}%`)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLinkedRecords(input: {
  workspaceId: string
  relationId: string
  sourceRecordId: string
}): Promise<CollectionRecordLite[]> {
  const supabase = await createClient()
  const { data: links, error: linkErr } = await supabase
    .from('collection_record_links')
    .select('target_record_id')
    .eq('workspace_id', input.workspaceId)
    .eq('relation_id', input.relationId)
    .eq('source_record_id', input.sourceRecordId)

  if (linkErr) throw new Error(linkErr.message)

  const ids = (links ?? []).map((l) => l.target_record_id)
  if (ids.length === 0) return []

  const { data: records, error } = await supabase
    .from('collection_records')
    .select('id, title, collection_id')
    .eq('workspace_id', input.workspaceId)
    .in('id', ids)
    .is('archived_at', null)
  if (error) throw new Error(error.message)
  return records ?? []
}

export async function getCollectionFiles(input: {
  workspaceId: string
  recordId: string
  fieldId: string
}): Promise<CollectionFileLite[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('collection_files')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('record_id', input.recordId)
    .eq('field_id', input.fieldId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CollectionFileLite[]
}

export async function getRelationsForCollection(input: {
  workspaceId: string
  collectionId: string
}): Promise<RelationDescriptor[]> {
  const supabase = await createClient()

  const { data: collectionFields, error: fieldsErr } = await supabase
    .from('collection_fields')
    .select('id, settings_json')
    .eq('workspace_id', input.workspaceId)
    .eq('collection_id', input.collectionId)
    .eq('field_type', 'relation')
    .is('archived_at', null)
  if (fieldsErr) throw new Error(fieldsErr.message)

  const fieldIds = (collectionFields ?? []).map((f) => f.id)
  if (fieldIds.length === 0) return []

  const { data: relations, error: relErr } = await supabase
    .from('collection_relations')
    .select('id, source_field_id, target_field_id, is_two_way, is_self_ref')
    .eq('workspace_id', input.workspaceId)
    .in('source_field_id', fieldIds)
  if (relErr) throw new Error(relErr.message)

  const settingsByField = new Map(
    (collectionFields ?? []).map((f) => [f.id, f.settings_json] as const),
  )

  return (relations ?? []).map((rel) => {
    const settings = settingsByField.get(rel.source_field_id)
    let targetCollectionId: string | null = null
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      const t = (settings as Record<string, unknown>).targetCollectionId
      if (typeof t === 'string') targetCollectionId = t
    }
    return {
      ...rel,
      target_collection_id: targetCollectionId,
    }
  })
}
