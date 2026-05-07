'use client'

import { useActionState, useMemo, useState } from 'react'
import {
  Calendar,
  Columns3,
  Copy,
  Database,
  Filter,
  LayoutDashboard,
  Plus,
  Save,
  SortAsc,
  TableIcon,
} from 'lucide-react'

import {
  createView,
  duplicateView,
  renameView,
  updateViewSettings,
  type ViewActionState,
} from '@/app/views/actions'
import {
  getRecordFieldValue,
  isPropertyType,
  parseFieldOptions,
  PROPERTY_TYPE_META,
  type CollectionRecordWithValues,
  type CollectionWithFieldsAndRecords,
} from '@/lib/properties/types'
import type { CollectionField, Json } from '@/lib/supabase/database.types'
import {
  VIEW_TYPES,
  type SavedViewType,
  type SavedViewWithConfig,
  type ViewConfig,
  type ViewFilter,
  type ViewSort,
} from '@/lib/views/types'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const initialActionState: ViewActionState = {
  status: 'idle',
}

const viewIcons: Record<SavedViewType, React.ComponentType<{ className?: string }>> = {
  table: TableIcon,
  kanban: Columns3,
  calendar: Calendar,
  dashboard: LayoutDashboard,
}

type ViewEngineProps = {
  workspaceId: string
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
}

function ActionMessage({ state }: { state: ViewActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function jsonDisplayValue(value: Json | null) {
  if (value === null || value === undefined) {
    return ''
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string' || typeof item === 'number' ? String(item) : '',
      )
      .filter(Boolean)
      .join(', ')
  }

  return ''
}

function optionLabel(field: CollectionField, value: Json | null) {
  const options = parseFieldOptions(field.options_json)

  if (Array.isArray(value)) {
    const labels = value.flatMap((item) => {
      if (typeof item !== 'string') {
        return []
      }

      return [options.find((option) => option.id === item)?.label ?? item]
    })

    return labels.join(', ')
  }

  if (typeof value !== 'string') {
    return jsonDisplayValue(value)
  }

  return options.find((option) => option.id === value)?.label ?? value
}

function fieldValueLabel(field: CollectionField, record: CollectionRecordWithValues) {
  const value = getRecordFieldValue(record, field.id)

  if (['select', 'status', 'multi_select'].includes(field.field_type)) {
    return optionLabel(field, value)
  }

  return jsonDisplayValue(value)
}

function getVisibleFields(
  collection: CollectionWithFieldsAndRecords,
  config: ViewConfig,
) {
  const fields = collection.fields.filter((field) => !field.is_system)
  const visibleIds = new Set(config.visibleFieldIds)

  if (visibleIds.size === 0) {
    return fields
  }

  return fields.filter((field) => visibleIds.has(field.id))
}

function matchesFilter(
  filter: ViewFilter,
  fieldsById: Map<string, CollectionField>,
  record: CollectionRecordWithValues,
) {
  const field = fieldsById.get(filter.fieldId)

  if (!field) {
    return true
  }

  const label = fieldValueLabel(field, record).toLowerCase()
  const expected = filter.value.toLowerCase()

  switch (filter.operator) {
    case 'contains':
      return label.includes(expected)
    case 'equals':
      return label === expected
    case 'not_equals':
      return label !== expected
    case 'is_empty':
      return label.length === 0
    case 'is_not_empty':
      return label.length > 0
  }
}

function applyViewConfig(
  collection: CollectionWithFieldsAndRecords,
  config: ViewConfig,
) {
  const fieldsById = new Map(collection.fields.map((field) => [field.id, field]))
  const filteredRecords = collection.records.filter((record) =>
    config.filters.every((filter) => matchesFilter(filter, fieldsById, record)),
  )

  return [...filteredRecords].sort((first, second) => {
    for (const sort of config.sorts) {
      const field = fieldsById.get(sort.fieldId)

      if (!field) {
        continue
      }

      const firstValue = fieldValueLabel(field, first)
      const secondValue = fieldValueLabel(field, second)
      const comparison = firstValue.localeCompare(secondValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      })

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison
      }
    }

    return 0
  })
}

function isKanbanField(field: CollectionField) {
  return ['status', 'select', 'person'].includes(field.field_type)
}

function isDateField(field: CollectionField) {
  return field.field_type === 'date'
}

function ViewTypeBadge({ viewType }: { viewType: SavedViewType }) {
  const Icon = viewIcons[viewType]

  return (
    <Badge className="gap-1 font-normal" variant="secondary">
      <Icon className="size-3" />
      {viewType}
    </Badge>
  )
}

