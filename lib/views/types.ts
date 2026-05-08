import type { Json, SavedView } from '@/lib/supabase/database.types'

export const VIEW_TYPES = [
  'table',
  'kanban',
  'gallery',
  'list',
  'calendar',
  'timeline',
  'chart',
  'dashboard',
  'map',
  'form',
] as const

export type SavedViewType = (typeof VIEW_TYPES)[number]

export const VIEW_TYPE_META: Record<
  SavedViewType,
  { label: string; description: string }
> = {
  table: { label: 'Table', description: 'Spreadsheet of records.' },
  kanban: { label: 'Board', description: 'Cards grouped by a field.' },
  gallery: { label: 'Gallery', description: 'Cards with covers.' },
  list: { label: 'List', description: 'Dense vertical list.' },
  calendar: { label: 'Calendar', description: 'Records placed by date.' },
  timeline: { label: 'Timeline', description: 'Bars across a date range.' },
  chart: { label: 'Chart', description: 'Single chart with one aggregation.' },
  dashboard: { label: 'Dashboard', description: 'Multiple blocks of summary data.' },
  map: { label: 'Map', description: 'Records pinned by location.' },
  form: { label: 'Form', description: 'Collect new records via a form.' },
}

export type ViewFilterOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'before'
  | 'after'
  | 'on'
  | 'within'
  | 'is'
  | 'is_not'
  | 'contains_any'
  | 'contains_all'
  | 'does_not_contain'
  | 'is_checked'
  | 'is_not_checked'
  | 'has_value'
  | 'is_empty'
  | 'is_not_empty'

export const VIEW_FILTER_OPERATORS: readonly ViewFilterOperator[] = [
  'contains',
  'not_contains',
  'equals',
  'not_equals',
  'starts_with',
  'ends_with',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'before',
  'after',
  'on',
  'within',
  'is',
  'is_not',
  'contains_any',
  'contains_all',
  'does_not_contain',
  'is_checked',
  'is_not_checked',
  'has_value',
  'is_empty',
  'is_not_empty',
] as const

export function isViewFilterOperator(value: unknown): value is ViewFilterOperator {
  return typeof value === 'string' && (VIEW_FILTER_OPERATORS as readonly string[]).includes(value)
}

export type ViewSortDirection = 'asc' | 'desc'

// Filter values are stored as JSON-friendly primitives; per-operator the consumer interprets the shape.
export type ViewFilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | { from?: string | number | null; to?: string | number | null }

export type ViewFilter = {
  id: string
  fieldId: string
  operator: ViewFilterOperator
  value: ViewFilterValue
}

export type ViewFilterGroup = {
  id: string
  conjunction: 'and' | 'or'
  children: Array<ViewFilter | ViewFilterGroup>
}

export function isFilterGroup(node: ViewFilter | ViewFilterGroup): node is ViewFilterGroup {
  return (node as ViewFilterGroup).conjunction !== undefined
}

export type FilterPreset = {
  id: string
  name: string
  filters: ViewFilter[]
  filterTree?: ViewFilterGroup
}

export type DashboardTemplate = {
  id: string
  name: string
  description?: string
  blocks: DashboardBlock[]
}

export type ViewSort = {
  id: string
  fieldId: string
  direction: ViewSortDirection
}

// ---------------------------------------------------------------------------
// Per-view sub-configs
// ---------------------------------------------------------------------------

export type KanbanConfig = {
  groupFieldId: string | null
  columnOrder?: string[]
  cardOrder?: Record<string, string[]>
  collapsedColumns?: string[]
}

export type GalleryConfig = {
  coverFieldId: string | null
  coverFit: 'cover' | 'contain' | 'fit'
  cardSize: 'sm' | 'md' | 'lg'
  visibleFieldIds?: string[]
}

export type ListConfig = {
  showFieldIds: string[]
  iconFieldId?: string | null
  density: 'comfortable' | 'compact'
}

export type CalendarConfig = {
  dateFieldId: string | null
  defaultMode?: 'month' | 'week' | 'day'
}

export type TimelineConfig = {
  startFieldId: string | null
  endFieldId?: string | null
  mode: 'days' | 'weeks' | 'months' | 'quarters'
  groupFieldId?: string | null
}

export type ChartConfig = {
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area'
  xFieldId: string | null
  yFieldId?: string | null
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max'
}

export type DashboardBlockType = 'kpi' | 'status_count' | 'list' | 'chart'

export type DashboardBlock = {
  id: string
  type: DashboardBlockType
  title?: string
  fieldId?: string | null
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  chart?: Pick<ChartConfig, 'chartType' | 'xFieldId' | 'yFieldId' | 'aggregation'>
  filterIds?: string[]
  layout: { x: number; y: number; w: number; h: number }
}

