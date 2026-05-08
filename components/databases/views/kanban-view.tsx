'use client'

import { useMemo, useState, useTransition, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  PlusIcon,
} from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  addFieldOption,
  createRecordInline,
  moveKanbanCard,
  updateKanbanConfig,
} from '@/app/databases/actions'
import {
  parseFieldOptions,
  type CollectionRecordWithValues,
  type FieldOption,
} from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { SavedViewWithConfig, ViewConfig } from '@/lib/views/types'

import { FieldCell } from '../field-cell'
import { newClientRequestId } from '@/lib/databases/realtime'
import type { RecordMutators } from '../hooks/use-optimistic-records'

const NULL_KEY = '__null__'

export type KanbanViewProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  mutators?: RecordMutators
  titleFieldId: string | null
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  embedded?: boolean
  onViewConfigPatch?: (patch: Partial<ViewConfig>) => void
  onOpenRecord: (recordId: string) => void
}

type Column = {
  key: string
  label: string
  color?: string
  optionId: string | null
}

function readGroupValues(record: CollectionRecordWithValues, fieldId: string): string[] {
  const raw = record.values[fieldId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('value' in raw)) return [NULL_KEY]
  const inner = (raw as Record<string, Json>).value
  if (Array.isArray(inner)) {
    return inner.flatMap((v) => (typeof v === 'string' ? [v] : []))
  }
  if (typeof inner === 'string') return [inner]
  if (inner === null || inner === undefined) return [NULL_KEY]
  return [String(inner)]
}

