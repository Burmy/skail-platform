'use client'

import { useActionState, useMemo, useState, type ComponentType } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Code,
  Columns3,
  Copy,
  CreditCard,
  FileText,
  Heading,
  LayoutTemplate,
  Monitor,
  Paperclip,
  Plus,
  Save,
  Smartphone,
  Table as TableIcon,
  Tablet,
  Type,
} from 'lucide-react'

import {
  addWidget,
  createPage,
  duplicatePage,
  renamePage,
  reorderWidget,
  updateWidget,
  type LayoutActionState,
} from '@/app/pages/actions'
import {
  getRecordFieldValue,
  parseFieldOptions,
  PROPERTY_TYPE_META,
  isPropertyType,
  type CollectionRecordWithValues,
  type CollectionWithFieldsAndRecords,
} from '@/lib/properties/types'
import type { CollectionField, Json } from '@/lib/supabase/database.types'
import {
  DUPLICATE_PAGE_MODES,
  textConfigValue,
  WIDGET_TYPE_META,
  WIDGET_TYPES,
  type LayoutWidgetWithConfig,
  type PageWithWidgets,
  type WidgetSourceType,
  type WidgetType,
} from '@/lib/layout/types'
import { DEFAULT_PAGE_STYLE, DEFAULT_WIDGET_STYLE } from '@/lib/theme/types'
import type { SavedViewWithConfig, ViewConfig } from '@/lib/views/types'
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
import { Textarea } from '@/components/ui/textarea'

const initialActionState: LayoutActionState = {
  status: 'idle',
}

const widgetIcons: Record<WidgetType, ComponentType<{ className?: string }>> = {
  text: Type,
  heading: Heading,
  table: TableIcon,
  kanban: Columns3,
  calendar: CalendarDays,
  kpi_card: CreditCard,
  file_links: Paperclip,
  embed: Code,
  activity_feed: Activity,
}

const duplicateModeLabels: Record<(typeof DUPLICATE_PAGE_MODES)[number], string> = {
  layout_only: 'Duplicate layout only',
  layout_with_empty_database: 'Layout + empty database structure',
  everything: 'Duplicate everything',
}

const widgetBorderClass = {
  none: 'border-transparent',
  subtle: 'border-border',
  solid: 'border-foreground/40',
  accent: 'border-primary',
}

const widgetRadiusClass = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
}

const widgetShadowClass = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

type LayoutBuilderProps = {
  workspaceId: string
  pages: PageWithWidgets[]
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
}

type WidgetSource = {
  collection: CollectionWithFieldsAndRecords | null
  view: SavedViewWithConfig | null
}