export type DashboardConfig = {
  blocks: DashboardBlock[]
}

export type MapConfig = {
  locationFieldId: string | null
  defaultZoom: number
  defaultCenter?: { lat: number; lng: number }
  clusterAtZoom: number
}

export type FormConfig = {
  title: string
  description?: string
  includedFieldIds: string[]
  requiredFieldIds: string[]
  submitButtonText: string
  successMessage: string
  sharePublicly: boolean
  publicSlug?: string
  redirectUrl?: string
}

export type ViewConfig = {
  visibleFieldIds: string[]
  fieldOrder: string[]
  columnWidths: Record<string, number>
  density: 'comfortable' | 'compact'
  frozenFieldIds: string[]
  filters: ViewFilter[]
  filterTree?: ViewFilterGroup
  filterPresets?: FilterPreset[]
  activePresetId?: string | null
  sorts: ViewSort[]
  search?: string
  kanban: KanbanConfig
  gallery?: GalleryConfig
  list?: ListConfig
  calendar: CalendarConfig
  timeline?: TimelineConfig
  chart?: ChartConfig
  dashboard?: DashboardConfig
  map?: MapConfig
  form?: FormConfig
}

export type SavedViewWithConfig = SavedView & {
  view_type: SavedViewType
  config: ViewConfig
}

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  visibleFieldIds: [],
  fieldOrder: [],
  columnWidths: {},
  density: 'comfortable',
  frozenFieldIds: [],
  filters: [],
  sorts: [],
  kanban: { groupFieldId: null },
  calendar: { dateFieldId: null, defaultMode: 'month' },
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  coverFieldId: null,
  coverFit: 'cover',
  cardSize: 'md',
}

export const DEFAULT_LIST_CONFIG: ListConfig = {
  showFieldIds: [],
  iconFieldId: null,
  density: 'comfortable',
}

export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  startFieldId: null,
  endFieldId: null,
  mode: 'weeks',
  groupFieldId: null,
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  chartType: 'bar',
  xFieldId: null,
  yFieldId: null,
  aggregation: 'count',
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  locationFieldId: null,
  defaultZoom: 10,
  clusterAtZoom: 12,
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  title: 'Untitled form',
  includedFieldIds: [],
  requiredFieldIds: [],
  submitButtonText: 'Submit',
  successMessage: 'Thanks — your response has been recorded.',
  sharePublicly: false,
}

export function isSavedViewType(value: string): value is SavedViewType {
  return VIEW_TYPES.includes(value as SavedViewType)
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => (typeof item === 'string' ? [item] : []))
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseFilterValue(raw: unknown): ViewFilterValue {
  if (raw === null) return null
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw
  if (Array.isArray(raw)) return raw.flatMap((v) => (typeof v === 'string' ? [v] : []))
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      from: typeof obj.from === 'string' || typeof obj.from === 'number' ? obj.from : null,
      to: typeof obj.to === 'string' || typeof obj.to === 'number' ? obj.to : null,
    }
  }
  return ''
}

function parseFilters(value: unknown): ViewFilter[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const f = item as Record<string, unknown>
    if (typeof f.id !== 'string' || typeof f.fieldId !== 'string') return []
    if (!isViewFilterOperator(f.operator)) return []
    return [
      {
        id: f.id,
        fieldId: f.fieldId,
        operator: f.operator,
        value: parseFilterValue(f.value),
      },
    ]
  })
}

function parseFilterTree(value: unknown): ViewFilterGroup | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.id !== 'string') return undefined
  const conjunction = obj.conjunction === 'or' ? 'or' : 'and'
  if (!Array.isArray(obj.children)) return undefined
  const children: Array<ViewFilter | ViewFilterGroup> = []
  for (const child of obj.children) {
    if (!child || typeof child !== 'object' || Array.isArray(child)) continue
    const childObj = child as Record<string, unknown>
    if (childObj.conjunction !== undefined) {
      const group = parseFilterTree(childObj)
      if (group) children.push(group)
    } else if (typeof childObj.fieldId === 'string' && typeof childObj.id === 'string') {
      const single = parseFilters([childObj])[0]
      if (single) children.push(single)
    }
  }
  return { id: obj.id, conjunction, children }
}

function parseFilterPresets(value: unknown): FilterPreset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || typeof o.name !== 'string') return []
    const preset: FilterPreset = {
      id: o.id,
      name: o.name,
      filters: parseFilters(o.filters),
    }
    const tree = parseFilterTree(o.filterTree)
    if (tree) preset.filterTree = tree
    return [preset]
  })
}

