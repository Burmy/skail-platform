'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import {
  createRecordInline,
  updateRecordField,
  updateViewFieldLayout,
} from '@/app/databases/actions'
import type {
  CollectionFieldWithType,
} from '@/lib/databases/queries'
import type {
  CollectionRecordWithValues,
} from '@/lib/properties/types'
import type { SavedViewWithConfig } from '@/lib/views/types'

import { FieldCell } from '../field-cell'
import { PropertyHeaderMenu } from '../property-header-menu'
import { AddFieldPopover } from '../add-field-popover'
import type { RecordMutators } from '../hooks/use-optimistic-records'

const DEFAULT_COL_WIDTH = 200
const TITLE_COL_WIDTH = 280

type ColumnSpec = {
  fieldId: string
  field: CollectionFieldWithType
  width: number
  isTitle: boolean
}

export type DatabaseTableViewProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  mutators?: RecordMutators
  titleFieldId: string | null
  canManageSchema: boolean
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  embedded?: boolean
  onOpenRecord: (recordId: string) => void
  onArchiveField?: (field: CollectionFieldWithType) => void
  onSaveStateChange?: (state: 'idle' | 'saving' | 'saved' | 'error') => void
}

export function DatabaseTableView(props: DatabaseTableViewProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    records,
    mutators,
    titleFieldId,
    canManageSchema,
    readOnly = false,
    canConfigureView = canManageSchema,
    pageId,
    embedded = false,
    onOpenRecord,
    onArchiveField,
    onSaveStateChange,
  } = props

  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns: ColumnSpec[] = useMemo(() => {
    const fieldsById = new Map(fields.map((f) => [f.id, f]))
    const visible = new Set(
      view.config.visibleFieldIds.length > 0
        ? view.config.visibleFieldIds
        : fields.map((f) => f.id),
    )
    const orderSeed = view.config.fieldOrder.length > 0
      ? view.config.fieldOrder
      : fields.map((f) => f.id)

    // Title always renders first, regardless of order, when present and visible.
    const titleField = titleFieldId ? fieldsById.get(titleFieldId) : null
    const seen = new Set<string>()
    const cols: ColumnSpec[] = []

    if (titleField && visible.has(titleField.id)) {
      cols.push({
        fieldId: titleField.id,
        field: titleField,
        width: view.config.columnWidths[titleField.id] ?? TITLE_COL_WIDTH,
        isTitle: true,
      })
      seen.add(titleField.id)
    }

    for (const id of orderSeed) {
      if (seen.has(id)) continue
      if (!visible.has(id)) continue
      const field = fieldsById.get(id)
      if (!field) continue
      cols.push({
        fieldId: id,
        field,
        width: view.config.columnWidths[id] ?? DEFAULT_COL_WIDTH,
        isTitle: false,
      })
      seen.add(id)
    }
    return cols
  }, [fields, titleFieldId, view.config])

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) + 40 // 40 = row-end actions gutter

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 12,
  })

  async function handleSaveCell(
    record: CollectionRecordWithValues,
    fieldId: string,
    value: unknown,
    clientRequestId: string,
  ) {
    if (readOnly) {
      return { ok: false, error: 'This database is read-only.' }
    }

    onSaveStateChange?.('saving')
    // Optimistic local update so the value persists across re-renders
    // without waiting for server roundtrip + revalidation.
    mutators?.setFieldValue(record.id, fieldId, value)
    const result = await updateRecordField({
      workspaceId,
      recordId: record.id,
      fieldId,
      value,
      clientRequestId,
      pageId,
    })
    onSaveStateChange?.(result.ok ? 'saved' : 'error')
    return { ok: result.ok, error: result.ok ? undefined : result.error }
  }

  function handleColumnReorder(event: DragEndEvent) {
    if (!canConfigureView) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    // Build the next order excluding title (which is pinned) and persist with title prepended.
    const reorderable = columns.filter((c) => !c.isTitle).map((c) => c.fieldId)
    const oldIndex = reorderable.indexOf(String(active.id))
    const newIndex = reorderable.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(reorderable, oldIndex, newIndex)
    const titleId = columns.find((c) => c.isTitle)?.fieldId
    const persistedOrder = titleId ? [titleId, ...next] : next
    startTransition(async () => {
      await updateViewFieldLayout({
        workspaceId,
        viewId: view.id,
        visibleFieldIds: view.config.visibleFieldIds.length > 0
          ? view.config.visibleFieldIds
          : fields.map((f) => f.id),
        fieldOrder: persistedOrder,
      })
      if (!embedded) router.refresh()
    })
  }

  function handleAddRow() {
    if (readOnly) return
    const tempId = `tmp_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    // Optimistic insert
    mutators?.insertRecord({
      id: tempId,
      collection_id: collectionId,
      workspace_id: workspaceId,
      title: 'Untitled',
      created_at: now,
      updated_at: now,
      created_by: null,
      archived_at: null,
      values: {},
    } as CollectionRecordWithValues)
    startTransition(async () => {
      onSaveStateChange?.('saving')
      const result = await createRecordInline({
        workspaceId,
        collectionId,
        seedTitle: 'Untitled',
        pageId,
      })
      onSaveStateChange?.(result.ok ? 'saved' : 'error')
      if (result.ok && result.data) {
        mutators?.replaceRecordId(tempId, result.data.id)
      } else {
        mutators?.removeRecord(tempId)
      }
    })
  }

  return (
    <div
      ref={containerRef}
      className="flex max-h-full flex-col overflow-auto"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleColumnReorder}
      >
        <div className="min-w-full" style={{ width: totalWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex h-9 border-b bg-background">
            <SortableContext
              items={columns.filter((c) => !c.isTitle).map((c) => c.fieldId)}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col) =>
                col.isTitle ? (
                  <TitleHeaderCell
                    key={col.fieldId}
                    width={col.width}
                    field={col.field}
                    workspaceId={workspaceId}
                    viewId={view.id}
                    viewConfig={view.config}
                    canManageSchema={canManageSchema}
                    onArchiveField={onArchiveField}
                    suppressRefresh={embedded}
                  />
                ) : (
                  <DraggableHeaderCell
                    key={col.fieldId}
                    width={col.width}
                    field={col.field}
                    workspaceId={workspaceId}
                    viewId={view.id}
                    viewConfig={view.config}
                    canManageSchema={canManageSchema}
                    onArchiveField={onArchiveField}
                    suppressRefresh={embedded}
                  />
                ),
              )}
              <div className="flex w-10 items-center justify-center">
                {canManageSchema ? (
                  <AddFieldPopover workspaceId={workspaceId} collectionId={collectionId} />
                ) : null}
              </div>
            </SortableContext>
          </div>

          {/* Body (virtualized) */}
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const record = records[virtualRow.index]
              if (!record) return null
              return (
                <div
                  key={record.id}
                  className="absolute left-0 top-0 flex border-b transition-colors hover:bg-accent/20 group"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: virtualRow.size,
                    width: totalWidth,
                  }}
                  data-record-id={record.id}
                >
                  {columns.map((col) => (
                    <div
                      key={col.fieldId}
                      className={cn(
                        'flex items-center border-r px-1.5 py-1',
                        col.isTitle && 'sticky left-0 z-10 bg-background',
                      )}
                      style={{ width: col.width }}
                    >
                      <FieldCell
                        workspaceId={workspaceId}
                        field={col.field}
                        record={record}
                        allFields={fields}
                        onOpenRecord={col.isTitle ? () => onOpenRecord(record.id) : undefined}
                        onSave={(fieldId, value, crq) =>
                          handleSaveCell(record, fieldId, value, crq)
                        }
                        isReadOnly={readOnly}
                        suppressRefresh={embedded}
                      />
                    </div>
                  ))}
                  <div className="w-10" />
                </div>
              )
            })}
          </div>

          {/* Footer: add-row */}
          {!readOnly ? (
            <div
              className="sticky bottom-0 z-10 flex h-9 items-center border-t bg-background"
              style={{ width: totalWidth }}
            >
              <button
                type="button"
                onClick={handleAddRow}
                className="flex w-full items-center gap-1.5 px-2 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                <PlusIcon className="size-3.5" />
                New record
              </button>
            </div>
          ) : null}
        </div>
      </DndContext>
    </div>
  )
}

function HeaderLabel({
  field,
  canManageSchema,
  workspaceId,
  suppressRefresh,
}: {
  field: CollectionFieldWithType
  canManageSchema: boolean
  workspaceId: string
  suppressRefresh?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(field.name)
  const editable = canManageSchema && !field.is_locked

  function commit() {
    const trimmed = name.trim()
    if (trimmed === '' || trimmed === field.name) {
      setEditing(false)
      setName(field.name)
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('workspaceId', workspaceId)
      formData.set('collectionId', field.collection_id!)
      formData.set('fieldId', field.id)
      formData.set('name', trimmed)
      formData.set('fieldType', field.field_type)
      formData.set('originalFieldType', field.field_type)
      formData.set('confirmTypeChange', 'false')
      formData.set('semanticRole', field.semantic_role ?? '')
      formData.set('isRequired', field.is_required ? 'on' : 'off')
      const { updateField } = await import('@/app/databases/actions')
      await updateField({ status: 'idle' }, formData)
      setEditing(false)
      if (!suppressRefresh) router.refresh()
    })
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setName(field.name)
          }
        }}
        className="h-6 flex-1 rounded-sm border border-foreground/30 bg-background px-1 text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
        maxLength={80}
      />
    )
  }

  return (
    <span
      onDoubleClick={() => editable && setEditing(true)}
      className="flex-1 truncate text-left text-xs font-medium text-muted-foreground"
      title={editable ? 'Double-click to rename' : field.name}
    >
      {field.name}
    </span>
  )
}

function TitleHeaderCell({
  width,
  field,
  workspaceId,
  viewId,
  viewConfig,
  canManageSchema,
  onArchiveField,
  suppressRefresh,
}: {
  width: number
  field: CollectionFieldWithType
  workspaceId: string
  viewId: string
  viewConfig: SavedViewWithConfig['config']
  canManageSchema: boolean
  onArchiveField?: (field: CollectionFieldWithType) => void
  suppressRefresh?: boolean
}) {
  return (
    <div
      className="sticky left-0 z-30 flex h-9 items-center gap-1 border-r bg-background px-2"
      style={{ width }}
    >
      <HeaderLabel
        field={field}
        canManageSchema={canManageSchema}
        workspaceId={workspaceId}
        suppressRefresh={suppressRefresh}
      />
      <PropertyHeaderMenu
        workspaceId={workspaceId}
        viewId={viewId}
        field={field}
        viewConfig={viewConfig}
        canManageSchema={canManageSchema}
        onArchiveField={onArchiveField}
      />
    </div>
  )
}

function DraggableHeaderCell(props: {
  width: number
  field: CollectionFieldWithType
  workspaceId: string
  viewId: string
  viewConfig: SavedViewWithConfig['config']
  canManageSchema: boolean
  onArchiveField?: (field: CollectionFieldWithType) => void
  suppressRefresh?: boolean
}) {
  const {
    width,
    field,
    workspaceId,
    viewId,
    viewConfig,
    canManageSchema,
    onArchiveField,
    suppressRefresh,
  } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        width,
      }}
      className="flex h-9 items-center gap-1 border-r px-2"
    >
      <span
        {...attributes}
        {...listeners}
        className="-ml-1 flex h-6 w-2 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-muted-foreground"
        aria-label="Drag column"
      >
        ⋮⋮
      </span>
      <HeaderLabel
        field={field}
        canManageSchema={canManageSchema}
        workspaceId={workspaceId}
        suppressRefresh={suppressRefresh}
      />
      <PropertyHeaderMenu
        workspaceId={workspaceId}
        viewId={viewId}
        field={field}
        viewConfig={viewConfig}
        canManageSchema={canManageSchema}
        onArchiveField={onArchiveField}
      />
    </div>
  )
}
