'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2Icon } from 'lucide-react'

import { DatabaseShell } from '@/components/databases/database-shell'
import { Button } from '@/components/ui/button'
import type { CollectionWorkspaceData } from '@/lib/databases/queries'
import type { ViewConfig } from '@/lib/views/types'
import {
  SourcePickerDialog,
  type SourceSelection,
  type ViewTypeHint,
} from '@/components/pages/source-picker-dialog'
import { usePageRuntime } from '@/components/pages/page-runtime-context'

const EMBEDDED_DATABASE_CACHE_TTL_MS = 5 * 60_000

const embeddedDatabaseCache = new Map<
  string,
  { data: CollectionWorkspaceData; fetchedAt: number }
>()
const embeddedDatabaseRequests = new Map<string, Promise<CollectionWorkspaceData>>()

export function EmbeddedDatabase({
  workspaceId,
  collectionId,
  viewId,
  sourceName,
  viewType,
  databaseHref,
  canOpenDatabaseApp,
  canManageSource,
  viewOverridesJson,
  onSourceChange,
  onViewOverridesChange,
}: {
  workspaceId: string
  collectionId: string
  viewId: string | null
  sourceName: string
  viewType: ViewTypeHint
  databaseHref: string | null
  canOpenDatabaseApp: boolean
  canManageSource: boolean
  viewOverridesJson: string
  onSourceChange: (selection: SourceSelection) => void
  onViewOverridesChange: (nextJson: string) => void
}) {
  const runtime = usePageRuntime()
  const [data, setData] = useState<CollectionWorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)
  const viewOverrides = useMemo(
    () => parseViewOverrides(viewOverridesJson),
    [viewOverridesJson],
  )
  const cacheKey = useMemo(
    () =>
      [
        workspaceId,
        collectionId,
        viewId ?? '__collection__',
        runtime.pageId ?? '__no_page__',
        runtime.publicToken ?? '__private__',
      ].join(':'),
    [workspaceId, collectionId, viewId, runtime.pageId, runtime.publicToken],
  )

  const displayData = useMemo(() => {
    if (!data) return null
    if (!viewOverrides) return data
    return {
      ...data,
      activeView: {
        ...data.activeView,
        config: {
          ...data.activeView.config,
          ...viewOverrides,
        },
      },
    }
  }, [data, viewOverrides])

  useEffect(() => {
    let cancelled = false
    const cached = embeddedDatabaseCache.get(cacheKey)
    if (cached) {
      setData(cached.data)
      if (Date.now() - cached.fetchedAt < EMBEDDED_DATABASE_CACHE_TTL_MS) {
        setError(null)
        return
      }
    } else {
      setData(null)
    }
    setError(null)
    const params = new URLSearchParams({ workspaceId, collectionId })
    if (viewId) params.set('viewId', viewId)
    if (runtime.pageId) params.set('pageId', runtime.pageId)
    if (runtime.publicToken) params.set('publicToken', runtime.publicToken)
    let request = embeddedDatabaseRequests.get(cacheKey)
    if (!request) {
      const nextRequest = fetch(`/api/pages/databases/shell?${params.toString()}`)
        .then(async (response) => {
          const json = (await response.json()) as unknown
          const rawError =
            json && typeof json === 'object' && 'error' in json
              ? (json as { error?: unknown }).error
              : null
          const error =
            typeof rawError === 'string' && rawError.trim().length > 0
              ? rawError
              : null
          if (!response.ok || error) {
            throw new Error(error ?? 'Could not load database source.')
          }
          return json as CollectionWorkspaceData
        })
        .finally(() => {
          embeddedDatabaseRequests.delete(cacheKey)
        })
      embeddedDatabaseRequests.set(cacheKey, nextRequest)
      request = nextRequest
    }

    request
      .then((next) => {
        if (cancelled) return
        embeddedDatabaseCache.set(cacheKey, { data: next, fetchedAt: Date.now() })
        setData(next)
      })
      .catch((fetchError) => {
        if (!cancelled) setError(String(fetchError))
      })
    return () => {
      cancelled = true
    }
  }, [cacheKey, workspaceId, collectionId, viewId, runtime.pageId, runtime.publicToken])

  if (error) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-5 text-sm">
        <div className="font-medium text-foreground">Database source needs attention</div>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canManageSource ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSourcePickerOpen(true)}
            >
              Choose source
            </Button>
          ) : null}
          {canOpenDatabaseApp && databaseHref ? (
            <Button asChild type="button" size="sm" variant="ghost">
              <Link href={databaseHref}>Open database</Link>
            </Button>
          ) : null}
        </div>
        {canManageSource ? (
          <SourcePickerDialog
            open={sourcePickerOpen}
            onClose={() => setSourcePickerOpen(false)}
            onSelect={(selection) => {
              onSourceChange(selection)
              setSourcePickerOpen(false)
            }}
            workspaceId={workspaceId}
            initialTab="view"
            requestedViewType={viewType}
          />
        ) : null}
      </div>
    )
  }

  if (!displayData) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground">
        <Loader2Icon className="mr-2 size-3 animate-spin" />
        Loading database...
      </div>
    )
  }

  return (
    <DatabaseShell
      data={displayData}
      embedded
      readOnly={!runtime.canEditContent}
      canConfigureView={runtime.mode === 'workspace' && runtime.canManageStructure}
      pageId={runtime.pageId ?? undefined}
      sourceControl={{
        sourceName,
        viewType,
        databaseHref,
        canOpenDatabaseApp,
        canManageSource,
        onSourceChange,
      }}
      viewConfigOverrides={viewOverrides}
      onViewConfigOverridesChange={(next) =>
        onViewOverridesChange(JSON.stringify(next))
      }
    />
  )
}

function parseViewOverrides(json: string): Partial<ViewConfig> | null {
  if (!json.trim()) return null
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Partial<ViewConfig>
  } catch {
    return null
  }
}