function parseSorts(value: unknown): ViewSort[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const s = item as Record<string, unknown>
    if (
      typeof s.id !== 'string' ||
      typeof s.fieldId !== 'string' ||
      (s.direction !== 'asc' && s.direction !== 'desc')
    ) {
      return []
    }
    return [{ id: s.id, fieldId: s.fieldId, direction: s.direction }]
  })
}

function parseColumnWidths(value: unknown): Record<string, number> {
  const obj = objectValue(value)
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v
  }
  return out
}

function parseDashboardBlocks(value: unknown): DashboardBlock[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const b = item as Record<string, unknown>
    const layout = objectValue(b.layout)
    if (
      typeof b.id !== 'string' ||
      typeof b.type !== 'string' ||
      !['kpi', 'status_count', 'list', 'chart'].includes(b.type)
    ) {
      return []
    }
    return [
      {
        id: b.id,
        type: b.type as DashboardBlockType,
        title: typeof b.title === 'string' ? b.title : undefined,
        fieldId: typeof b.fieldId === 'string' ? b.fieldId : null,
        aggregation:
          typeof b.aggregation === 'string' &&
          ['count', 'sum', 'avg', 'min', 'max'].includes(b.aggregation)
            ? (b.aggregation as DashboardBlock['aggregation'])
            : undefined,
        chart:
          b.chart && typeof b.chart === 'object' && !Array.isArray(b.chart)
            ? {
                chartType: ((b.chart as Record<string, unknown>).chartType as ChartConfig['chartType']) ?? 'bar',
                xFieldId: typeof (b.chart as Record<string, unknown>).xFieldId === 'string' ? ((b.chart as Record<string, unknown>).xFieldId as string) : null,
                yFieldId: typeof (b.chart as Record<string, unknown>).yFieldId === 'string' ? ((b.chart as Record<string, unknown>).yFieldId as string) : null,
                aggregation: ((b.chart as Record<string, unknown>).aggregation as ChartConfig['aggregation']) ?? 'count',
              }
            : undefined,
        filterIds: stringArray(b.filterIds),
        layout: {
          x: numberValue(layout.x, 0),
          y: numberValue(layout.y, 0),
          w: numberValue(layout.w, 4),
          h: numberValue(layout.h, 2),
        },
      },
    ]
  })
}

