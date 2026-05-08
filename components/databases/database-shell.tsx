'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { CollectionWorkspaceData } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { ViewConfig } from '@/lib/views/types'
import type { SourceSelection, ViewTypeHint } from '@/components/pages/source-picker-dialog'
import { applyClientFilterSearchSort } from '@/lib/databases/filter-client'
import {
  archiveCollection,
  archiveField,
  archiveRecord,
  archiveView,
  createRecordInline,
  restoreCollection,
  restoreField,
  restoreRecord,
  restoreView,
} from '@/app/databases/actions'

import { CollectionTabs } from './collection-tabs'
import { CollectionTitle } from './collection-title'
import { ViewTabs } from './view-tabs'
import { DatabaseToolbar } from './database-toolbar'
import { FilterPresetsStrip } from './filter-presets-strip'
import { ArchiveDrawer } from './archive-drawer'
import { RecordSideSheet } from './record-side-sheet'
import { DatabaseViewRenderer } from './views/database-view-renderer'
import { useRealtimeDatabase } from './hooks/use-realtime-database'
import { useDatabaseShortcuts } from './hooks/use-keyboard-grid-nav'
import { useOptimisticArchive } from './hooks/use-optimistic-archive'
import { useOptimisticRecords } from './hooks/use-optimistic-records'
import { useOptimisticView } from './hooks/use-optimistic-view'
import type { GlobalSaveState } from './saving-indicator'

export type DatabaseShellProps = {
  data: CollectionWorkspaceData
  embedded?: boolean
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  sourceControl?: {
    sourceName: string
    viewType: ViewTypeHint
    databaseHref: string | null
    canOpenDatabaseApp: boolean
    canManageSource: boolean
    onSourceChange: (selection: SourceSelection) => void
  }
  viewConfigOverrides?: Partial<ViewConfig> | null
  onViewConfigOverridesChange?: (next: Partial<ViewConfig>) => void
}

