'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ActionResult } from '@/app/databases/actions'

export type ArchiveKind = 'record' | 'field' | 'view' | 'collection'

type ArchiveSets = {
  records: Set<string>
  fields: Set<string>
  views: Set<string>
  collections: Set<string>
}

type ArchiveRequest = {
  kind: ArchiveKind
  id: string
  archive: () => Promise<ActionResult<unknown>>
  restore: () => Promise<ActionResult<unknown>>
  onOptimistic?: () => void
  onArchiveError?: () => void
  onRestoreSuccess?: () => void
  onRestoreError?: () => void
}

const KIND_KEY: Record<ArchiveKind, keyof ArchiveSets> = {
  record: 'records',
  field: 'fields',
  view: 'views',
  collection: 'collections',
}

const KIND_LABEL: Record<ArchiveKind, string> = {
  record: 'record',
  field: 'property',
  view: 'view',
  collection: 'collection',
}

function emptyArchiveSets(): ArchiveSets {
  return {
    records: new Set(),
    fields: new Set(),
    views: new Set(),
    collections: new Set(),
  }
}

function cloneWith(
  previous: ArchiveSets,
  kind: ArchiveKind,
  id: string,
  archived: boolean,
): ArchiveSets {
  const key = KIND_KEY[kind]
  const next = {
    records: new Set(previous.records),
    fields: new Set(previous.fields),
    views: new Set(previous.views),
    collections: new Set(previous.collections),
  }
  if (archived) next[key].add(id)
  else next[key].delete(id)
  return next
}

export function useOptimisticArchive(onRefresh: () => void) {
  const [archivedIds, setArchivedIds] = useState<ArchiveSets>(() => emptyArchiveSets())
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null
      onRefresh()
    }, 180)
  }, [onRefresh])

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const markArchived = useCallback((kind: ArchiveKind, id: string) => {
    setArchivedIds((previous) => cloneWith(previous, kind, id, true))
  }, [])

  const unmarkArchived = useCallback((kind: ArchiveKind, id: string) => {
    setArchivedIds((previous) => cloneWith(previous, kind, id, false))
  }, [])

  const isArchived = useCallback(
    (kind: ArchiveKind, id: string) => archivedIds[KIND_KEY[kind]].has(id),
    [archivedIds],
  )

  const archive = useCallback(
    ({
      kind,
      id,
      archive: archiveAction,
      restore,
      onOptimistic,
      onArchiveError,
      onRestoreSuccess,
      onRestoreError,
    }: ArchiveRequest) => {
      const label = KIND_LABEL[kind]
      let undoRequested = false

      markArchived(kind, id)
      onOptimistic?.()

      const archivePromise = archiveAction()
      const toastId = toast.success(`Archived ${label}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            undoRequested = true
            unmarkArchived(kind, id)

            void archivePromise.then(async (archiveResult) => {
              if (!archiveResult.ok) {
                toast.dismiss(toastId)
                toast.error('Could not archive. Your view has been restored.')
                onArchiveError?.()
                scheduleRefresh()
                return
              }

              const restoreResult = await restore()
              if (!restoreResult.ok) {
                markArchived(kind, id)
                toast.error('Could not restore. Refreshing workspace.')
                onRestoreError?.()
                scheduleRefresh()
                return
              }

              toast.success(`Restored ${label}`)
              onRestoreSuccess?.()
              scheduleRefresh()
            })
          },
        },
      })

      void archivePromise.then((result) => {
        if (undoRequested) return
        if (!result.ok) {
          toast.dismiss(toastId)
          unmarkArchived(kind, id)
          toast.error('Could not archive. Your view has been restored.')
          onArchiveError?.()
          scheduleRefresh()
          return
        }
        scheduleRefresh()
      })
    },
    [markArchived, scheduleRefresh, unmarkArchived],
  )

  return {
    archivedIds,
    archive,
    isArchived,
    scheduleRefresh,
  } as const
}
