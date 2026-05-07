import type { Json, SavedView } from '@/lib/supabase/database.types'

export const VIEW_TYPES = ['table', 'kanban', 'calendar', 'dashboard'] as const

export type SavedViewType = (typeof VIEW_TYPES)[number]

export type ViewFilterOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'

export type ViewSortDirection = 'asc' | 'desc'

export type ViewFilter = {
  id: string
  fieldId: string
  operator: ViewFilterOperator
  value: string
}

export type ViewSort = {
  id: string
  fieldId: string
  direction: ViewSortDirection
}

export type ViewConfig = {
  visibleFieldIds: string[]
  filters: ViewFilter[]
  sorts: ViewSort[]
  kanban: {
    groupFieldId: string | null
  }
  calendar: {
    dateFieldId: string | null
  }
}

export type SavedViewWithConfig = SavedView & {
  view_type: SavedViewType
  config: ViewConfig
}

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  visibleFieldIds: [],
  filters: [],
  sorts: [],
  kanban: {
    groupFieldId: null,
  },
  calendar: {
    dateFieldId: null,
  },
}

export function isSavedViewType(value: string): value is SavedViewType {
  return VIEW_TYPES.includes(value as SavedViewType)
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => (typeof item === 'string' ? [item] : []))
}

function parseFilters(value: unknown): ViewFilter[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const filter = item as Record<string, unknown>
    const id = filter.id
    const fieldId = filter.fieldId
    const operator = filter.operator
    const filterValue = filter.value

    if (
      typeof id !== 'string' ||
      typeof fieldId !== 'string' ||
      typeof operator !== 'string' ||
      !['contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty'].includes(
        operator,
      )
    ) {
      return []
    }

    return [
      {
        id,
        fieldId,
        operator: operator as ViewFilterOperator,
        value: typeof filterValue === 'string' ? filterValue : '',
      },
    ]
  })
}

function parseSorts(value: unknown): ViewSort[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const sort = item as Record<string, unknown>
    const id = sort.id
    const fieldId = sort.fieldId
    const direction = sort.direction

    if (
      typeof id !== 'string' ||
      typeof fieldId !== 'string' ||
      (direction !== 'asc' && direction !== 'desc')
    ) {
      return []
    }

    return [
      {
        id,
        fieldId,
        direction,
      },
    ]
  })
}

function objectValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function parseViewConfig(configJson: Json | null): ViewConfig {
  const config = objectValue(configJson)
  const kanban = objectValue(config.kanban)
  const calendar = objectValue(config.calendar)

  return {
    visibleFieldIds: stringArray(config.visibleFieldIds),
    filters: parseFilters(config.filters),
    sorts: parseSorts(config.sorts),
    kanban: {
      groupFieldId:
        typeof kanban.groupFieldId === 'string' ? kanban.groupFieldId : null,
    },
    calendar: {
      dateFieldId:
        typeof calendar.dateFieldId === 'string' ? calendar.dateFieldId : null,
    },
  }
}

export function serializeViewConfig(config: ViewConfig): Json {
  return {
    visibleFieldIds: config.visibleFieldIds,
    filters: config.filters,
    sorts: config.sorts,
    kanban: config.kanban,
    calendar: config.calendar,
  }
}