export function DatabaseShell({
  data,
  embedded = false,
  readOnly = false,
  canConfigureView = data.canManageSchema,
  pageId,
  sourceControl,
  viewConfigOverrides,
  onViewConfigOverridesChange,
}: DatabaseShellProps) {
  const router = useRouter()
  const [saveState, setSaveState] = useState<GlobalSaveState>('idle')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  const { records, mutators } = useOptimisticRecords(data.records)
  const { view, searchQuery, mutators: viewMutators } = useOptimisticView(
    data.activeView,
  )
  const archiveCoordinator = useOptimisticArchive(() => router.refresh())

  const collections = useMemo(
    () =>
      data.collections.filter(
        (collection) => !archiveCoordinator.isArchived('collection', collection.id),
      ),
    [archiveCoordinator, data.collections],
  )

  const fields = useMemo(
    () =>
      data.fields.filter(
        (field) => !archiveCoordinator.isArchived('field', field.id),
      ),
    [archiveCoordinator, data.fields],
  )

  const views = useMemo(
    () =>
      data.views.filter(
        (savedView) => !archiveCoordinator.isArchived('view', savedView.id),
      ),
    [archiveCoordinator, data.views],
  )

  const baseRecords = useMemo(
    () =>
      records.filter(
        (record) => !archiveCoordinator.isArchived('record', record.id),
      ),
    [archiveCoordinator, records],
  )

  const activeView = archiveCoordinator.isArchived('view', view.id)
    ? views[0] ?? view
    : view

  useRealtimeDatabase({
    workspaceId: data.workspaceId,
    collectionId: data.collection.id,
    enabled: !embedded,
  })

  useDatabaseShortcuts(
    embedded
      ? {}
      : {
          onOpenSearch: () => {
            const input = document.querySelector<HTMLInputElement>(
              'input[placeholder="Search…"]',
            )
            input?.focus()
          },
          onOpenArchive: () => setArchiveOpen(true),
          onOpenFocusedRow: () => {
            const focused = document.activeElement?.closest<HTMLElement>(
              '[data-record-id]',
            )
            const id = focused?.getAttribute('data-record-id')
            if (id) setOpenRecordId(id)
          },
          onNewRecord: async () => {
            const button = Array.from(document.querySelectorAll('button')).find(
              (b) => b.textContent?.trim() === 'New',
            )
            button?.click()
          },
        },
  )

  // Apply filters / search / sorts client-side so changes feel instant.
  const filteredRecords = useMemo(
    () =>
      applyClientFilterSearchSort(baseRecords, {
        config: activeView.config,
        fields,
        searchQuery,
        titleFieldId: data.titleFieldId,
      }),
    [baseRecords, activeView.config, fields, searchQuery, data.titleFieldId],
  )

  const openRecord: CollectionRecordWithValues | null =
    baseRecords.find((r) => r.id === openRecordId) ?? null

  const handleArchiveRecord = useCallback(
    (record: CollectionRecordWithValues) => {
      archiveCoordinator.archive({
        kind: 'record',
        id: record.id,
        archive: () => archiveRecord({ workspaceId: data.workspaceId, recordId: record.id }),
        restore: () => restoreRecord({ workspaceId: data.workspaceId, recordId: record.id }),
        onOptimistic: () => setOpenRecordId(null),
      })
    },
    [archiveCoordinator, data.workspaceId],
  )

  const handleArchiveField = useCallback(
    (field: CollectionWorkspaceData['fields'][number]) => {
      archiveCoordinator.archive({
        kind: 'field',
        id: field.id,
        archive: () => archiveField({ workspaceId: data.workspaceId, fieldId: field.id }),
        restore: () => restoreField({ workspaceId: data.workspaceId, fieldId: field.id }),
      })
    },
    [archiveCoordinator, data.workspaceId],
  )

  const handleArchiveView = useCallback(
    (viewToArchive: CollectionWorkspaceData['views'][number]) => {
      const nextView = views.find((candidate) => candidate.id !== viewToArchive.id)
      archiveCoordinator.archive({
        kind: 'view',
        id: viewToArchive.id,
        archive: () => archiveView({ workspaceId: data.workspaceId, viewId: viewToArchive.id }),
        restore: () => restoreView({ workspaceId: data.workspaceId, viewId: viewToArchive.id }),
        onOptimistic: () => {
          if (nextView) {
            router.push(
              `/databases/${data.collection.id}?workspace_id=${data.workspaceId}&view=${nextView.id}`,
            )
          } else {
            router.push(`/databases/${data.collection.id}?workspace_id=${data.workspaceId}`)
          }
        },
      })
    },
    [archiveCoordinator, data.collection.id, data.workspaceId, router, views],
  )

  const handleArchiveCollection = useCallback(() => {
    const nextCollection = collections.find(
      (collection) => collection.id !== data.collection.id,
    )
    archiveCoordinator.archive({
      kind: 'collection',
      id: data.collection.id,
      archive: () =>
        archiveCollection({
          workspaceId: data.workspaceId,
          collectionId: data.collection.id,
        }),
      restore: () =>
        restoreCollection({
          workspaceId: data.workspaceId,
          collectionId: data.collection.id,
        }),
      onOptimistic: () => {
        if (nextCollection) {
          router.push(`/databases/${nextCollection.id}?workspace_id=${data.workspaceId}`)
        }
      },
    })
  }, [archiveCoordinator, collections, data.collection.id, data.workspaceId, router])

  const handleCreateRecord = useCallback(async () => {
    const tempId = `tmp_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    mutators.insertRecord({
      id: tempId,
      collection_id: data.collection.id,
      workspace_id: data.workspaceId,
      title: 'Untitled',
      created_at: now,
      updated_at: now,
      created_by: null,
      archived_at: null,
      values: {},
    } as CollectionRecordWithValues)
    setSaveState('saving')
    const result = await createRecordInline({
      workspaceId: data.workspaceId,
      collectionId: data.collection.id,
      seedTitle: 'Untitled',
      pageId,
    })
    setSaveState(result.ok ? 'saved' : 'error')
    if (result.ok && result.data) {
      mutators.replaceRecordId(tempId, result.data.id)
      window.setTimeout(() => setSaveState('idle'), 1200)
    } else {
      mutators.removeRecord(tempId)
    }
  }, [data.collection.id, data.workspaceId, mutators, pageId])

  return (
    <div
      className={cn(
        'flex w-full flex-col',
        embedded
          ? 'rounded-md border bg-background'
          : 'h-[calc(100vh-3rem)]',
      )}
      data-density={view.config.density}
    >
      {embedded ? null : (
        <CollectionTabs
          workspaceId={data.workspaceId}
          collections={collections}
          activeCollectionId={data.collection.id}
          canManageSchema={data.canManageSchema}
        />
      )}
      <main
        className={cn(
          'flex flex-col',
          embedded ? '' : 'flex-1 overflow-hidden',
        )}
      >
        <header
          className={cn(
            'flex flex-col gap-2 bg-background px-4 pt-3',
            embedded ? '' : 'border-b',
          )}
        >
          {embedded ? null : (
            <>
              <CollectionTitle
                workspaceId={data.workspaceId}
                collectionId={data.collection.id}
                initialName={data.collection.name}
                canManageSchema={data.canManageSchema}
                recordCount={filteredRecords.length}
                fieldCount={fields.length}
                onArchive={handleArchiveCollection}
              />
              <ViewTabs
                workspaceId={data.workspaceId}
                collectionId={data.collection.id}
                views={views}
                activeViewId={activeView.id}
                onArchiveView={handleArchiveView}
              />
            </>
          )}
          <DatabaseToolbar
            workspaceId={data.workspaceId}
            collectionId={data.collection.id}
            view={activeView}
            fields={fields}
            saveState={saveState}
            searchQuery={searchQuery}
            onSearchChange={viewMutators.setSearchQuery}
            viewMutators={viewMutators}
            onOpenArchive={() => setArchiveOpen(true)}
            readOnly={readOnly}
            canConfigureView={canConfigureView}
            pageId={pageId}
            embedded={embedded}
            sourceControl={sourceControl}
            onCreateRecord={embedded ? handleCreateRecord : undefined}
            persistViewChanges={!embedded}
            onViewConfigPatch={(patch) => {
              if (!embedded || !onViewConfigOverridesChange) return
              onViewConfigOverridesChange({
                ...(viewConfigOverrides ?? {}),
                ...patch,
              })
            }}
          />
          {embedded ? null : (
            <FilterPresetsStrip
              workspaceId={data.workspaceId}
              viewId={activeView.id}
              presets={activeView.config.filterPresets ?? []}
              activePresetId={activeView.config.activePresetId ?? null}
              currentFilters={activeView.config.filters}
              currentTree={activeView.config.filterTree ?? null}
            />
          )}
        </header>
        <section
          className={cn(embedded ? 'flex flex-col' : 'flex-1 overflow-hidden')}
        >
          <DatabaseViewRenderer
            workspaceId={data.workspaceId}
            collectionId={data.collection.id}
            view={activeView}
            fields={fields}
            records={filteredRecords}
            mutators={mutators}
            viewMutators={viewMutators}
            titleFieldId={data.titleFieldId}
            canManageSchema={data.canManageSchema}
            readOnly={readOnly}
            canConfigureView={canConfigureView}
            pageId={pageId}
            onOpenRecord={(id) => setOpenRecordId(id)}
            onArchiveField={handleArchiveField}
            onSaveStateChange={setSaveState}
          />
        </section>
      </main>

      <RecordSideSheet
        workspaceId={data.workspaceId}
        open={openRecordId !== null}
        onClose={() => setOpenRecordId(null)}
        record={openRecord}
        fields={fields}
        titleFieldId={data.titleFieldId}
        onArchiveRecord={handleArchiveRecord}
        readOnly={readOnly}
        pageId={pageId}
      />

      {!embedded ? (
        <ArchiveDrawer
          workspaceId={data.workspaceId}
          collectionId={data.collection.id}
          open={archiveOpen}
          onClose={() => setArchiveOpen(false)}
        />
      ) : null}
    </div>
  )
}