export function KanbanView(props: KanbanViewProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    records,
    mutators,
    titleFieldId,
    readOnly = false,
    canConfigureView = true,
    pageId,
    embedded = false,
    onViewConfigPatch,
    onOpenRecord,
  } = props
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)

  const groupField = useMemo(
    () => fields.find((f) => f.id === view.config.kanban.groupFieldId) ?? null,
    [fields, view.config.kanban.groupFieldId],
  )

  const groupableFields = fields.filter((f) =>
    ['status', 'select', 'multi_select', 'person'].includes(f.field_type),
  )

  const columns: Column[] = useMemo(() => {
    if (!groupField) return [{ key: NULL_KEY, label: 'No value', optionId: null }]
    const opts: FieldOption[] = parseFieldOptions(groupField.options_json)
    const list: Column[] = opts.map((opt) => ({
      key: opt.id,
      label: opt.label,
      color: opt.color,
      optionId: opt.id,
    }))
    list.push({ key: NULL_KEY, label: 'No value', optionId: null })
    if (view.config.kanban.columnOrder?.length) {
      const order = view.config.kanban.columnOrder
      list.sort((a, b) => {
        const ai = order.indexOf(a.key)
        const bi = order.indexOf(b.key)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    return list
  }, [groupField, view.config.kanban.columnOrder])

  const cardsByColumn = useMemo(() => {
    if (!groupField) return new Map([[NULL_KEY, records.map((r) => r.id)]])
    const map = new Map<string, string[]>()
    for (const c of columns) map.set(c.key, [])
    for (const record of records) {
      const keys = readGroupValues(record, groupField.id)
      for (const key of keys) {
        const list = map.get(key) ?? map.get(NULL_KEY)!
        list.push(record.id)
      }
    }
    // Apply persisted manual ordering when available
    const cardOrder = view.config.kanban.cardOrder ?? {}
    for (const [key, ids] of map.entries()) {
      const persisted = cardOrder[key]
      if (!persisted) continue
      const persistedSet = new Set(persisted)
      const ordered = persisted.filter((id) => ids.includes(id))
      const newcomers = ids.filter((id) => !persistedSet.has(id))
      map.set(key, [...ordered, ...newcomers])
    }
    return map
  }, [columns, groupField, records, view.config.kanban.cardOrder])

  const collapsed = new Set(view.config.kanban.collapsedColumns ?? [])

  function setGroupField(fieldId: string | null) {
    if (!canConfigureView) return
    const nextKanban = { ...view.config.kanban, groupFieldId: fieldId }
    onViewConfigPatch?.({ kanban: nextKanban })
    if (embedded) return
    startTransition(async () => {
      await updateKanbanConfig({ workspaceId, viewId: view.id, groupFieldId: fieldId })
    })
  }

  function toggleCollapsed(key: string) {
    if (!canConfigureView) return
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    const nextKanban = {
      ...view.config.kanban,
      groupFieldId: groupField?.id ?? null,
      collapsedColumns: Array.from(next),
    }
    onViewConfigPatch?.({ kanban: nextKanban })
    if (embedded) return
    startTransition(async () => {
      await updateKanbanConfig({
        workspaceId,
        viewId: view.id,
        groupFieldId: groupField?.id ?? null,
        collapsedColumns: Array.from(next),
      })
    })
  }

  function handleAddCard(columnKey: string) {
    if (readOnly) return
    const tempId = `tmp_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    if (groupField) {
      mutators?.insertRecord({
        id: tempId,
        collection_id: collectionId,
        workspace_id: workspaceId,
        title: 'Untitled',
        created_at: now,
        updated_at: now,
        created_by: null,
        archived_at: null,
        values: columnKey === NULL_KEY ? {} : { [groupField.id]: { value: columnKey as never } },
      } as CollectionRecordWithValues)
    }
    startTransition(async () => {
      const result = await createRecordInline({
        workspaceId,
        collectionId,
        seedTitle: 'Untitled',
        pageId,
      })
      if (!result.ok || !result.data || !groupField) {
        if (groupField) mutators?.removeRecord(tempId)
        return
      }
      mutators?.replaceRecordId(tempId, result.data.id)
      if (columnKey !== NULL_KEY) {
        await moveKanbanCard({
          workspaceId,
          viewId: view.id,
          recordId: result.data.id,
          toColumnValue: columnKey,
          toIndex: 0,
          clientRequestId: newClientRequestId(),
          pageId,
        })
      }
    })
  }

  function handleDragStart(event: DragStartEvent) {
    if (readOnly) return
    setActiveRecordId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    if (readOnly) return
    const { active, over } = event
    setActiveRecordId(null)
    if (!over) return
    const overId = String(over.id)
    const activeId = String(active.id)
    if (overId === activeId) return

    // over can be either a card id or a column id (`column:KEY`)
    let toColumn: string
    let toIndex: number
    if (overId.startsWith('column:')) {
      toColumn = overId.slice('column:'.length)
      const ids = cardsByColumn.get(toColumn) ?? []
      toIndex = ids.length
    } else {
      // Find which column the over card belongs to and its index
      let foundCol: string | null = null
      let foundIdx = 0
      for (const [col, ids] of cardsByColumn.entries()) {
        const idx = ids.indexOf(overId)
        if (idx !== -1) {
          foundCol = col
          foundIdx = idx
          break
        }
      }
      if (!foundCol) return
      toColumn = foundCol
      toIndex = foundIdx
    }

    const toColumnValue = toColumn === NULL_KEY ? null : toColumn

    // Optimistic: update the group field value locally so the card snaps
    // to the new column instantly without waiting for server.
    if (groupField) {
      mutators?.setFieldValue(
        activeId,
        groupField.id,
        toColumnValue,
      )
    }

    startTransition(async () => {
      await moveKanbanCard({
        workspaceId,
        viewId: view.id,
        recordId: activeId,
        toColumnValue,
        toIndex,
        clientRequestId: newClientRequestId(),
        pageId,
      })
    })
  }

  if (!groupField) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Pick a field to group cards by.
        </p>
        {groupableFields.length > 0 ? (
        <Select onValueChange={(v) => setGroupField(v)} disabled={!canConfigureView}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Group by…" />
            </SelectTrigger>
            <SelectContent>
              {groupableFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a status, select, multi-select, or person property to enable grouping.
          </p>
        )}
      </div>
    )
  }

  const recordsById = new Map(records.map((r) => [r.id, r]))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">Group by</span>
        <Select
          value={groupField.id}
          onValueChange={setGroupField}
          disabled={!canConfigureView}
        >
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupableFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-3 px-3 py-3">
            {columns.map((col) => {
              const ids = cardsByColumn.get(col.key) ?? []
              const isCollapsed = collapsed.has(col.key)
              return (
                <KanbanColumn
                  key={col.key}
                  columnKey={col.key}
                  label={col.label}
                  cardIds={ids}
                  isCollapsed={isCollapsed}
                  onToggleCollapsed={() => toggleCollapsed(col.key)}
                  onAddCard={() => handleAddCard(col.key)}
                  readOnly={readOnly}
                  canConfigureView={canConfigureView}
                >
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {ids.map((recordId) => {
                      const record = recordsById.get(recordId)
                      if (!record) return null
                      return (
                        <KanbanCard
                          key={recordId}
                          record={record}
                          fields={fields}
                          visibleFieldIds={view.config.visibleFieldIds}
                          groupFieldId={groupField.id}
                          titleFieldId={titleFieldId}
                          workspaceId={workspaceId}
                          onOpen={() => onOpenRecord(recordId)}
                          readOnly={readOnly}
                        />
                      )
                    })}
                  </SortableContext>
                </KanbanColumn>
              )
            })}
            {canConfigureView &&
            groupField &&
            (groupField.field_type === 'status' ||
              groupField.field_type === 'select' ||
              groupField.field_type === 'multi_select') ? (
              <AddKanbanColumn
                workspaceId={workspaceId}
                collectionId={collectionId}
                fieldId={groupField.id}
              />
            ) : null}
          </div>
          <DragOverlay>
            {activeRecordId ? (
              <KanbanCardOverlay
                record={recordsById.get(activeRecordId) ?? null}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

function KanbanColumn({
  columnKey,
  label,
  cardIds,
  isCollapsed,
  onToggleCollapsed,
  onAddCard,
  readOnly,
  canConfigureView,
  children,
}: {
  columnKey: string
  label: string
  cardIds: string[]
  isCollapsed: boolean
  onToggleCollapsed: () => void
  onAddCard: () => void
  readOnly: boolean
  canConfigureView: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${columnKey}`,
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex shrink-0 flex-col rounded-md bg-muted/30 transition-all',
        isCollapsed ? 'w-10' : 'w-72',
        isOver && !isCollapsed && 'ring-2 ring-ring',
      )}
    >
      <div className="flex items-center justify-between gap-1 border-b px-2 py-1.5">
        <button
          type="button"
          onClick={onToggleCollapsed}
          disabled={!canConfigureView}
          className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium hover:text-foreground"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )}
          {!isCollapsed ? (
            <span className="truncate">
              {label} <span className="text-muted-foreground">{cardIds.length}</span>
            </span>
          ) : null}
        </button>
        {!isCollapsed && !readOnly ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            onClick={onAddCard}
            aria-label="Add card"
          >
            <PlusIcon className="size-3" />
          </Button>
        ) : null}
      </div>
      {!isCollapsed ? (
        <div className="flex min-h-[6rem] flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          {children}
          {cardIds.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            {readOnly ? 'No cards' : 'Drop cards here'}
          </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function KanbanCard({
  record,
  fields,
  visibleFieldIds,
  groupFieldId,
  titleFieldId,
  workspaceId,
  onOpen,
  readOnly,
}: {
  record: CollectionRecordWithValues
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  groupFieldId: string
  titleFieldId: string | null
  workspaceId: string
  onOpen: () => void
  readOnly: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: record.id,
    disabled: readOnly,
  })
  const dragListeners = listeners as
    | (typeof listeners & {
        onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
      })
    | undefined

  // Honor view's visibleFieldIds. Exclude title (rendered above), the group
  // field (already represented by the column), and long_text.
  const visibleSet = new Set(visibleFieldIds.length > 0 ? visibleFieldIds : fields.map((f) => f.id))
  const visibleFields = fields
    .filter(
      (f) =>
        visibleSet.has(f.id) &&
        f.id !== titleFieldId &&
        f.id !== groupFieldId &&
        f.field_type !== 'long_text',
    )
    .slice(0, 5)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...(readOnly ? {} : attributes)}
      onClick={onOpen}
      className={cn(
        'group rounded-md border bg-background p-2 shadow-sm transition-colors hover:border-foreground/30',
        'cursor-pointer',
      )}
    >
      <div className="flex items-start gap-1.5">
        {!readOnly ? (
          <button
            type="button"
            className="-ml-1 flex size-5 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Drag ${record.title ?? 'Untitled'}`}
            onClick={(event) => event.stopPropagation()}
            {...listeners}
            onPointerDown={(event) => {
              event.stopPropagation()
              dragListeners?.onPointerDown?.(event)
            }}
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        ) : null}
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {record.title ?? 'Untitled'}
        </p>
      </div>
      {visibleFields.length > 0 ? (
        <div
          className="mt-1.5 flex flex-col gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {visibleFields.map((field) => (
            <div key={field.id} className="flex items-center gap-1.5 text-xs">
              <span className="w-20 shrink-0 truncate text-muted-foreground">
                {field.name}
              </span>
              <div className="min-w-0 flex-1 truncate text-foreground">
                <FieldCell
                  workspaceId={workspaceId}
                  field={field}
                  record={record}
                  isReadOnly
                  onSave={async () => ({ ok: true })}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function KanbanCardOverlay({
  record,
}: {
  record: CollectionRecordWithValues | null
}) {
  if (!record) return null
  return (
    <div className="w-72 rounded-md border bg-background p-2 shadow-md">
      <p className="text-sm font-medium">{record.title ?? 'Untitled'}</p>
    </div>
  )
}


function AddKanbanColumn({
  workspaceId,
  collectionId,
  fieldId,
}: {
  workspaceId: string
  collectionId: string
  fieldId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    const trimmed = label.trim()
    if (!trimmed) return
    const fd = new FormData()
    fd.set("workspaceId", workspaceId)
    fd.set("collectionId", collectionId)
    fd.set("fieldId", fieldId)
    fd.set("optionLabel", trimmed)
    startTransition(async () => {
      const result = await addFieldOption(undefined, fd)
      if (result.status === "success") {
        setLabel("")
        setOpen(false)
        router.refresh()
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-72 shrink-0 items-center justify-center gap-1.5 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/30 hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        New column
      </button>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-md border bg-card p-2">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Column name"
        className="h-8 rounded-sm border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submit()
          } else if (e.key === "Escape") {
            setOpen(false)
            setLabel("")
          }
        }}
      />
      <div className="flex justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setOpen(false)
            setLabel("")
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={pending || !label.trim()}
          onClick={submit}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
