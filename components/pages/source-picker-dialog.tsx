'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { DatabaseIcon, LayoutGridIcon, PlusIcon, SparklesIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createCollection, createView } from '@/app/databases/actions'
import { VIEW_TYPE_META, type SavedViewType } from '@/lib/views/types'

export type SourceSelection =
  | { kind: 'collection'; id: string; name: string }
  | { kind: 'view'; id: string; name: string; viewType: string; collectionId: string }

export type ViewTypeHint =
  | 'table'
  | 'kanban'
  | 'gallery'
  | 'list'
  | 'calendar'
  | 'timeline'
  | 'chart'
  | 'dashboard'
  | 'map'
  | 'form'

type CollectionRow = { id: string; name: string; icon: string | null }
type ViewRow = {
  id: string
  name: string
  view_type: string
  collection_id: string
}

export function SourcePickerDialog({
  open,
  onClose,
  onSelect,
  workspaceId,
  initialTab = 'collection',
  requestedViewType,
}: {
  open: boolean
  onClose: () => void
  onSelect: (selection: SourceSelection) => void
  workspaceId: string
  initialTab?: 'collection' | 'view' | 'new'
  requestedViewType?: ViewTypeHint | null
}) {
  const [tab, setTab] = useState(initialTab)
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [views, setViews] = useState<ViewRow[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const requestedMeta = requestedViewType
    ? VIEW_TYPE_META[requestedViewType as SavedViewType]
    : null

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    setFilter('')
    setError(null)
    setLoading(true)
    fetch(`/api/pages/sources?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((j) => {
        setCollections(j.collections ?? [])
        setViews(j.views ?? [])
      })
      .finally(() => setLoading(false))
  }, [initialTab, open, workspaceId])

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase()),
  )
  const filteredViews = useMemo(() => {
    const query = filter.toLowerCase()
    return views
      .filter((v) => v.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!requestedViewType) return 0
        const aMatch = a.view_type === requestedViewType
        const bMatch = b.view_type === requestedViewType
        if (aMatch === bMatch) return 0
        return aMatch ? -1 : 1
      })
  }, [filter, requestedViewType, views])

  function selectView(view: ViewRow) {
    onSelect({
      kind: 'view',
      id: view.id,
      name: view.name,
      viewType: view.view_type,
      collectionId: view.collection_id,
    })
    onClose()
  }

  function selectCollection(collection: CollectionRow) {
    if (!requestedViewType) {
      onSelect({ kind: 'collection', id: collection.id, name: collection.name })
      onClose()
      return
    }

    const existing = views.find(
      (view) =>
        view.collection_id === collection.id &&
        view.view_type === requestedViewType,
    )
    if (existing) {
      selectView(existing)
      return
    }

    startTransition(async () => {
      setError(null)
      const label = requestedMeta?.label ?? requestedViewType
      const result = await createView({
        workspaceId,
        collectionId: collection.id,
        name: label,
        viewType: requestedViewType as SavedViewType,
      })
      if (!result.ok || !result.data) {
        setError(result.ok ? 'Could not create the requested view.' : result.error)
        return
      }
      onSelect({
        kind: 'view',
        id: result.data.id,
        name: label,
        viewType: requestedViewType,
        collectionId: collection.id,
      })
      onClose()
    })
  }

  function handleCreateNew() {
    const trimmed = newName.trim()
    if (!trimmed) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('workspaceId', workspaceId)
      fd.set('name', trimmed)
      const result = await createCollection({ status: 'idle' }, fd)
      if (result.status === 'success' && 'collectionId' in result) {
        const created = (result as unknown as { collectionId: string }).collectionId
        if (requestedViewType) {
          const label = requestedMeta?.label ?? requestedViewType
          const viewResult = await createView({
            workspaceId,
            collectionId: created,
            name: label,
            viewType: requestedViewType as SavedViewType,
          })
          if (viewResult.ok && viewResult.data) {
            onSelect({
              kind: 'view',
              id: viewResult.data.id,
              name: label,
              viewType: requestedViewType,
              collectionId: created,
            })
            onClose()
            return
          }
        }
        onSelect({ kind: 'collection', id: created, name: trimmed })
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick a database source</DialogTitle>
          <DialogDescription>
            {requestedMeta
              ? `Choose a ${requestedMeta.label.toLowerCase()} source. SKAIL will use an exact saved view for this block.`
              : 'Choose an existing collection or view, or create a new database.'}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collection">
              <DatabaseIcon className="mr-1.5 size-3.5" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="view">
              <LayoutGridIcon className="mr-1.5 size-3.5" />
              Views
            </TabsTrigger>
            <TabsTrigger value="new">
              <PlusIcon className="mr-1.5 size-3.5" />
              New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="space-y-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search collections…"
              className="h-8 text-sm"
            />
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {loading ? (
                <li className="px-3 py-3 text-xs text-muted-foreground">Loading…</li>
              ) : filteredCollections.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No collections match.
                </li>
              ) : (
                filteredCollections.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40',
                      pending && 'pointer-events-none opacity-60',
                    )}
                    onClick={() => selectCollection(c)}
                  >
                    <DatabaseIcon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {requestedViewType ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {views.some(
                          (v) =>
                            v.collection_id === c.id &&
                            v.view_type === requestedViewType,
                        )
                          ? requestedViewType
                          : `new ${requestedViewType}`}
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </TabsContent>

          <TabsContent value="view" className="space-y-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search views…"
              className="h-8 text-sm"
            />
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {loading ? (
                <li className="px-3 py-3 text-xs text-muted-foreground">Loading…</li>
              ) : filteredViews.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No views match.
                </li>
              ) : (
                filteredViews.map((v) => (
                  <li
                    key={v.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40"
                    onClick={() => selectView(v)}
                  >
                    <LayoutGridIcon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{v.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {v.view_type}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </TabsContent>

          <TabsContent value="new" className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                New collection name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Customers"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew()
                }}
              />
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <SparklesIcon className="size-3" />
                Generate from AI prompt — coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {tab === 'new' ? (
            <Button onClick={handleCreateNew} disabled={pending || !newName.trim()}>
              {pending ? 'Creating…' : 'Create database'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -- Helpers used by blocks --

export function viewTypeHintToSubtype(hint: ViewTypeHint | null): {
  viewType: ViewTypeHint
  chartSubtype?: 'bar' | 'line' | 'pie' | 'donut' | 'area'
} {
  if (!hint) return { viewType: 'table' }
  return { viewType: hint }
}
