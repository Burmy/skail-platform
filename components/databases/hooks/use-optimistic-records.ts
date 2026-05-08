'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { CollectionRecordWithValues } from '@/lib/properties/types'

export type RecordMutators = {
  setFieldValue: (recordId: string, fieldId: string, value: unknown) => void
  setTitle: (recordId: string, title: string) => void
  insertRecord: (record: CollectionRecordWithValues) => void
  removeRecord: (recordId: string) => void
  replaceRecordId: (tempId: string, realId: string) => void
  reorderColumn: (orderedRecordIdsByGroup: Map<string, string[]>) => void
}

export function useOptimisticRecords(initial: CollectionRecordWithValues[]) {
  const [records, setRecords] = useState(initial)
  const initialIdsRef = useRef<string>(initial.map((r) => r.id).join(','))

  // Reseed when the initial set changes (e.g. router refresh, realtime invalidation)
  useEffect(() => {
    const incomingIds = initial.map((r) => r.id).join(',')
    if (incomingIds === initialIdsRef.current && records.length === initial.length) {
      // Still the same shape — keep optimistic state if the user has been editing
      // but seed in any new server-provided value updates that haven't been touched.
      setRecords((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]))
        return initial.map((srvRec) => {
          const local = byId.get(srvRec.id)
          if (!local) return srvRec
          // Merge: prefer local title/values if user has been typing, else use server.
          // Heuristic: compare updated_at - if server is newer, take server.
          const localTime = new Date(local.updated_at ?? 0).getTime()
          const srvTime = new Date(srvRec.updated_at ?? 0).getTime()
          return srvTime >= localTime ? srvRec : local
        })
      })
      return
    }
    initialIdsRef.current = incomingIds
    setRecords(initial)
  }, [initial])

  const setFieldValue = useCallback(
    (recordId: string, fieldId: string, value: unknown) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                values: { ...r.values, [fieldId]: { value: value as never } },
                updated_at: new Date().toISOString(),
              }
            : r,
        ),
      )
    },
    [],
  )

  const setTitle = useCallback((recordId: string, title: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, title, updated_at: new Date().toISOString() }
          : r,
      ),
    )
  }, [])

  const insertRecord = useCallback((record: CollectionRecordWithValues) => {
    setRecords((prev) => [record, ...prev])
  }, [])

  const removeRecord = useCallback((recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId))
  }, [])

  const replaceRecordId = useCallback((tempId: string, realId: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r)),
    )
  }, [])

  const reorderColumn = useCallback(
    (orderedRecordIdsByGroup: Map<string, string[]>) => {
      // No-op at the records level; kanban manages its own ordering via view config.
      void orderedRecordIdsByGroup
    },
    [],
  )

  const mutators: RecordMutators = {
    setFieldValue,
    setTitle,
    insertRecord,
    removeRecord,
    replaceRecordId,
    reorderColumn,
  }

  return { records, mutators } as const
}
