'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { subscribeDatabaseChannel, type DatabaseRealtimeEvent } from '@/lib/databases/realtime'

export type UseRealtimeDatabaseOptions = {
  workspaceId: string
  collectionId: string
  enabled?: boolean
  // Allow the consumer to inspect and dedupe its own pending edits.
  shouldHandleEvent?: (event: DatabaseRealtimeEvent) => boolean
  onEvent?: (event: DatabaseRealtimeEvent, payload: Record<string, unknown> | null) => void
}

export function useRealtimeDatabase(options: UseRealtimeDatabaseOptions) {
  const { workspaceId, collectionId, enabled = true, shouldHandleEvent, onEvent } = options
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return
    const client = createClient()
    let pendingRefresh: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (pendingRefresh) clearTimeout(pendingRefresh)
      pendingRefresh = setTimeout(() => {
        router.refresh()
      }, 250)
    }

    const unsub = subscribeDatabaseChannel(client, {
      workspaceId,
      collectionId,
      onEvent: (event, payload) => {
        if (shouldHandleEvent && !shouldHandleEvent(event)) return
        onEvent?.(event, payload)
        scheduleRefresh()
      },
    })

    return () => {
      if (pendingRefresh) clearTimeout(pendingRefresh)
      unsub()
    }
  }, [workspaceId, collectionId, enabled, shouldHandleEvent, onEvent, router])
}
