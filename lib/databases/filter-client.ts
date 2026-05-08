// Client-safe mirror of the server-side filter / sort / search evaluator.
// Used by DatabaseShell to apply filters & search instantly without a server roundtrip.

import {
  parseFieldOptions,
  type CollectionRecordWithValues,
  type FieldOption,
} from '@/lib/properties/types'
import type { CollectionFieldWithType } from './queries'
import {
  isFilterGroup,
  type ViewConfig,
  type ViewFilter,
  type ViewFilterGroup,
  type ViewSort,
} from '@/lib/views/types'

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined }

function readInner(record: CollectionRecordWithValues, fieldId: string): unknown {
  const raw = record.values[fieldId]
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'value' in raw
  ) {
    return (raw as Record<string, Json>).value
  }
  return null
}

function evaluateFilterClient(
  record: CollectionRecordWithValues,
  filter: ViewFilter,
  fieldsById: Map<string, CollectionFieldWithType>,
): boolean {
  const field = fieldsById.get(filter.fieldId)
  if (!field) return true

  const inner = readInner(record, filter.fieldId)

  const isOptionBacked =
    field.field_type === 'select' ||
    field.field_type === 'status' ||
    field.field_type === 'multi_select'
  const optionPairs: Array<{ id: string; label: string }> = isOptionBacked
    ? parseFieldOptions(field.options_json).map((o: FieldOption) => ({
        id: o.id,
        label: o.label,
      }))
    : []

  const expand = (val: unknown): string[] => {
    if (typeof val !== 'string') {
      return typeof val === 'number' || typeof val === 'boolean'
        ? [String(val)]
        : []
    }
    if (!isOptionBacked) return [val]
    const lower = val.toLowerCase()
    const out = new Set<string>([val])
    for (const p of optionPairs) {
      if (p.id === val || p.label.toLowerCase() === lower) {
        out.add(p.id)
        out.add(p.label)
      }
    }
    return Array.from(out)
  }

  switch (filter.operator) {
    case 'is_empty':
      return inner === null || inner === undefined || inner === ''
    case 'is_not_empty':
    case 'has_value':
      return !(inner === null || inner === undefined || inner === '')
    case 'is_checked':
      return inner === true
    case 'is_not_checked':
      return inner !== true
    case 'contains':
      return matchesString(inner, filter.value, (a, b) => a.includes(b))
    case 'not_contains':
      return !matchesString(inner, filter.value, (a, b) => a.includes(b))
    case 'starts_with':
      return matchesString(inner, filter.value, (a, b) => a.startsWith(b))
    case 'ends_with':
      return matchesString(inner, filter.value, (a, b) => a.endsWith(b))
    case 'equals':
    case 'is': {
      if (typeof inner !== 'string') return false
      return expand(filter.value).some((v) => v.toLowerCase() === inner.toLowerCase())
    }
    case 'not_equals':
    case 'is_not': {
      if (typeof inner !== 'string') return true
      return !expand(filter.value).some((v) => v.toLowerCase() === inner.toLowerCase())
    }
    case 'contains_any':
    case 'contains_all': {
      const arr = Array.isArray(inner)
        ? inner.map((v) => (typeof v === 'string' ? v.toLowerCase() : String(v)))
        : [typeof inner === 'string' ? inner.toLowerCase() : String(inner ?? '')]
      const rawTargets = Array.isArray(filter.value)
        ? filter.value
        : typeof filter.value === 'string'
          ? [filter.value]
          : []
      if (rawTargets.length === 0) return true
      if (filter.operator === 'contains_any') {
        return rawTargets.some((t) =>
          expand(t).some((v) => arr.includes(v.toLowerCase())),
        )
      }
      return rawTargets.every((t) =>
        expand(t).some((v) => arr.includes(v.toLowerCase())),
      )
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const lhs = typeof inner === 'number' ? inner : Number(inner)
      const rhs =
        typeof filter.value === 'number'
          ? filter.value
          : Number(filter.value as string)
      if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) return false
      if (filter.operator === 'gt') return lhs > rhs
      if (filter.operator === 'gte') return lhs >= rhs
      if (filter.operator === 'lt') return lhs < rhs
      return lhs <= rhs
    }
    case 'before':
    case 'after':
    case 'on': {
      if (typeof inner !== 'string') return false
      const lhs = new Date(inner).getTime()
      const rhsRaw = typeof filter.value === 'string' ? filter.value : null
      if (!rhsRaw) return false
      const rhs = new Date(rhsRaw).getTime()
      if (Number.isNaN(lhs) || Number.isNaN(rhs)) return false
      if (filter.operator === 'before') return lhs < rhs
      if (filter.operator === 'after') return lhs > rhs
      return Math.abs(lhs - rhs) < 24 * 60 * 60 * 1000
    }
    default:
      return true
  }
}

