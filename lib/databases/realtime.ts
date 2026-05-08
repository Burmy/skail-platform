import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type DatabaseRealtimeEvent =
  | { table: 'collection_records'; type: 'INSERT' | 'UPDATE' | 'DELETE'; recordId: string; collectionId: string }
  | { table: 'record_values'; type: 'INSERT' | 'UPDATE' | 'DELETE'; recordId: string; fieldId: string }
  | { table: 'collection_fields'; type: 'INSERT' | 'UPDATE' | 'DELETE'; fieldId: string; collectionId: string }
  | { table: 'views'; type: 'INSERT' | 'UPDATE' | 'DELETE'; viewId: string; collectionId: string }

export type DatabaseRealtimeOptions = {
  workspaceId: string
  collectionId: string
  // when an event arrives that originated from this client, the consumer should ignore it.
  // We expose the matched id so the consumer can do its own matching against in-flight ids.
  onEvent: (event: DatabaseRealtimeEvent, payload: Record<string, unknown> | null) => void
}

export function subscribeDatabaseChannel(
  client: SupabaseClient<Database>,
  options: DatabaseRealtimeOptions,
) {
  const { workspaceId, collectionId, onEvent } = options
  // Unique suffix per subscription so React StrictMode double-mount and
  // multiple embedded databases on the same page don't collide on a shared
  // channel that has already been subscribed.
  const subscriptionId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  const channel = client.channel(`db:${workspaceId}:${collectionId}:${subscriptionId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collection_records',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null
        if (!row) return
        if (row.collection_id !== collectionId) return
        onEvent(
          {
            table: 'collection_records',
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            recordId: String(row.id),
            collectionId,
          },
          row,
        )
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'record_values',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null
        if (!row) return
        onEvent(
          {
            table: 'record_values',
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            recordId: String(row.record_id),
            fieldId: String(row.field_id),
          },
          row,
        )
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collection_fields',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null
        if (!row) return
        if (row.collection_id !== collectionId) return
        onEvent(
          {
            table: 'collection_fields',
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            fieldId: String(row.id),
            collectionId,
          },
          row,
        )
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'views',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null
        if (!row) return
        if (row.collection_id !== collectionId) return
        onEvent(
          {
            table: 'views',
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            viewId: String(row.id),
            collectionId,
          },
          row,
        )
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export function newClientRequestId() {
  return `crq_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}