export function parseViewConfig(configJson: Json | null): ViewConfig {
  const config = objectValue(configJson)
  const kanban = objectValue(config.kanban)
  const calendar = objectValue(config.calendar)
  const gallery = objectValue(config.gallery)
  const list = objectValue(config.list)
  const timeline = objectValue(config.timeline)
  const chart = objectValue(config.chart)
  const dashboard = objectValue(config.dashboard)
  const map = objectValue(config.map)
  const form = objectValue(config.form)

  const result: ViewConfig = {
    visibleFieldIds: stringArray(config.visibleFieldIds),
    fieldOrder: stringArray(config.fieldOrder),
    columnWidths: parseColumnWidths(config.columnWidths),
    density: config.density === 'compact' ? 'compact' : 'comfortable',
    frozenFieldIds: stringArray(config.frozenFieldIds),
    filters: parseFilters(config.filters),
    filterTree: parseFilterTree(config.filterTree),
    filterPresets: parseFilterPresets(config.filterPresets),
    activePresetId:
      typeof config.activePresetId === 'string' ? config.activePresetId : null,
    sorts: parseSorts(config.sorts),
    kanban: {
      groupFieldId: typeof kanban.groupFieldId === 'string' ? kanban.groupFieldId : null,
      columnOrder: stringArray(kanban.columnOrder),
      cardOrder: (() => {
        const co = objectValue(kanban.cardOrder)
        const out: Record<string, string[]> = {}
        for (const [k, v] of Object.entries(co)) out[k] = stringArray(v)
        return out
      })(),
      collapsedColumns: stringArray(kanban.collapsedColumns),
    },
    calendar: {
      dateFieldId: typeof calendar.dateFieldId === 'string' ? calendar.dateFieldId : null,
      defaultMode:
        calendar.defaultMode === 'week' || calendar.defaultMode === 'day'
          ? (calendar.defaultMode as 'week' | 'day')
          : 'month',
    },
  }

  if (typeof config.search === 'string') result.search = config.search

  if (Object.keys(gallery).length > 0) {
    result.gallery = {
      coverFieldId: typeof gallery.coverFieldId === 'string' ? gallery.coverFieldId : null,
      coverFit:
        gallery.coverFit === 'contain' || gallery.coverFit === 'fit'
          ? (gallery.coverFit as 'contain' | 'fit')
          : 'cover',
      cardSize:
        gallery.cardSize === 'sm' || gallery.cardSize === 'lg'
          ? (gallery.cardSize as 'sm' | 'lg')
          : 'md',
      visibleFieldIds: stringArray(gallery.visibleFieldIds),
    }
  }

  if (Object.keys(list).length > 0) {
    result.list = {
      showFieldIds: stringArray(list.showFieldIds),
      iconFieldId: typeof list.iconFieldId === 'string' ? list.iconFieldId : null,
      density: list.density === 'compact' ? 'compact' : 'comfortable',
    }
  }

  if (Object.keys(timeline).length > 0) {
    result.timeline = {
      startFieldId: typeof timeline.startFieldId === 'string' ? timeline.startFieldId : null,
      endFieldId: typeof timeline.endFieldId === 'string' ? timeline.endFieldId : null,
      mode:
        timeline.mode === 'days' ||
        timeline.mode === 'months' ||
        timeline.mode === 'quarters'
          ? (timeline.mode as TimelineConfig['mode'])
          : 'weeks',
      groupFieldId: typeof timeline.groupFieldId === 'string' ? timeline.groupFieldId : null,
    }
  }

  if (Object.keys(chart).length > 0) {
    result.chart = {
      chartType:
        chart.chartType === 'line' ||
        chart.chartType === 'pie' ||
        chart.chartType === 'donut' ||
        chart.chartType === 'area'
          ? (chart.chartType as ChartConfig['chartType'])
          : 'bar',
      xFieldId: typeof chart.xFieldId === 'string' ? chart.xFieldId : null,
      yFieldId: typeof chart.yFieldId === 'string' ? chart.yFieldId : null,
      aggregation:
        chart.aggregation === 'sum' ||
        chart.aggregation === 'avg' ||
        chart.aggregation === 'min' ||
        chart.aggregation === 'max'
          ? (chart.aggregation as ChartConfig['aggregation'])
          : 'count',
    }
  }

  if (Object.keys(dashboard).length > 0) {
    result.dashboard = { blocks: parseDashboardBlocks(dashboard.blocks) }
  }

  if (Object.keys(map).length > 0) {
    const center = objectValue(map.defaultCenter)
    result.map = {
      locationFieldId: typeof map.locationFieldId === 'string' ? map.locationFieldId : null,
      defaultZoom: numberValue(map.defaultZoom, 10),
      clusterAtZoom: numberValue(map.clusterAtZoom, 12),
      defaultCenter:
        typeof center.lat === 'number' && typeof center.lng === 'number'
          ? { lat: center.lat, lng: center.lng }
          : undefined,
    }
  }

  if (Object.keys(form).length > 0) {
    result.form = {
      title: typeof form.title === 'string' ? form.title : DEFAULT_FORM_CONFIG.title,
      description: typeof form.description === 'string' ? form.description : undefined,
      includedFieldIds: stringArray(form.includedFieldIds),
      requiredFieldIds: stringArray(form.requiredFieldIds),
      submitButtonText:
        typeof form.submitButtonText === 'string'
          ? form.submitButtonText
          : DEFAULT_FORM_CONFIG.submitButtonText,
      successMessage:
        typeof form.successMessage === 'string'
          ? form.successMessage
          : DEFAULT_FORM_CONFIG.successMessage,
      sharePublicly: form.sharePublicly === true,
      publicSlug: typeof form.publicSlug === 'string' ? form.publicSlug : undefined,
      redirectUrl: typeof form.redirectUrl === 'string' ? form.redirectUrl : undefined,
    }
  }

  return result
}

export function serializeViewConfig(config: ViewConfig): Json {
  const serialized: Record<string, unknown> = {
    visibleFieldIds: config.visibleFieldIds,
    fieldOrder: config.fieldOrder,
    columnWidths: config.columnWidths,
    density: config.density,
    frozenFieldIds: config.frozenFieldIds,
    filters: config.filters,
    sorts: config.sorts,
    kanban: config.kanban,
    calendar: config.calendar,
  }
  if (config.filterTree) serialized.filterTree = config.filterTree
  if (config.filterPresets && config.filterPresets.length > 0) {
    serialized.filterPresets = config.filterPresets
  }
  if (config.activePresetId !== undefined) {
    serialized.activePresetId = config.activePresetId
  }
  if (config.search !== undefined) serialized.search = config.search
  if (config.gallery) serialized.gallery = config.gallery
  if (config.list) serialized.list = config.list
  if (config.timeline) serialized.timeline = config.timeline
  if (config.chart) serialized.chart = config.chart
  if (config.dashboard) serialized.dashboard = config.dashboard
  if (config.map) serialized.map = config.map
  if (config.form) serialized.form = config.form
  return serialized as Json
}