function matchesString(
  value: unknown,
  expected: ViewFilter['value'],
  cmp: (a: string, b: string) => boolean,
) {
  if (typeof value !== 'string') return false
  if (typeof expected !== 'string') return false
  return cmp(value.toLowerCase(), expected.toLowerCase())
}

function evaluateGroupClient(
  record: CollectionRecordWithValues,
  group: ViewFilterGroup,
  fieldsById: Map<string, CollectionFieldWithType>,
): boolean {
  if (group.children.length === 0) return true
  const checks = group.children.map((child) =>
    isFilterGroup(child)
      ? evaluateGroupClient(record, child, fieldsById)
      : evaluateFilterClient(record, child, fieldsById),
  )
  return group.conjunction === 'or' ? checks.some(Boolean) : checks.every(Boolean)
}

function compareValues(
  a: unknown,
  b: unknown,
  field: CollectionFieldWithType | undefined,
): number {
  // Handle nullish — push nulls last
  const aNull = a === null || a === undefined || a === ''
  const bNull = b === null || b === undefined || b === ''
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  // Numbers
  if (field?.field_type === 'number' || field?.field_type === 'currency') {
    const an = typeof a === 'number' ? a : Number(a)
    const bn = typeof b === 'number' ? b : Number(b)
    return an - bn
  }
  // Dates
  if (field?.field_type === 'date') {
    const at = new Date(String(a)).getTime()
    const bt = new Date(String(b)).getTime()
    return at - bt
  }
  // Strings (default)
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
}

export type ApplyClientOptions = {
  config: ViewConfig
  fields: CollectionFieldWithType[]
  searchQuery?: string
  titleFieldId: string | null
}

export function applyClientFilterSearchSort(
  records: CollectionRecordWithValues[],
  options: ApplyClientOptions,
): CollectionRecordWithValues[] {
  const { config, fields, searchQuery, titleFieldId } = options
  const fieldsById = new Map(fields.map((f) => [f.id, f]))

  let out = records.filter((r) => !r.archived_at)

  // Filter tree wins over flat filters
  if (config.filterTree && config.filterTree.children.length > 0) {
    out = out.filter((r) => evaluateGroupClient(r, config.filterTree!, fieldsById))
  } else if (config.filters && config.filters.length > 0) {
    out = out.filter((r) =>
      config.filters.every((f) => evaluateFilterClient(r, f, fieldsById)),
    )
  }

  // Search across title + text-shaped fields
  const q = (searchQuery ?? '').trim().toLowerCase()
  if (q.length > 0) {
    const textFieldIds = fields
      .filter((f) =>
        ['text', 'long_text', 'url', 'email', 'phone'].includes(f.field_type),
      )
      .map((f) => f.id)
    out = out.filter((r) => {
      const title = (r.title ?? '').toLowerCase()
      if (title.includes(q)) return true
      if (titleFieldId) {
        const titleVal = readInner(r, titleFieldId)
        if (typeof titleVal === 'string' && titleVal.toLowerCase().includes(q)) {
          return true
        }
      }
      for (const fid of textFieldIds) {
        const v = readInner(r, fid)
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true
      }
      return false
    })
  }

  // Sort
  if (config.sorts && config.sorts.length > 0) {
    out = [...out].sort((a, b) => {
      for (const sort of config.sorts as ViewSort[]) {
        const av = readInner(a, sort.fieldId)
        const bv = readInner(b, sort.fieldId)
        const cmp = compareValues(av, bv, fieldsById.get(sort.fieldId))
        if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp
      }
      return 0
    })
  }

  return out
}
