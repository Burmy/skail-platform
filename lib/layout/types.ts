import type { Json, LayoutWidget, SitePage } from '@/lib/supabase/database.types'
import type {
  PageStyleWithConfig,
  WidgetStyleWithConfig,
} from '@/lib/theme/types'

export const WIDGET_TYPES = [
  'text',
  'heading',
  'table',
  'kanban',
  'calendar',
  'kpi_card',
  'file_links',
  'embed',
  'activity_feed',
] as const

export const DUPLICATE_PAGE_MODES = [
  'layout_only',
  'layout_with_empty_database',
  'everything',
] as const

export const WIDGET_SOURCE_TYPES = ['none', 'collection', 'view'] as const

export type WidgetType = (typeof WIDGET_TYPES)[number]
export type DuplicatePageMode = (typeof DUPLICATE_PAGE_MODES)[number]
export type WidgetSourceType = (typeof WIDGET_SOURCE_TYPES)[number]
export type WidgetConfig = { [key: string]: Json | undefined }

export type LayoutWidgetWithConfig = LayoutWidget & {
  widget_type: WidgetType
  data_source_type: Exclude<WidgetSourceType, 'none'> | null
  config: WidgetConfig
  style?: WidgetStyleWithConfig['style'] | null
}

export type PageWithWidgets = SitePage & {
  widgets: LayoutWidgetWithConfig[]
  style?: PageStyleWithConfig | null
}

export const WIDGET_TYPE_META: Record<
  WidgetType,
  {
    label: string
    description: string
    sourceMode: 'none' | 'optional' | 'recommended'
  }
> = {
  text: {
    label: 'Text',
    description: 'Paragraph copy or notes.',
    sourceMode: 'none',
  },
  heading: {
    label: 'Heading',
    description: 'Section title text.',
    sourceMode: 'none',
  },
  table: {
    label: 'Table',
    description: 'Rows from a collection or saved view.',
    sourceMode: 'recommended',
  },
  kanban: {
    label: 'Kanban',
    description: 'Grouped records from a collection or saved view.',
    sourceMode: 'recommended',
  },
  calendar: {
    label: 'Calendar',
    description: 'Date-based records from a collection or saved view.',
    sourceMode: 'recommended',
  },
  kpi_card: {
    label: 'KPI card',
    description: 'A compact metric connected to data.',
    sourceMode: 'optional',
  },
  file_links: {
    label: 'File links',
    description: 'Document and attachment shortcuts.',
    sourceMode: 'optional',
  },
  embed: {
    label: 'Embed',
    description: 'External URL or iframe placeholder.',
    sourceMode: 'none',
  },
  activity_feed: {
    label: 'Activity feed',
    description: 'Recent workspace activity placeholder.',
    sourceMode: 'none',
  },
}

export function isWidgetType(value: string): value is WidgetType {
  return WIDGET_TYPES.includes(value as WidgetType)
}

export function isWidgetSourceType(value: string): value is WidgetSourceType {
  return WIDGET_SOURCE_TYPES.includes(value as WidgetSourceType)
}

export function defaultWidgetTitle(widgetType: WidgetType) {
  return WIDGET_TYPE_META[widgetType].label
}

export function defaultWidgetConfig(widgetType: WidgetType): WidgetConfig {
  switch (widgetType) {
    case 'heading':
      return {
        content: 'New section',
        level: 'h2',
      }
    case 'text':
      return {
        content: 'Add supporting copy for this page.',
      }
    case 'embed':
      return {
        url: '',
      }
    case 'file_links':
      return {
        links: [],
      }
    case 'kpi_card':
      return {
        metricLabel: 'Records',
      }
    default:
      return {}
  }
}

export function parseWidgetConfig(configJson: Json | null): WidgetConfig {
  if (!configJson || typeof configJson !== 'object' || Array.isArray(configJson)) {
    return {}
  }

  return configJson
}

export function serializeWidgetConfig(config: WidgetConfig): Json {
  return config
}

export function textConfigValue(config: WidgetConfig, key: string) {
  const value = config[key]

  return typeof value === 'string' ? value : ''
}
