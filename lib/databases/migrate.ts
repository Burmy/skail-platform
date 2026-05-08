import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_VIEW_CONFIG, serializeViewConfig } from '@/lib/views/types'

// Idempotent per-workspace migration that runs on first load of /databases.
// Promotes title to a real field, copies legacy collection_records.title into record_values,
// and ensures every collection has at least one default table view.
export async function migrateWorkspaceDatabasesIfNeeded(workspaceId: string) {
  const admin = createAdminClient()

  const { data: collections, error: collectionsError } = await admin
    .from('collections')
    .select('id, workspace_id')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  if (collectionsError) {
    throw new Error(collectionsError.message)
  }

  if (!collections || collections.length === 0) {
    return { migrated: 0 }
  }

  let migratedCount = 0

  for (const collection of collections) {
    const collectionId = collection.id

    // 1. Ensure a title field exists (semantic_role='title', is_locked=true).
    const { data: titleField, error: titleFieldError } = await admin
      .from('collection_fields')
      .select('id, name, semantic_role, is_locked, position, archived_at')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId)
      .eq('semantic_role', 'title')
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (titleFieldError) {
      throw new Error(titleFieldError.message)
    }

    let titleFieldId = titleField?.id ?? null

    if (!titleFieldId) {
      const { data: created, error: createError } = await admin
        .from('collection_fields')
        .insert({
          workspace_id: workspaceId,
          collection_id: collectionId,
          name: 'Title',
          field_type: 'text',
          semantic_role: 'title',
          is_required: true,
          is_locked: true,
          is_system: true,
          position: 0,
        })
        .select('id')
        .single()
      if (createError) {
        throw new Error(createError.message)
      }
      titleFieldId = created.id
      migratedCount += 1
    } else if (!titleField?.is_locked) {
      // Pre-existing title field but not locked — lock it without changing semantics.
      const { error } = await admin
        .from('collection_fields')
        .update({ is_locked: true, is_system: true })
        .eq('id', titleFieldId)
      if (error) throw new Error(error.message)
    }

    // 2. Copy legacy collection_records.title into record_values for the title field.
    if (titleFieldId) {
      const { data: legacyRecords, error: legacyError } = await admin
        .from('collection_records')
        .select('id, title')
        .eq('workspace_id', workspaceId)
        .eq('collection_id', collectionId)
        .not('title', 'is', null)

      if (legacyError) throw new Error(legacyError.message)

      const recordIds = (legacyRecords ?? []).map((r) => r.id)

      if (recordIds.length > 0) {
        const { data: existingValues, error: existingError } = await admin
          .from('record_values')
          .select('record_id')
          .eq('workspace_id', workspaceId)
          .eq('field_id', titleFieldId)
          .in('record_id', recordIds)

        if (existingError) throw new Error(existingError.message)

        const existingSet = new Set((existingValues ?? []).map((v) => v.record_id))
        const toInsert = (legacyRecords ?? [])
          .filter((r) => !existingSet.has(r.id))
          .map((r) => ({
            workspace_id: workspaceId,
            record_id: r.id,
            field_id: titleFieldId!,
            value_json: { value: r.title ?? '' },
          }))

        if (toInsert.length > 0) {
          const { error: insertError } = await admin
            .from('record_values')
            .insert(toInsert)
          if (insertError) throw new Error(insertError.message)
          migratedCount += toInsert.length
        }
      }
    }

    // 3. Ensure each collection has at least one non-archived view.
    const { data: existingView, error: viewCheckError } = await admin
      .from('views')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle()

    if (viewCheckError) throw new Error(viewCheckError.message)

    if (!existingView) {
      // Build default config seeded with all visible non-archived field ids.
      const { data: visibleFields, error: visibleFieldsError } = await admin
        .from('collection_fields')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('collection_id', collectionId)
        .is('archived_at', null)
        .order('position', { ascending: true })

      if (visibleFieldsError) throw new Error(visibleFieldsError.message)

      const fieldIds = (visibleFields ?? []).map((f) => f.id)

      const config = serializeViewConfig({
        ...DEFAULT_VIEW_CONFIG,
        visibleFieldIds: fieldIds,
        fieldOrder: fieldIds,
      })

      const { error: insertViewError } = await admin.from('views').insert({
        workspace_id: workspaceId,
        collection_id: collectionId,
        name: 'Table',
        view_type: 'table',
        config_json: config,
      })

      if (insertViewError) throw new Error(insertViewError.message)
      migratedCount += 1
    }
  }

  return { migrated: migratedCount }
}