function ActionMessage({ state }: { state: LayoutActionState }) {
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
        'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
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
    return value
      .flatMap((item) => {
        if (typeof item !== 'string') {
          return []
        }

        return [options.find((option) => option.id === item)?.label ?? item]
      })
      .join(', ')
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
  filter: ViewConfig['filters'][number],
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

function sourceForWidget(
  widget: LayoutWidgetWithConfig,
  collections: CollectionWithFieldsAndRecords[],
  views: SavedViewWithConfig[],
): WidgetSource {
  if (widget.data_source_type === 'collection' && widget.data_source_id) {
    return {
      collection:
        collections.find((collection) => collection.id === widget.data_source_id) ??
        null,
      view: null,
    }
  }

  if (widget.data_source_type === 'view' && widget.data_source_id) {
    const view = views.find((item) => item.id === widget.data_source_id) ?? null

    return {
      collection:
        collections.find((collection) => collection.id === view?.collection_id) ??
        null,
      view,
    }
  }

  return {
    collection: null,
    view: null,
  }
}

function sourceLabel(
  widget: LayoutWidgetWithConfig,
  collections: CollectionWithFieldsAndRecords[],
  views: SavedViewWithConfig[],
) {
  if (widget.data_source_type === 'collection') {
    return (
      collections.find((collection) => collection.id === widget.data_source_id)?.name ??
      'Missing collection'
    )
  }

  if (widget.data_source_type === 'view') {
    return views.find((view) => view.id === widget.data_source_id)?.name ?? 'Missing view'
  }

  return 'No source'
}

function sourceData(
  source: WidgetSource,
) {
  if (!source.collection) {
    return {
      fields: [] as CollectionField[],
      records: [] as CollectionRecordWithValues[],
    }
  }

  if (source.view) {
    return {
      fields: getVisibleFields(source.collection, source.view.config),
      records: applyViewConfig(source.collection, source.view.config),
    }
  }

  return {
    fields: source.collection.fields.filter((field) => !field.is_system),
    records: source.collection.records,
  }
}

export function LayoutBuilder({
  workspaceId,
  pages,
  collections,
  views,
}: LayoutBuilderProps) {
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id ?? '')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const selectedPage =
    pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null
  const selectedPageStyle = selectedPage?.style
  const pageBackgroundColor =
    selectedPageStyle?.background.pageBackgroundColor ??
    'var(--background)'
  const sectionBackgroundColor =
    selectedPageStyle?.background.sectionBackgroundColor ??
    'var(--card)'
  const spacingDensity =
    selectedPageStyle?.layoutStyle.spacingDensity ?? DEFAULT_PAGE_STYLE.spacingDensity
  const pagePaddingClass =
    spacingDensity === 'compact'
      ? 'p-3'
      : spacingDensity === 'relaxed'
        ? 'p-8'
        : 'p-5'
  const widgetGapClass =
    spacingDensity === 'compact'
      ? 'space-y-2'
      : spacingDensity === 'relaxed'
        ? 'space-y-6'
        : 'space-y-4'

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b bg-card lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Pages and tabs</h2>
          <p className="text-xs text-muted-foreground">
            Top-level pages act as portal tabs.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {pages.length > 0 ? (
            <div className="space-y-1">
              {pages.map((page) => (
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    selectedPage?.id === page.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  )}
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {page.title}
                  </span>
                  <Badge className="font-normal" variant="secondary">
                    {page.widgets.length}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No pages yet.
            </div>
          )}
        </div>

        <CreatePageForm workspaceId={workspaceId} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {selectedPage ? (
          <>
            <div className="border-b bg-card p-4">
              <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
                <RenamePageForm page={selectedPage} workspaceId={workspaceId} />
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex rounded-md border bg-secondary p-1">
                    <Button
                      aria-label="Desktop viewport"
                      className="size-8"
                      onClick={() => setViewport('desktop')}
                      size="icon"
                      type="button"
                      variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                    >
                      <Monitor />
                    </Button>
                    <Button
                      aria-label="Tablet viewport"
                      className="size-8"
                      onClick={() => setViewport('tablet')}
                      size="icon"
                      type="button"
                      variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                    >
                      <Tablet />
                    </Button>
                    <Button
                      aria-label="Mobile viewport"
                      className="size-8"
                      onClick={() => setViewport('mobile')}
                      size="icon"
                      type="button"
                      variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                    >
                      <Smartphone />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 overflow-auto bg-background p-4 lg:p-6">
                <div
                  className={cn(
                    'mx-auto min-h-full rounded-md border bg-card transition-all',
                    viewport === 'desktop' && 'w-full max-w-5xl',
                    viewport === 'tablet' && 'w-[768px]',
                    viewport === 'mobile' && 'w-[390px]',
                  )}
                  style={{ backgroundColor: pageBackgroundColor }}
                >
                  {selectedPageStyle?.cover_image_url && (
                    <div
                      className="h-40 rounded-t-md bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${selectedPageStyle.cover_image_url})`,
                      }}
                    />
                  )}
                  <div className="border-b p-5">
                    <div className="flex items-center gap-3">
                      {selectedPageStyle?.typography.logoImageUrl ? (
                        <img
                          alt=""
                          className="size-10 rounded-md border object-cover"
                          src={selectedPageStyle.typography.logoImageUrl}
                        />
                      ) : (
                        <LayoutTemplate className="size-5 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">
                          {selectedPage.title}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {selectedPage.widgets.length} widgets
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={cn(widgetGapClass, pagePaddingClass)}>
                    {selectedPage.widgets.length > 0 ? (
                      selectedPage.widgets.map((widget, index) => (
                        <WidgetCard
                          sectionBackgroundColor={sectionBackgroundColor}
                          collections={collections}
                          index={index}
                          isFirst={index === 0}
                          isLast={index === selectedPage.widgets.length - 1}
                          key={widget.id}
                          views={views}
                          widget={widget}
                          workspaceId={workspaceId}
                        />
                      ))
                    ) : (
                      <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed p-6 text-center">
                        <div className="max-w-sm">
                          <Plus className="mx-auto mb-3 size-9 text-muted-foreground" />
                          <h3 className="font-semibold">Add the first widget</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Pick a widget from the right panel to start building this
                            tab layout.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="min-h-0 overflow-y-auto border-t bg-card p-4 lg:border-l lg:border-t-0">
                <DuplicatePageForm pageId={selectedPage.id} workspaceId={workspaceId} />
                <div className="my-5 h-px bg-border" />
                <AddWidgetPanel
                  collections={collections}
                  pageId={selectedPage.id}
                  views={views}
                  workspaceId={workspaceId}
                />
              </aside>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md text-center">
              <LayoutTemplate className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Create a page tab</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pages store ordered widgets and can connect to existing collections
                or saved views.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function CreatePageForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, isPending] = useActionState(createPage, initialActionState)

  return (
    <form action={action} className="space-y-3 border-t p-4">
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <Input name="title" placeholder="Page title" required />
      <Button className="w-full" disabled={isPending} type="submit">
        <Plus data-icon="inline-start" />
        Create page
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function RenamePageForm({
  workspaceId,
  page,
}: {
  workspaceId: string
  page: PageWithWidgets
}) {
  const [state, action, isPending] = useActionState(renamePage, initialActionState)

  return (
    <form action={action} className="grid w-full min-w-0 flex-1 gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <input name="pageId" type="hidden" value={page.id} />
        <Input
          aria-label="Page title"
          className="max-w-md text-base font-semibold"
          defaultValue={page.title}
          disabled={Boolean(page.is_locked)}
          name="title"
          required
        />
        <Button disabled={isPending || Boolean(page.is_locked)} type="submit">
          <Save data-icon="inline-start" />
          Rename
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  )
}

function DuplicatePageForm({
  workspaceId,
  pageId,
}: {
  workspaceId: string
  pageId: string
}) {
  const [state, action, isPending] = useActionState(
    duplicatePage,
    initialActionState,
  )

  return (
    <form action={action} className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Duplicate page</h3>
        <p className="text-xs text-muted-foreground">
          Database copy options are applied to widgets connected to collections or
          views.
        </p>
      </div>
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="pageId" type="hidden" value={pageId} />
      <NativeSelect className="w-full" name="mode">
        {DUPLICATE_PAGE_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {duplicateModeLabels[mode]}
          </option>
        ))}
      </NativeSelect>
      <Button className="w-full" disabled={isPending} type="submit" variant="outline">
        <Copy data-icon="inline-start" />
        Duplicate
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function AddWidgetPanel({
  workspaceId,
  pageId,
  collections,
  views,
}: {
  workspaceId: string
  pageId: string
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
}) {
  const [sourceType, setSourceType] = useState<WidgetSourceType>('none')
  const [sourceId, setSourceId] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Widgets</h3>
        <p className="text-xs text-muted-foreground">
          Data widgets can use the selected source below.
        </p>
      </div>

      <SourceControls
        collections={collections}
        onSourceIdChange={setSourceId}
        onSourceTypeChange={setSourceType}
        sourceId={sourceId}
        sourceType={sourceType}
        views={views}
      />

      <div className="grid gap-2">
        {WIDGET_TYPES.map((widgetType) => (
          <AddWidgetButton
            key={widgetType}
            pageId={pageId}
            sourceId={sourceId}
            sourceType={sourceType}
            widgetType={widgetType}
            workspaceId={workspaceId}
          />
        ))}
      </div>
    </div>
  )
}

function SourceControls({
  sourceType,
  sourceId,
  collections,
  views,
  onSourceTypeChange,
  onSourceIdChange,
}: {
  sourceType: WidgetSourceType
  sourceId: string
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
  onSourceTypeChange: (value: WidgetSourceType) => void
  onSourceIdChange: (value: string) => void
}) {
  const sourceOptions =
    sourceType === 'collection' ? collections : sourceType === 'view' ? views : []

  return (
    <div className="grid gap-2">
      <NativeSelect
        className="w-full"
        onChange={(event) => {
          onSourceTypeChange(event.target.value as WidgetSourceType)
          onSourceIdChange('')
        }}
        value={sourceType}
      >
        <option value="none">No source</option>
        <option value="collection">Collection</option>
        <option value="view">Saved view</option>
      </NativeSelect>

      {sourceType !== 'none' && (
        <NativeSelect
          className="w-full"
          onChange={(event) => onSourceIdChange(event.target.value)}
          value={sourceId}
        >
          <option value="">Choose source</option>
          {sourceOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </div>
  )
}

function AddWidgetButton({
  workspaceId,
  pageId,
  widgetType,
  sourceType,
  sourceId,
}: {
  workspaceId: string
  pageId: string
  widgetType: WidgetType
  sourceType: WidgetSourceType
  sourceId: string
}) {
  const [state, action, isPending] = useActionState(addWidget, initialActionState)
  const Icon = widgetIcons[widgetType]
  const meta = WIDGET_TYPE_META[widgetType]

  return (
    <form action={action}>
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="pageId" type="hidden" value={pageId} />
      <input name="widgetType" type="hidden" value={widgetType} />
      <input name="dataSourceType" type="hidden" value={sourceType} />
      <input name="dataSourceId" type="hidden" value={sourceId} />
      <Button
        className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
        disabled={isPending}
        type="submit"
        variant="outline"
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{meta.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {meta.description}
          </span>
        </span>
        <Plus className="size-4 shrink-0" />
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function WidgetCard({
  workspaceId,
  widget,
  collections,
  views,
  index,
  isFirst,
  isLast,
  sectionBackgroundColor,
}: {
  workspaceId: string
  widget: LayoutWidgetWithConfig
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
  index: number
  isFirst: boolean
  isLast: boolean
  sectionBackgroundColor: string
}) {
  const source = useMemo(
    () => sourceForWidget(widget, collections, views),
    [collections, views, widget],
  )
  const Icon = widgetIcons[widget.widget_type]
  const [orderState, orderAction, isOrdering] = useActionState(
    reorderWidget,
    initialActionState,
  )
  const widgetStyle = widget.style
  const borderMode = widgetStyle?.border ?? DEFAULT_WIDGET_STYLE.border
  const radiusMode = widgetStyle?.roundedCorners ?? DEFAULT_WIDGET_STYLE.roundedCorners
  const shadowMode = widgetStyle?.shadow ?? DEFAULT_WIDGET_STYLE.shadow
  const densityMode = widgetStyle?.density ?? DEFAULT_WIDGET_STYLE.density

  return (
    <div
      className={cn(
        'border',
        widgetBorderClass[borderMode],
        widgetRadiusClass[radiusMode],
        widgetShadowClass[shadowMode],
      )}
      style={{
        backgroundColor: widgetStyle?.backgroundColor ?? sectionBackgroundColor,
        color: widgetStyle?.textColor,
      }}
    >
      <div
        className={cn(
          'flex items-start justify-between gap-3 border-b',
          densityMode === 'compact' ? 'p-2' : 'p-3',
        )}
        style={{
          backgroundColor: widgetStyle?.headerColor,
        }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              {widget.title ?? WIDGET_TYPE_META[widget.widget_type].label}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className="font-normal" variant="secondary">
                {WIDGET_TYPE_META[widget.widget_type].label}
              </Badge>
              <Badge className="font-normal" variant="outline">
                {sourceLabel(widget, collections, views)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <form action={orderAction}>
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="widgetId" type="hidden" value={widget.id} />
            <input name="direction" type="hidden" value="up" />
            <Button
              aria-label="Move widget up"
              disabled={isOrdering || isFirst}
              size="icon-sm"
              type="submit"
              variant="ghost"
            >
              <ArrowUp />
            </Button>
          </form>
          <form action={orderAction}>
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="widgetId" type="hidden" value={widget.id} />
            <input name="direction" type="hidden" value="down" />
            <Button
              aria-label="Move widget down"
              disabled={isOrdering || isLast}
              size="icon-sm"
              type="submit"
              variant="ghost"
            >
              <ArrowDown />
            </Button>
          </form>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]',
          densityMode === 'compact' ? 'p-3' : 'p-4',
        )}
      >
        <WidgetPreview source={source} widget={widget} />
        <WidgetSettings
          collections={collections}
          index={index}
          views={views}
          widget={widget}
          workspaceId={workspaceId}
        />
      </div>
      <div className="px-4 pb-4">
        <ActionMessage state={orderState} />
      </div>
    </div>
  )
}

function WidgetSettings({
  workspaceId,
  widget,
  collections,
  views,
  index,
}: {
  workspaceId: string
  widget: LayoutWidgetWithConfig
  collections: CollectionWithFieldsAndRecords[]
  views: SavedViewWithConfig[]
  index: number
}) {
  const [state, action, isPending] = useActionState(
    updateWidget,
    initialActionState,
  )
  const [sourceType, setSourceType] = useState<WidgetSourceType>(
    widget.data_source_type ?? 'none',
  )
  const [sourceId, setSourceId] = useState(widget.data_source_id ?? '')
  const sourceOptions =
    sourceType === 'collection' ? collections : sourceType === 'view' ? views : []
  const content = textConfigValue(widget.config, 'content')
  const embedUrl = textConfigValue(widget.config, 'url')

  return (
    <form action={action} className="space-y-3 rounded-md border bg-card p-3">
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="widgetId" type="hidden" value={widget.id} />
      <input name="dataSourceType" type="hidden" value={sourceType} />
      <input name="dataSourceId" type="hidden" value={sourceId} />
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
          Widget {index + 1}
        </h4>
        <Badge className="font-normal" variant="secondary">
          Stable ID
        </Badge>
      </div>
      <Input
        aria-label="Widget title"
        defaultValue={widget.title ?? WIDGET_TYPE_META[widget.widget_type].label}
        name="title"
        required
      />

      {(widget.widget_type === 'text' || widget.widget_type === 'heading') && (
        <Textarea
          defaultValue={content}
          name="content"
          placeholder="Widget content"
          rows={4}
        />
      )}

      {widget.widget_type === 'embed' && (
        <Input
          defaultValue={embedUrl}
          name="embedUrl"
          placeholder="https://example.com/embed"
        />
      )}

      <div className="grid gap-2">
        <NativeSelect
          className="w-full"
          onChange={(event) => {
            setSourceType(event.target.value as WidgetSourceType)
            setSourceId('')
          }}
          value={sourceType}
        >
          <option value="none">No source</option>
          <option value="collection">Collection</option>
          <option value="view">Saved view</option>
        </NativeSelect>

        {sourceType !== 'none' && (
          <NativeSelect
            className="w-full"
            onChange={(event) => setSourceId(event.target.value)}
            value={sourceId}
          >
            <option value="">Choose source</option>
            {sourceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      <Button className="w-full" disabled={isPending} size="sm" type="submit">
        <Save data-icon="inline-start" />
        Save widget
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function WidgetPreview({
  widget,
  source,
}: {
  widget: LayoutWidgetWithConfig
  source: WidgetSource
}) {
  if (widget.widget_type === 'heading') {
    return (
      <div className="rounded-md border bg-card p-4">
        <h2 className="text-2xl font-semibold">
          {textConfigValue(widget.config, 'content') || 'Heading'}
        </h2>
      </div>
    )
  }

  if (widget.widget_type === 'text') {
    return (
      <div className="rounded-md border bg-card p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {textConfigValue(widget.config, 'content') || 'Text block'}
        </p>
      </div>
    )
  }

  if (widget.widget_type === 'embed') {
    const url = textConfigValue(widget.config, 'url')

    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed bg-card p-6 text-center">
        <div>
          <Code className="mx-auto mb-3 size-8 text-muted-foreground" />
          <div className="text-sm font-medium">{url || 'Embed placeholder'}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            External embed rendering will be hardened later.
          </p>
        </div>
      </div>
    )
  }

  if (widget.widget_type === 'activity_feed') {
    return <ActivityFeedPreview />
  }

  if (widget.widget_type === 'file_links') {
    return <FileLinksPreview source={source} />
  }

  if (!source.collection) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed bg-card p-6 text-center">
        <div>
          <LayoutTemplate className="mx-auto mb-3 size-8 text-muted-foreground" />
          <div className="text-sm font-medium">Connect a source</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a collection or saved view for this data widget.
          </p>
        </div>
      </div>
    )
  }

  if (widget.widget_type === 'table') {
    return <TableWidgetPreview source={source} />
  }

  if (widget.widget_type === 'kanban') {
    return <KanbanWidgetPreview source={source} />
  }

  if (widget.widget_type === 'calendar') {
    return <CalendarWidgetPreview source={source} />
  }

  if (widget.widget_type === 'kpi_card') {
    return <KpiWidgetPreview source={source} widget={widget} />
  }

  return null
}

function TableWidgetPreview({ source }: { source: WidgetSource }) {
  const { fields, records } = sourceData(source)

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">Title</TableHead>
            {fields.slice(0, 4).map((field) => (
              <TableHead className="min-w-36" key={field.id}>
                {field.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.slice(0, 5).map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.title}</TableCell>
              {fields.slice(0, 4).map((field) => (
                <TableCell key={field.id}>
                  <FieldValue field={field} record={record} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {records.length === 0 && (
        <div className="border-t p-4 text-center text-sm text-muted-foreground">
          No records to show.
        </div>
      )}
    </div>
  )
}

function KanbanWidgetPreview({ source }: { source: WidgetSource }) {
  const { fields, records } = sourceData(source)
  const configuredField = source.view?.config.kanban.groupFieldId
    ? fields.find((field) => field.id === source.view?.config.kanban.groupFieldId)
    : null
  const groupField =
    configuredField ??
    fields.find((field) => ['status', 'select', 'person'].includes(field.field_type))

  if (!groupField) {
    return (
      <GuidedWidget message="Kanban widgets need a status, select, or person field." />
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
      : Array.from(new Set(records.map((record) => fieldValueLabel(groupField, record))))
          .map((value) => ({
            id: value || 'empty',
            label: value || 'Empty',
            records: records.filter(
              (record) => fieldValueLabel(groupField, record) === value,
            ),
          }))

  return (
    <div className="overflow-x-auto rounded-md border bg-card p-3">
      <div className="flex gap-3">
        {groups.slice(0, 4).map((group) => (
          <div className="w-52 shrink-0" key={group.id}>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="truncate text-sm font-medium">{group.label}</h4>
              <Badge className="ml-auto font-normal" variant="secondary">
                {group.records.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {group.records.slice(0, 3).map((record) => (
                <div className="rounded-md border bg-background p-2 text-sm" key={record.id}>
                  {record.title}
                </div>
              ))}
              {group.records.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
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

function CalendarWidgetPreview({ source }: { source: WidgetSource }) {
  const { fields, records } = sourceData(source)
  const configuredField = source.view?.config.calendar.dateFieldId
    ? fields.find((field) => field.id === source.view?.config.calendar.dateFieldId)
    : null
  const dateField =
    configuredField ?? fields.find((field) => field.field_type === 'date')

  if (!dateField) {
    return <GuidedWidget message="Calendar widgets need a date field." />
  }

  const calendarDateField = dateField
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const calendarDays: Array<number | null> = []

  for (let index = 0; index < firstDay.getDay(); index++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    calendarDays.push(day)
  }

  function countForDay(day: number | null) {
    if (!day) {
      return 0
    }

    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(day).padStart(2, '0')}`

    return records.filter(
      (record) => fieldValueLabel(calendarDateField, record) === dateKey,
    ).length
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {new Intl.DateTimeFormat('en', { month: 'long' }).format(now)}
        </h3>
        <Badge className="font-normal" variant="outline">
          {calendarDateField.name}
        </Badge>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md bg-border">
        {calendarDays.slice(0, 35).map((day, index) => {
          const count = countForDay(day)

          return (
            <div
              className={cn('min-h-14 bg-background p-1 text-xs', !day && 'bg-secondary')}
              key={`${day ?? 'empty'}-${index}`}
            >
              {day && (
                <>
                  <div className="font-medium">{day}</div>
                  {count > 0 && (
                    <div className="mt-1 rounded bg-primary/10 px-1 text-primary">
                      {count}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiWidgetPreview({
  widget,
  source,
}: {
  widget: LayoutWidgetWithConfig
  source: WidgetSource
}) {
  const { records } = sourceData(source)
  const label = textConfigValue(widget.config, 'metricLabel') || 'Records'

  return (
    <div className="rounded-md border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-4xl font-semibold">{records.length}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {source.view ? 'Filtered by saved view' : 'Total connected records'}
      </div>
    </div>
  )
}

function FileLinksPreview({ source }: { source: WidgetSource }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">File links</h3>
      </div>
      <div className="space-y-2">
        {['Shared brief.pdf', 'Brand assets folder', 'Client upload area'].map(
          (item) => (
            <div
              className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
              key={item}
            >
              <span>{item}</span>
              <Badge className="font-normal" variant="secondary">
                placeholder
              </Badge>
            </div>
          ),
        )}
      </div>
      {source.collection && (
        <p className="mt-3 text-xs text-muted-foreground">
          Connected to {source.collection.name}
        </p>
      )}
    </div>
  )
}

function ActivityFeedPreview() {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Recent activity</h3>
      </div>
      <div className="space-y-3 text-sm">
        {[
          'Page layout updated',
          'Widget connected to a saved view',
          'Collection record changed',
        ].map((item, index) => (
          <div className="flex gap-3" key={item}>
            <div className="mt-1 size-2 rounded-full bg-primary" />
            <div>
              <div>{item}</div>
              <div className="text-xs text-muted-foreground">
                {index + 1}h ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GuidedWidget({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed bg-card p-6 text-center">
      <div>
        <LayoutTemplate className="mx-auto mb-3 size-8 text-muted-foreground" />
        <div className="text-sm font-medium">Setup needed</div>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
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

  if (
    isPropertyType(field.field_type) &&
    PROPERTY_TYPE_META[field.field_type].optionBacked
  ) {
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
