'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArchiveIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createRecordInline } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { SavedViewWithConfig, ViewConfig } from '@/lib/views/types'
import {
  SourcePickerDialog,
  type SourceSelection,
  type ViewTypeHint,
} from '@/components/pages/source-picker-dialog'

import { SavingIndicator, type GlobalSaveState } from './saving-indicator'
import { PropertyVisibilityPopover } from './property-visibility-popover'
import { FilterPopover } from './filter-popover'
import { AdvancedFilterPopover } from './advanced-filter-popover'
import { SortPopover } from './sort-popover'
import type { ViewConfigMutators } from './hooks/use-optimistic-view'

export type DatabaseToolbarProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  saveState: GlobalSaveState
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMutators: ViewConfigMutators
  onOpenArchive: () => void
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  embedded?: boolean
  persistViewChanges?: boolean
  sourceControl?: {
    sourceName: string
    viewType: ViewTypeHint
    databaseHref: string | null
    canOpenDatabaseApp: boolean
    canManageSource: boolean
    onSourceChange: (selection: SourceSelection) => void
  }
  onCreateRecord?: () => Promise<void> | void
  onViewConfigPatch?: (patch: Partial<ViewConfig>) => void
}

export function DatabaseToolbar(props: DatabaseToolbarProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    saveState,
    searchQuery,
    onSearchChange,
    viewMutators,
    onOpenArchive,
    readOnly = false,
    canConfigureView = true,
    pageId,
    embedded = false,
    persistViewChanges = true,
    sourceControl,
    onCreateRecord,
    onViewConfigPatch,
  } = props
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-1">
        {canConfigureView ? (
          <>
            <FilterPopover
              workspaceId={workspaceId}
              viewId={view.id}
              fields={fields}
              initialFilters={view.config.filters}
              persistChanges={persistViewChanges}
              onLocalChange={(filters) => {
                viewMutators.setFilters(filters)
                onViewConfigPatch?.({ filters })
              }}
            />
            <AdvancedFilterPopover
              workspaceId={workspaceId}
              viewId={view.id}
              fields={fields}
              initialTree={view.config.filterTree ?? null}
              persistChanges={persistViewChanges}
              onLocalChange={(filterTree) => {
                viewMutators.setFilterTree(filterTree)
                onViewConfigPatch?.({ filterTree: filterTree ?? undefined })
              }}
            />
            <SortPopover
              workspaceId={workspaceId}
              viewId={view.id}
              fields={fields}
              initialSorts={view.config.sorts}
              persistChanges={persistViewChanges}
              onLocalChange={(sorts) => {
                viewMutators.setSorts(sorts)
                onViewConfigPatch?.({ sorts })
              }}
            />
            <PropertyVisibilityPopover
              workspaceId={workspaceId}
              viewId={view.id}
              fields={fields}
              initialVisibleFieldIds={view.config.visibleFieldIds}
              initialFieldOrder={view.config.fieldOrder}
              persistChanges={persistViewChanges}
              onLocalChange={(visibleFieldIds, fieldOrder) => {
                viewMutators.setVisibleFields(visibleFieldIds, fieldOrder)
                onViewConfigPatch?.({ visibleFieldIds, fieldOrder })
              }}
            />
          </>
        ) : null}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value)
              if (embedded) onViewConfigPatch?.({ search: e.target.value })
            }}
            placeholder="Search..."
            className="h-7 w-44 pl-7 text-sm"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SavingIndicator state={saveState} />
        {canConfigureView ? (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={onOpenArchive}
          >
            <ArchiveIcon className="size-3.5" />
            Archive
          </Button>
        ) : null}
        {embedded && sourceControl ? (
          <EmbeddedSourceControl
            workspaceId={workspaceId}
            collectionName={sourceControl.sourceName}
            viewName={view.name}
            viewType={sourceControl.viewType}
            databaseHref={sourceControl.databaseHref}
            canOpenDatabaseApp={sourceControl.canOpenDatabaseApp}
            canManageSource={sourceControl.canManageSource}
            onSourceChange={sourceControl.onSourceChange}
          />
        ) : null}
        {!readOnly ? (
          <Button
            size="sm"
            className="gap-1"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                if (onCreateRecord) {
                  await onCreateRecord()
                  return
                }
                const result = await createRecordInline({
                  workspaceId,
                  collectionId,
                  seedTitle: 'Untitled',
                  pageId,
                })
                if (result.ok) router.refresh()
              })
            }}
          >
            <PlusIcon className="size-3.5" />
            New
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function EmbeddedSourceControl({
  workspaceId,
  collectionName,
  viewName,
  viewType,
  databaseHref,
  canOpenDatabaseApp,
  canManageSource,
  onSourceChange,
}: {
  workspaceId: string
  collectionName: string
  viewName: string
  viewType: ViewTypeHint
  databaseHref: string | null
  canOpenDatabaseApp: boolean
  canManageSource: boolean
  onSourceChange: (selection: SourceSelection) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1"
            aria-label="Switch database source or saved view"
          >
            <Settings2Icon className="size-3.5" />
            <span className="text-xs">Source</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <div className="flex flex-col gap-2">
            <div className="rounded-md border bg-muted/20 p-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DatabaseIcon className="size-3.5 text-muted-foreground" />
                <span className="truncate">{collectionName || 'Database'}</span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                View: {viewName} ({viewType})
              </p>
            </div>
            {canManageSource ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => setPickerOpen(true)}
              >
                <DatabaseIcon className="size-3.5" />
                Change database or view
              </Button>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">
                You can edit exposed records, but source changes require manage access.
              </p>
            )}
            {canOpenDatabaseApp && databaseHref ? (
              <Button
                asChild
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
              >
                <Link href={databaseHref}>
                  <ExternalLinkIcon className="size-3.5" />
                  Open in Databases
                </Link>
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      {canManageSource ? (
        <SourcePickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(selection) => {
            onSourceChange(selection)
            setPickerOpen(false)
          }}
          workspaceId={workspaceId}
          initialTab="view"
          requestedViewType={viewType}
        />
      ) : null}
    </>
  )
}
