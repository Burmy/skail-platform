import { redirect } from 'next/navigation'

import type { Json } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'
import type { CollectionWithFieldsAndRecords } from '@/lib/properties/types'

export type PropertyEngineData = {
  workspace: NonNullable<Awaited<ReturnType<typeof getWorkspaceForUser>>['workspace']>
  roleKey: string
  userEmail: string | null
  workspaces: Awaited<ReturnType<typeof getUserWorkspaces>>['workspaces']
  collections: CollectionWithFieldsAndRecords[]
  canManageSchema: boolean
  canSeeSystemFields: boolean
}

export function canManageCollectionSchema(roleKey: string | null) {
  return roleKey === 'owner' || roleKey === 'admin'
}

export function canSeeSystemCollectionFields(roleKey: string | null) {
  return canManageCollectionSchema(roleKey)
}

export async function getWorkspaceIdForDatabasesPage(workspaceId?: string) {
  if (workspaceId) {
    return workspaceId
  }

  const { workspaces } = await getUserWorkspaces()
  const firstWorkspace = workspaces[0]

  if (!firstWorkspace) {
    redirect('/workspaces/new')
  }

  redirect(`/databases?workspace_id=${firstWorkspace.id}`)
}

export async function getPropertyEngineData(
  workspaceId: string,
): Promise<PropertyEngineData | null> {
  const [{ user, workspaces }, workspaceContext] = await Promise.all([
    getUserWorkspaces(),
    getWorkspaceForUser(workspaceId),
  ])

  if (!workspaceContext.workspace || !workspaceContext.roleKey) {
    return null
  }

  const supabase = await createClient()
  const canManageSchema = canManageCollectionSchema(workspaceContext.roleKey)
  const canSeeSystemFields = canSeeSystemCollectionFields(workspaceContext.roleKey)

  const { data: collections, error: collectionsError } = await supabase
    .from('collections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (collectionsError) {
    throw new Error(collectionsError.message)
  }

  const collectionIds = collections?.map((collection) => collection.id) ?? []

  if (collectionIds.length === 0) {
    return {
      workspace: workspaceContext.workspace,
      roleKey: workspaceContext.roleKey,
      userEmail: user.email ?? null,
      workspaces,
      collections: [],
      canManageSchema,
      canSeeSystemFields,
    }
  }

  let fieldsQuery = supabase
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('collection_id', collectionIds)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (!canSeeSystemFields) {
    fieldsQuery = fieldsQuery.eq('is_system', false)
  }

  const [fieldsResult, recordsResult] = await Promise.all([
    fieldsQuery,
    supabase
      .from('collection_records')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('collection_id', collectionIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (fieldsResult.error) {
    throw new Error(fieldsResult.error.message)
  }

  if (recordsResult.error) {
    throw new Error(recordsResult.error.message)
  }

  const recordIds = recordsResult.data?.map((record) => record.id) ?? []

  const valuesResult =
    recordIds.length > 0
      ? await supabase
          .from('record_values')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('record_id', recordIds)
      : { data: [], error: null }

  if (valuesResult.error) {
    throw new Error(valuesResult.error.message)
  }

  const fieldsByCollection = new Map<string, typeof fieldsResult.data>()
  const recordsByCollection = new Map<string, typeof recordsResult.data>()
  const valuesByRecord = new Map<string, Record<string, Json>>()

  fieldsResult.data?.forEach((field) => {
    if (!field.collection_id) {
      return
    }

    const currentFields = fieldsByCollection.get(field.collection_id) ?? []
    fieldsByCollection.set(field.collection_id, [...currentFields, field])
  })

  recordsResult.data?.forEach((record) => {
    if (!record.collection_id) {
      return
    }

    const currentRecords = recordsByCollection.get(record.collection_id) ?? []
    recordsByCollection.set(record.collection_id, [...currentRecords, record])
  })

  valuesResult.data?.forEach((value) => {
    if (!value.record_id || !value.field_id) {
      return
    }

    const currentValues = valuesByRecord.get(value.record_id) ?? {}
    valuesByRecord.set(value.record_id, {
      ...currentValues,
      [value.field_id]: value.value_json ?? null,
    })
  })

  return {
    workspace: workspaceContext.workspace,
    roleKey: workspaceContext.roleKey,
    userEmail: user.email ?? null,
    workspaces,
    canManageSchema,
    canSeeSystemFields,
    collections:
      collections?.map((collection) => ({
        ...collection,
        fields: fieldsByCollection.get(collection.id) ?? [],
        records:
          recordsByCollection.get(collection.id)?.map((record) => ({
            ...record,
            values: valuesByRecord.get(record.id) ?? {},
          })) ?? [],
      })) ?? [],
  }
}
