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
    setData(null)
    setError(null)
    const params = new URLSearchParams({ workspaceId, collectionId })
    if (viewId) params.set('viewId', viewId)
    if (runtime.pageId) params.set('pageId', runtime.pageId)
    if (runtime.publicToken) params.set('publicToken', runtime.publicToken)
    fetch(`/api/pages/databases/shell?${params.toString()}`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          return
        }
        setData(json as CollectionWorkspaceData)
      })
      .catch((fetchError) => {
        if (!cancelled) setError(String(fetchError))
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, collectionId, viewId, runtime.pageId, runtime.publicToken])

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
        Loading database…
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