export function ViewEngine({
  workspaceId,
  collections,
  views,
}: ViewEngineProps) {
  const [selectedViewId, setSelectedViewId] = useState(views[0]?.id ?? '')
  const [createCollectionId, setCreateCollectionId] = useState(
    collections[0]?.id ?? '',
  )
  const [createViewType, setCreateViewType] = useState<SavedViewType>('table')
  const [createViewState, createViewAction, isCreatingView] = useActionState(
    createView,
    initialActionState,
  )
  const selectedView =
    views.find((view) => view.id === selectedViewId) ?? views[0] ?? null
  const selectedCollection =
    collections.find((collection) => collection.id === selectedView?.collection_id) ??
    null
  const createCollection =
    collections.find((collection) => collection.id === createCollectionId) ??
    collections[0] ??
    null
  const createKanbanReady =
    createCollection?.fields.some((field) => !field.is_system && isKanbanField(field)) ??
    false
  const createCalendarReady =
    createCollection?.fields.some((field) => !field.is_system && isDateField(field)) ??
    false

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      <aside className="flex w-80 shrink-0 flex-col border-r bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Saved views</h2>
          <p className="text-xs text-muted-foreground">
            View configs are stored per workspace.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {views.length > 0 ? (
            <div className="space-y-1">
              {views.map((view) => {
                const Icon = viewIcons[view.view_type]
                const collection = collections.find(
                  (item) => item.id === view.collection_id,
                )

                return (
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      selectedView?.id === view.id
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                    )}
                    key={view.id}
                    onClick={() => setSelectedViewId(view.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {view.name}
                      </span>
                      <span className="block truncate text-xs">
                        {collection?.name ?? 'Unknown collection'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No saved views yet.
            </div>
          )}
        </div>

        <form action={createViewAction} className="space-y-3 border-t p-4">
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <Input name="name" placeholder="View name" required />
          <NativeSelect
            className="w-full"
            disabled={collections.length === 0}
            name="collectionId"
            onChange={(event) => setCreateCollectionId(event.target.value)}
            value={createCollectionId}
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            name="viewType"
            onChange={(event) =>
              setCreateViewType(event.target.value as SavedViewType)
            }
            value={createViewType}
          >
            {VIEW_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>

          {createViewType === 'kanban' && !createKanbanReady && (
            <GuidedSetup
              href={`/databases?workspace_id=${workspaceId}`}
              message="Kanban requires a status, select, or person field."
            />
          )}
          {createViewType === 'calendar' && !createCalendarReady && (
            <GuidedSetup
              href={`/databases?workspace_id=${workspaceId}`}
              message="Calendar requires a date field."
            />
          )}

          <Button
            className="w-full"
            disabled={
              isCreatingView ||
              collections.length === 0 ||
              (createViewType === 'kanban' && !createKanbanReady) ||
              (createViewType === 'calendar' && !createCalendarReady)
            }
            type="submit"
          >
            <Plus data-icon="inline-start" />
            Create view
          </Button>
          <ActionMessage state={createViewState} />
        </form>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {selectedView && selectedCollection ? (
          <>
            <ViewToolbar
              collection={selectedCollection}
              view={selectedView}
              workspaceId={workspaceId}
            />
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
              <ViewPreview collection={selectedCollection} view={selectedView} />
              <ViewSettingsPanel
                collection={selectedCollection}
                key={selectedView.id}
                view={selectedView}
                workspaceId={workspaceId}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md text-center">
              <LayoutDashboard className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Create a saved view</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Saved views remember visible fields, filters, sorts, and
                type-specific configuration for each collection.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function GuidedSetup({ href, message }: { href: string; message: string }) {
  return (
    <Alert>
      <AlertDescription>
        {message}{' '}
        <a className="font-medium underline underline-offset-4" href={href}>
          Add one in Databases.
        </a>
      </AlertDescription>
    </Alert>
  )
}

function ViewToolbar({
  workspaceId,
  view,
  collection,
}: {
  workspaceId: string
  view: SavedViewWithConfig
  collection: CollectionWithFieldsAndRecords
}) {
  const [renameState, renameAction, isRenaming] = useActionState(
    renameView,
    initialActionState,
  )
  const [duplicateState, duplicateAction, isDuplicating] = useActionState(
    duplicateView,
    initialActionState,
  )

  return (
    <div className="border-b bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <form action={renameAction} className="flex min-w-0 flex-1 gap-3">
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <input name="viewId" type="hidden" value={view.id} />
          <Input
            aria-label="View name"
            className="max-w-md text-base font-semibold"
            defaultValue={view.name}
            disabled={Boolean(view.is_locked)}
            name="name"
            required
          />
          <Button disabled={isRenaming || Boolean(view.is_locked)} type="submit">
            <Save data-icon="inline-start" />
            Rename
          </Button>
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <ViewTypeBadge viewType={view.view_type} />
          <Badge variant="outline">{collection.name}</Badge>
          <form action={duplicateAction}>
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="viewId" type="hidden" value={view.id} />
            <Button disabled={isDuplicating} type="submit" variant="outline">
              <Copy data-icon="inline-start" />
              Duplicate
            </Button>
          </form>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <ActionMessage state={renameState} />
        <ActionMessage state={duplicateState} />
      </div>
    </div>
  )
}

function ViewSettingsPanel({
  workspaceId,
  view,
  collection,
}: {
  workspaceId: string
  view: SavedViewWithConfig
  collection: CollectionWithFieldsAndRecords
}) {
  const [viewType, setViewType] = useState<SavedViewType>(view.view_type)
  const [state, action, isPending] = useActionState(
    updateViewSettings,
    initialActionState,
  )
  const fields = collection.fields.filter((field) => !field.is_system)
  const kanbanFields = fields.filter(isKanbanField)
  const dateFields = fields.filter(isDateField)
  const visibleIds = new Set(view.config.visibleFieldIds)
  const filters = [...view.config.filters]
  const sorts = [...view.config.sorts]

  while (filters.length < 3) {
    filters.push({
      id: `empty-filter-${filters.length}`,
      fieldId: '',
      operator: 'contains',
      value: '',
    })
  }

  while (sorts.length < 3) {
    sorts.push({
      id: `empty-sort-${sorts.length}`,
      fieldId: '',
      direction: 'asc',
    })
  }

  const missingKanbanField = viewType === 'kanban' && kanbanFields.length === 0
  const missingCalendarField = viewType === 'calendar' && dateFields.length === 0

  return (
    <aside className="min-h-0 overflow-y-auto border-l bg-card p-4">
      <form action={action} className="space-y-5">
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <input name="viewId" type="hidden" value={view.id} />
        <input name="collectionId" type="hidden" value={collection.id} />

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">View type</h3>
            <p className="text-xs text-muted-foreground">
              Changing type keeps the same saved view ID.
            </p>
          </div>
          <NativeSelect
            className="w-full"
            disabled={Boolean(view.is_locked)}
            name="viewType"
            onChange={(event) => setViewType(event.target.value as SavedViewType)}
            value={viewType}
          >
            {VIEW_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
          {missingKanbanField && (
            <GuidedSetup
              href={`/databases?workspace_id=${workspaceId}`}
              message="Kanban requires a status, select, or person field."
            />
          )}
          {missingCalendarField && (
            <GuidedSetup
              href={`/databases?workspace_id=${workspaceId}`}
              message="Calendar requires a date field."
            />
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Visible fields</h3>
            <p className="text-xs text-muted-foreground">
              System fields stay hidden in normal view setup.
            </p>
          </div>
          <div className="grid gap-2">
            {fields.map((field) => (
              <label
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
                key={field.id}
              >
                <input
                  defaultChecked={
                    visibleIds.size === 0 ? true : visibleIds.has(field.id)
                  }
                  disabled={Boolean(view.is_locked)}
                  name="visibleFieldId"
                  type="checkbox"
                  value={field.id}
                />
                <span className="min-w-0 flex-1 truncate">{field.name}</span>
                <Badge className="font-normal" variant="secondary">
                  {field.field_type}
                </Badge>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="size-4" />
            Filters
          </h3>
          {filters.slice(0, 3).map((filter) => (
            <div className="grid grid-cols-[1fr_110px_1fr] gap-2" key={filter.id}>
              <NativeSelect
                defaultValue={filter.fieldId}
                disabled={Boolean(view.is_locked)}
                name="filterFieldId"
              >
                <option value="">No field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                defaultValue={filter.operator}
                disabled={Boolean(view.is_locked)}
                name="filterOperator"
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
                <option value="not_equals">not equals</option>
                <option value="is_empty">is empty</option>
                <option value="is_not_empty">not empty</option>
              </NativeSelect>
              <Input
                defaultValue={filter.value}
                disabled={Boolean(view.is_locked)}
                name="filterValue"
                placeholder="Value"
              />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <SortAsc className="size-4" />
            Sorts
          </h3>
          {sorts.slice(0, 3).map((sort) => (
            <div className="grid grid-cols-[1fr_110px] gap-2" key={sort.id}>
              <NativeSelect
                defaultValue={sort.fieldId}
                disabled={Boolean(view.is_locked)}
                name="sortFieldId"
              >
                <option value="">No field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                defaultValue={sort.direction}
                disabled={Boolean(view.is_locked)}
                name="sortDirection"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </NativeSelect>
            </div>
          ))}
        </section>

        {viewType === 'kanban' && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Kanban group field</h3>
            <NativeSelect
              className="w-full"
              defaultValue={view.config.kanban.groupFieldId ?? ''}
              disabled={Boolean(view.is_locked) || kanbanFields.length === 0}
              name="kanbanGroupFieldId"
            >
              <option value="">Choose field</option>
              {kanbanFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </NativeSelect>
          </section>
        )}

        {viewType === 'calendar' && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Calendar date field</h3>
            <NativeSelect
              className="w-full"
              defaultValue={view.config.calendar.dateFieldId ?? ''}
              disabled={Boolean(view.is_locked) || dateFields.length === 0}
              name="calendarDateFieldId"
            >
              <option value="">Choose date field</option>
              {dateFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </NativeSelect>
          </section>
        )}

        <Button
          className="w-full"
          disabled={
            isPending ||
            Boolean(view.is_locked) ||
            missingKanbanField ||
            missingCalendarField
          }
          type="submit"
        >
          <Save data-icon="inline-start" />
          Save view settings
        </Button>
        <ActionMessage state={state} />
      </form>
    </aside>
  )
}

function ViewPreview({
  view,
  collection,
}: {
  view: SavedViewWithConfig
  collection: CollectionWithFieldsAndRecords
}) {
  const visibleFields = getVisibleFields(collection, view.config)
  const records = applyViewConfig(collection, view.config)

  if (view.view_type === 'kanban') {
    return (
      <KanbanPreview
        collection={collection}
        fields={visibleFields}
        records={records}
        view={view}
      />
    )
  }

  if (view.view_type === 'calendar') {
    return (
      <CalendarPreview
        collection={collection}
        fields={visibleFields}
        records={records}
        view={view}
      />
    )
  }

  if (view.view_type === 'dashboard') {
    return (
      <DashboardPlaceholder fields={visibleFields} records={records} view={view} />
    )
  }

  return <TablePreview fields={visibleFields} records={records} />
}

function TablePreview({
  fields,
  records,
}: {
  fields: CollectionField[]
  records: CollectionRecordWithValues[]
}) {
  return (
    <div className="min-w-0 overflow-auto p-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Title</TableHead>
              {fields.map((field) => (
                <TableHead className="min-w-48" key={field.id}>
                  {field.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.title}</TableCell>
                {fields.map((field) => (
                  <TableCell key={field.id}>
                    <FieldValue field={field} record={record} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && (
          <div className="border-t p-6 text-center text-sm text-muted-foreground">
            No records match this view.
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanPreview({
  view,
  collection,
  records,
  fields,
}: {
  view: SavedViewWithConfig
  collection: CollectionWithFieldsAndRecords
  records: CollectionRecordWithValues[]
  fields: CollectionField[]
}) {
  const groupField = collection.fields.find(
    (field) => field.id === view.config.kanban.groupFieldId,
  )

  if (!groupField) {
    return (
      <GuidedPanel message="Choose a status, select, or person field to group this kanban view." />
    )
  }

  const options = parseFieldOptions(groupField.options_json)
  const optionIds = new Set(options.map((option) => option.id))
  const groups =
    options.length > 0
      ? [
          ...options.map((option) => ({
            id: option.id,
            label: option.label,
            records: records.filter(
              (record) => getRecordFieldValue(record, groupField.id) === option.id,
            ),
          })),
          {
            id: 'empty',
            label: 'Empty',
            records: records.filter((record) => {
              const value = getRecordFieldValue(record, groupField.id)

              return typeof value !== 'string' || !optionIds.has(value)
            }),
          },
        ]
      : uniqueGroupValues(records, groupField).map((value) => ({
          id: value || 'empty',
          label: value || 'Empty',
          records: records.filter(
            (record) => fieldValueLabel(groupField, record) === value,
          ),
        }))

  return (
    <div className="min-w-0 overflow-x-auto p-4">
      <div className="flex gap-4">
        {groups.map((group) => (
          <div className="w-80 shrink-0" key={group.id}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <Badge className="ml-auto" variant="secondary">
                {group.records.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {group.records.map((record) => (
                <div className="rounded-md border bg-card p-3" key={record.id}>
                  <div className="font-medium">{record.title}</div>
                  <div className="mt-3 space-y-2">
                    {fields
                      .filter((field) => field.id !== groupField.id)
                      .slice(0, 3)
                      .map((field) => (
                        <div className="text-xs" key={field.id}>
                          <span className="text-muted-foreground">
                            {field.name}:{' '}
                          </span>
                          <FieldValue field={field} record={record} />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {group.records.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No records
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarPreview({
  view,
  collection,
  records,
}: {
  view: SavedViewWithConfig
  collection: CollectionWithFieldsAndRecords
  records: CollectionRecordWithValues[]
  fields: CollectionField[]
}) {
  const dateField = collection.fields.find(
    (field) => field.id === view.config.calendar.dateFieldId,
  )

  if (!dateField) {
    return <GuidedPanel message="Choose a date field to place records on a calendar." />
  }

  const calendarDateField = dateField
  const now = new Date()
  const monthName = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(now)
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const calendarDays: Array<number | null> = []

  for (let index = 0; index < firstDay.getDay(); index++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    calendarDays.push(day)
  }

  function recordsForDay(day: number | null) {
    if (!day) {
      return []
    }

    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(day).padStart(2, '0')}`

    return records.filter(
      (record) => fieldValueLabel(calendarDateField, record) === dateKey,
    )
  }

  return (
    <div className="min-w-0 overflow-auto p-4">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{monthName}</h3>
          <Badge variant="outline">{calendarDateField.name}</Badge>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md bg-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              className="bg-secondary p-2 text-center text-xs font-medium text-muted-foreground"
              key={day}
            >
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            const dayRecords = recordsForDay(day)

            return (
              <div
                className={cn(
                  'min-h-28 bg-card p-2',
                  !day && 'bg-secondary/40',
                )}
                key={`${day ?? 'empty'}-${index}`}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium">{day}</div>
                    <div className="mt-2 space-y-1">
                      {dayRecords.slice(0, 3).map((record) => (
                        <div
                          className="truncate rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                          key={record.id}
                        >
                          {record.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DashboardPlaceholder({
  view,
  fields,
  records,
}: {
  view: SavedViewWithConfig
  fields: CollectionField[]
  records: CollectionRecordWithValues[]
}) {
  return (
    <div className="min-w-0 overflow-auto p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-5">
          <div className="text-sm text-muted-foreground">Records</div>
          <div className="mt-2 text-3xl font-semibold">{records.length}</div>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="text-sm text-muted-foreground">Visible fields</div>
          <div className="mt-2 text-3xl font-semibold">{fields.length}</div>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="text-sm text-muted-foreground">Rules</div>
          <div className="mt-2 text-3xl font-semibold">
            {view.config.filters.length + view.config.sorts.length}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-dashed bg-card p-6">
        <LayoutDashboard className="mb-3 size-8 text-muted-foreground" />
        <h3 className="font-semibold">Dashboard placeholder</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Dashboard views are saved now. Widgets and charts will attach to this
          saved view in a later module.
        </p>
      </div>
    </div>
  )
}

function GuidedPanel({ message }: { message: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-md border border-dashed bg-card p-6 text-center">
        <Database className="mx-auto mb-3 size-9 text-muted-foreground" />
        <h3 className="font-semibold">Setup needed</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function uniqueGroupValues(
  records: CollectionRecordWithValues[],
  field: CollectionField,
) {
  return Array.from(
    new Set(records.map((record) => fieldValueLabel(field, record))),
  )
}

function FieldValue({
  field,
  record,
}: {
  field: CollectionField
  record: CollectionRecordWithValues
}) {
  const label = fieldValueLabel(field, record)

  if (!label) {
    return <span className="text-muted-foreground">-</span>
  }

  if (isPropertyType(field.field_type) && PROPERTY_TYPE_META[field.field_type].optionBacked) {
    return (
      <Badge className="font-normal" variant="secondary">
        {label}
      </Badge>
    )
  }

  if (field.field_type === 'checkbox') {
    return label === 'true' ? 'Yes' : 'No'
  }

  return <span>{label}</span>
}
