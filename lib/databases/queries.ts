import 'server-only'

import { redirect } from 'next/navigation'

import type { Json } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserWorkspaces, getWorkspaceForUser } from '@/lib/workspaces/queries'
import {
  isPropertyType,
  normalizePropertyType,
  isTextShapedType,
  parseFieldOptions,
  type CollectionRecordWithValues,
  type FieldOption,
  type PropertyType,
} from '@/lib/properties/types'
import {
  isFilterGroup,
  isSavedViewType,
  parseViewConfig,
  type SavedViewWithConfig,
  type ViewFilter,
  type ViewFilterGroup,
  type ViewSort,
} from '@/lib/views/types'
import type {
  Collection,
  CollectionField,
  CollectionRecord,
} from '@/lib/supabase/database.types'

export const RECORDS_PAGE_SIZE = 200
export const RECORDS_HARD_CAP = 5000

export type CollectionFieldWithType = CollectionField & {
  field_type: PropertyType
}

export type DatabaseShellData = {
  userEmail: string | null
  roleKey: string
  workspaceId: string
  workspaces: Awaited<ReturnType<typeof getUserWorkspaces>>['workspaces']
  collections: Collection[]
  canManageSchema: boolean
  canSeeSystemFields: boolean
}

export type CollectionWorkspaceData = DatabaseShellData & {
  collection: Collection
  fields: CollectionFieldWithType[]
  views: SavedViewWithConfig[]
  activeView: SavedViewWithConfig
  records: CollectionRecordWithValues[]
  totalLoaded: number
  hasMore: boolean
  nextCursor: { createdAt: string; id: string } | null
  titleFieldId: string | null
}

export function canManageCollectionSchema(roleKey: string | null) {
  return roleKey === 'owner' || roleKey === 'admin'
}

export function canSeeSystemCollectionFields(roleKey: string | null) {
  return canManageCollectionSchema(roleKey)
}

function castFieldType(field: CollectionField): CollectionFieldWithType {
  const raw = field.field_type
  const normalized = isPropertyType(raw) ? normalizePropertyType(raw) : 'text'
  return { ...field, field_type: normalized } as CollectionFieldWithType
}

function findTitleFieldId(fields: CollectionFieldWithType[]) {
  return (
    fields.find(
      (field) =>
        field.semantic_role === 'title' && field.field_type === 'text',
    )?.id ?? null
  )
}

export async function getDatabaseShellData(
  workspaceId: string,
): Promise<DatabaseShellData | null> {
  const [{ user, workspaces }, workspaceContext] = await Promise.all([
    getUserWorkspaces(),
    getWorkspaceForUser(workspaceId),
  ])

  if (!workspaceContext.workspace || !workspaceContext.roleKey) {
    return null
  }

  const supabase = await createClient()
  const { data: collections, error } = await supabase
    .from('collections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    userEmail: user.email ?? null,
    roleKey: workspaceContext.roleKey,
    workspaceId,
    workspaces,
    collections: collections ?? [],
    canManageSchema: canManageCollectionSchema(workspaceContext.roleKey),
    canSeeSystemFields: canSeeSystemCollectionFields(workspaceContext.roleKey),
  }
}

export async function getDefaultDatabasesRedirect(workspaceId: string) {
  const data = await getDatabaseShellData(workspaceId)
  if (!data) {
    redirect('/workspaces/new')
  }
  const firstCollection = data.collections[0]
  if (firstCollection) {
    redirect(`/databases/${firstCollection.id}?workspace_id=${workspaceId}`)
  }
  return data
}

export async function getCollectionWorkspaceData(input: {
  workspaceId: string
  collectionId: string
  viewId?: string | null
  search?: string | null
  cursor?: { createdAt: string; id: string } | null
  limit?: number
}): Promise<CollectionWorkspaceData | null> {
  const shell = await getDatabaseShellData(input.workspaceId)
  if (!shell) {
    return null
  }

  const supabase = await createClient()

  const collection = shell.collections.find((c) => c.id === input.collectionId)
  if (!collection) {
    return null
  }

  let fieldsQuery = supabase
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('collection_id', input.collectionId)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (!shell.canSeeSystemFields) {
    fieldsQuery = fieldsQuery.eq('is_system', false)
  }

  const [fieldsResult, viewsResult] = await Promise.all([
    fieldsQuery,
    supabase
      .from('views')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('collection_id', input.collectionId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
  ])

  if (fieldsResult.error) {
    throw new Error(fieldsResult.error.message)
  }
  if (viewsResult.error) {
    throw new Error(viewsResult.error.message)
  }

  const fields = (fieldsResult.data ?? []).map(castFieldType)
  const titleFieldId = findTitleFieldId(fields)

  const views: SavedViewWithConfig[] = (viewsResult.data ?? []).flatMap(
    (view) => {
      if (!isSavedViewType(view.view_type)) return []
      return [
        {
          ...view,
          view_type: view.view_type,
          config: parseViewConfig(view.config_json as Json | null),
        },
      ]
    },
  )

  if (views.length === 0) {
    return null
  }

  const activeView =
    views.find((v) => v.id === input.viewId) ?? views[0]

  const search = (input.search ?? activeView.config.search ?? '').trim()
  const limit = Math.min(input.limit ?? RECORDS_PAGE_SIZE, RECORDS_HARD_CAP)
  const cursorCreatedAt = input.cursor?.createdAt ?? null
  const cursorId = input.cursor?.id ?? null

  const rpcResult = await supabase.rpc('search_collection_records', {
    p_workspace_id: input.workspaceId,
    p_collection_id: input.collectionId,
    p_search: search === '' ? null : search,
    p_title_field_id: titleFieldId,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_id: cursorId,
    p_limit: limit,
  })

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message)
  }

  const records = (rpcResult.data ?? []) as CollectionRecord[]
  const recordIds = records.map((r) => r.id)

  let valuesByRecord = new Map<string, Record<string, Json>>()
  if (recordIds.length > 0) {
    const valuesResult = await supabase
      .from('record_values')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .in('record_id', recordIds)

    if (valuesResult.error) {
      throw new Error(valuesResult.error.message)
    }

    valuesByRecord = (valuesResult.data ?? []).reduce(
      (acc, value) => {
        if (!value.record_id || !value.field_id) return acc
        const existing = acc.get(value.record_id) ?? {}
        existing[value.field_id] = value.value_json ?? null
        acc.set(value.record_id, existing)
        return acc
      },
      new Map<string, Record<string, Json>>(),
    )
  }

  const recordsWithValues: CollectionRecordWithValues[] = records.map(
    (record) => ({
      ...record,
      values: valuesByRecord.get(record.id) ?? {},
    }),
  )

  // Compute formula values server-side and inject into record.values for each formula field.
  await applyFormulasInPlace(recordsWithValues, fields)

  const filteredAndSortedRecords = applyClientFiltersAndSorts(
    recordsWithValues,
    fields,
    activeView.config.filters,
    activeView.config.sorts,
    activeView.config.filterTree ?? null,
  )

  const lastRecord = records.at(-1)
  const hasMore = records.length === limit
  const nextCursor =
    hasMore && lastRecord?.created_at
      ? { createdAt: lastRecord.created_at, id: lastRecord.id }
      : null

  return {
    ...shell,
    collection,
    fields,
    views,
    activeView,
    records: filteredAndSortedRecords,
    totalLoaded: filteredAndSortedRecords.length,
    hasMore,
    nextCursor,
    titleFieldId,
  }
}

export async function getCollectionWorkspaceDataForEmbeddedPage(input: {
  workspaceId: string
  collectionId: string
  viewId?: string | null
  accessLevel: 'view' | 'edit' | 'manage'
}): Promise<CollectionWorkspaceData | null> {
  const admin = createAdminClient()

  const { data: collection, error: collectionError } = await admin
    .from('collections')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('id', input.collectionId)
    .is('archived_at', null)
    .maybeSingle()

  if (collectionError) throw new Error(collectionError.message)
  if (!collection) return null

  const [fieldsResult, viewsResult] = await Promise.all([
    admin
      .from('collection_fields')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('collection_id', input.collectionId)
      .eq('is_system', false)
      .is('archived_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('views')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('collection_id', input.collectionId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
  ])

  if (fieldsResult.error) throw new Error(fieldsResult.error.message)
  if (viewsResult.error) throw new Error(viewsResult.error.message)

  const fields = (fieldsResult.data ?? []).map(castFieldType)
  const titleFieldId = findTitleFieldId(fields)
  const views: SavedViewWithConfig[] = (viewsResult.data ?? []).flatMap(
    (view) => {
      if (!isSavedViewType(view.view_type)) return []
      return [
        {
          ...view,
          view_type: view.view_type,
          config: parseViewConfig(view.config_json as Json | null),
        },
      ]
    },
  )

  if (views.length === 0) return null

  const activeView =
    views.find((view) => view.id === input.viewId) ?? views[0]

  const rpcResult = await admin.rpc('search_collection_records', {
    p_workspace_id: input.workspaceId,
    p_collection_id: input.collectionId,
    p_search: null,
    p_title_field_id: titleFieldId,
    p_cursor_created_at: null,
    p_cursor_id: null,
    p_limit: RECORDS_PAGE_SIZE,
  })

  if (rpcResult.error) throw new Error(rpcResult.error.message)

  const records = (rpcResult.data ?? []) as CollectionRecord[]
  const recordIds = records.map((record) => record.id)
  let valuesByRecord = new Map<string, Record<string, Json>>()

  if (recordIds.length > 0) {
    const valuesResult = await admin
      .from('record_values')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .in('record_id', recordIds)

    if (valuesResult.error) throw new Error(valuesResult.error.message)

    valuesByRecord = (valuesResult.data ?? []).reduce(
      (acc, value) => {
        if (!value.record_id || !value.field_id) return acc
        const existing = acc.get(value.record_id) ?? {}
        existing[value.field_id] = value.value_json ?? null
        acc.set(value.record_id, existing)
        return acc
      },
      new Map<string, Record<string, Json>>(),
    )
  }

  const recordsWithValues: CollectionRecordWithValues[] = records.map(
    (record) => ({
      ...record,
      values: valuesByRecord.get(record.id) ?? {},
    }),
  )

  await applyFormulasInPlace(recordsWithValues, fields)

  const filteredAndSortedRecords = applyClientFiltersAndSorts(
    recordsWithValues,
    fields,
    activeView.config.filters,
    activeView.config.sorts,
    activeView.config.filterTree ?? null,
  )

  return {
    userEmail: null,
    roleKey: `page_${input.accessLevel}`,
    workspaceId: input.workspaceId,
    workspaces: [],
    collections: [collection],
    canManageSchema: false,
    canSeeSystemFields: false,
    collection,
    fields,
    views,
    activeView,
    records: filteredAndSortedRecords,
    totalLoaded: filteredAndSortedRecords.length,
    hasMore: false,
    nextCursor: null,
    titleFieldId,
  }
}

// Phase 1 client-applied filter/sort over the cursor page.
// Phase 1.5 will push these into the RPC for full-set correctness when filters reduce a 5k set to <200.
function applyClientFiltersAndSorts(
  records: CollectionRecordWithValues[],
  fields: CollectionFieldWithType[],
  filters: ViewFilter[],
  sorts: ViewSort[],
  filterTree: ViewFilterGroup | null = null,
): CollectionRecordWithValues[] {
  const fieldsById = new Map(fields.map((f) => [f.id, f]))

  const useTree = filterTree && filterTree.children.length > 0
  const filtered = useTree
    ? records.filter((record) => evaluateGroup(record, filterTree, fieldsById))
    : filters.length === 0
      ? records
      : records.filter((record) =>
          filters.every((filter) =>
            evaluateFilter(record, filter, fieldsById),
          ),
        )

  if (sorts.length === 0) {
    return filtered
  }

  return [...filtered].sort((a, b) => {
    for (const sort of sorts) {
      const field = fieldsById.get(sort.fieldId)
      if (!field) continue
      const av = extractScalar(a.values[sort.fieldId], field.field_type)
      const bv = extractScalar(b.values[sort.fieldId], field.field_type)
      const cmp = compareScalars(av, bv)
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

function extractScalar(value: Json | undefined, type: PropertyType) {
  if (value === undefined || value === null) return null
  if (typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    const inner = (value as Record<string, Json>).value
    if (inner === null || inner === undefined) return null
    if (type === 'number' || type === 'currency') {
      const n = typeof inner === 'number' ? inner : Number(inner)
      return Number.isFinite(n) ? n : null
    }
    if (typeof inner === 'string') return inner.toLowerCase()
    if (typeof inner === 'number' || typeof inner === 'boolean') return inner
    if (Array.isArray(inner)) return inner.map(String).join(',').toLowerCase()
    return JSON.stringify(inner).toLowerCase()
  }
  return String(value).toLowerCase()
}

function compareScalars(a: ReturnType<typeof extractScalar>, b: ReturnType<typeof extractScalar>) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function evaluateGroup(
  record: CollectionRecordWithValues,
  group: ViewFilterGroup,
  fieldsById: Map<string, CollectionFieldWithType>,
): boolean {
  if (group.children.length === 0) return true
  const checks = group.children.map((child) =>
    isFilterGroup(child)
      ? evaluateGroup(record, child, fieldsById)
      : evaluateFilter(record, child, fieldsById),
  )
  return group.conjunction === 'or' ? checks.some(Boolean) : checks.every(Boolean)
}

function evaluateFilter(
  record: CollectionRecordWithValues,
  filter: ViewFilter,
  fieldsById: Map<string, CollectionFieldWithType>,
) {
  const field = fieldsById.get(filter.fieldId)
  if (!field) return true

  const raw = record.values[filter.fieldId]
  const inner =
    raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw
      ? (raw as Record<string, Json>).value
      : null

  // For option-backed types, the user types the option label but the stored
  // value is the option id. Build a value-equivalence set so "is/equals/contains"
  // matches whether the user gave us the id, the label, or vice versa.
  const isOptionBacked =
    field.field_type === 'select' ||
    field.field_type === 'status' ||
    field.field_type === 'multi_select'
  let optionPairs: Array<{ id: string; label: string }> = []
  if (isOptionBacked) {
    const opts = parseFieldOptionsForFilter(field)
    optionPairs = opts.map((o) => ({ id: o.id, label: o.label }))
  }
  const expandToIdsAndLabels = (val: unknown): string[] => {
    if (typeof val !== 'string') return typeof val === 'number' || typeof val === 'boolean' ? [String(val)] : []
    if (!isOptionBacked) return [val]
    const lower = val.toLowerCase()
    const matchByLabel = optionPairs.filter((p) => p.label.toLowerCase() === lower)
    const matchById = optionPairs.filter((p) => p.id === val)
    const variants = new Set<string>([val])
    for (const m of matchByLabel) {
      variants.add(m.id)
      variants.add(m.label)
    }
    for (const m of matchById) {
      variants.add(m.id)
      variants.add(m.label)
    }
    return Array.from(variants)
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
      const variants = expandToIdsAndLabels(filter.value)
      return variants.some((v) => v.toLowerCase() === inner.toLowerCase())
    }
    case 'not_equals':
    case 'is_not': {
      if (typeof inner !== 'string') return true
      const variants = expandToIdsAndLabels(filter.value)
      return !variants.some((v) => v.toLowerCase() === inner.toLowerCase())
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
    case 'between': {
      const lhs = typeof inner === 'number' ? inner : Number(inner)
      const range =
        filter.value && typeof filter.value === 'object' && !Array.isArray(filter.value)
          ? filter.value
          : null
      if (!range || !Number.isFinite(lhs)) return false
      const from = typeof range.from === 'number' ? range.from : Number(range.from)
      const to = typeof range.to === 'number' ? range.to : Number(range.to)
      if (!Number.isFinite(from) || !Number.isFinite(to)) return false
      return lhs >= from && lhs <= to
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
    case 'within': {
      if (typeof inner !== 'string') return false
      const lhs = new Date(inner).getTime()
      const range =
        filter.value && typeof filter.value === 'object' && !Array.isArray(filter.value)
          ? filter.value
          : null
      if (!range) return false
      const from =
        typeof range.from === 'string' ? new Date(range.from).getTime() : NaN
      const to = typeof range.to === 'string' ? new Date(range.to).getTime() : NaN
      if (Number.isNaN(lhs) || Number.isNaN(from) || Number.isNaN(to)) return false
      return lhs >= from && lhs <= to
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
      // Expand each target to its label/id variants for option-backed fields.
      const targets = rawTargets.flatMap((t) =>
        expandToIdsAndLabels(t).map((v) => v.toLowerCase()),
      )
      if (filter.operator === 'contains_any') {
        return targets.some((t) => arr.includes(t))
      }
      return rawTargets.every((rt) =>
        expandToIdsAndLabels(rt)
          .map((v) => v.toLowerCase())
          .some((v) => arr.includes(v)),
      )
    }
    case 'does_not_contain': {
      const arr = Array.isArray(inner)
        ? inner.map((v) => (typeof v === 'string' ? v.toLowerCase() : String(v)))
        : [typeof inner === 'string' ? inner.toLowerCase() : String(inner ?? '')]
      const rawTargets = Array.isArray(filter.value)
        ? filter.value
        : typeof filter.value === 'string'
          ? [filter.value]
          : []
      return rawTargets.every((rt) => {
        const variants = expandToIdsAndLabels(rt).map((v) => v.toLowerCase())
        return variants.every((v) => !arr.includes(v))
      })
    }
    default:
      return true
  }
}

function matchesString(
  value: Json | null | undefined,
  expected: ViewFilter['value'],
  cmp: (a: string, b: string) => boolean,
) {
  if (typeof value !== 'string') return false
  if (typeof expected !== 'string') return false
  return cmp(value.toLowerCase(), expected.toLowerCase())
}

function parseFieldOptionsForFilter(field: CollectionFieldWithType): FieldOption[] {
  return parseFieldOptions(field.options_json)
}

export async function getArchiveDrawerData(workspaceId: string, collectionId: string) {
  const supabase = await createClient()

  const [recordsResult, fieldsResult, viewsResult] = await Promise.all([
    supabase
      .from('collection_records')
      .select('id, title, archived_at, collection_id')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false }),
    supabase
      .from('collection_fields')
      .select('id, name, field_type, archived_at, collection_id')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false }),
    supabase
      .from('views')
      .select('id, name, view_type, archived_at, collection_id')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false }),
  ])

  if (recordsResult.error) throw new Error(recordsResult.error.message)
  if (fieldsResult.error) throw new Error(fieldsResult.error.message)
  if (viewsResult.error) throw new Error(viewsResult.error.message)

  return {
    records: recordsResult.data ?? [],
    fields: fieldsResult.data ?? [],
    views: viewsResult.data ?? [],
  }
}

export function isTextSearchableField(field: CollectionFieldWithType) {
  return isTextShapedType(field.field_type)
}

async function applyFormulasInPlace(
  records: CollectionRecordWithValues[],
  fields: CollectionFieldWithType[],
) {
  const formulaFields = fields.filter((f) => f.field_type === 'formula' && f.formula_json)
  if (formulaFields.length === 0) return

  const { evaluateFormula } = await import('@/lib/databases/formula/evaluate')
  const { topologicallySort } = await import('@/lib/databases/formula/dependency-graph')
  const { parseFormula } = await import('@/lib/databases/formula/grammar')

  type Entry = {
    fieldId: string
    ast: import('@/lib/databases/formula/grammar').FormulaNode
    dependsOn: string[]
  }

  const entries: Entry[] = []
  for (const field of formulaFields) {
    const stored = field.formula_json
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) continue
    const obj = stored as Record<string, unknown>
    const source = typeof obj.source === 'string' ? obj.source : null
    if (!source) continue
    const parsed = parseFormula(source)
    if (!parsed.ok) continue
    entries.push({ fieldId: field.id, ast: parsed.ast, dependsOn: parsed.referencedFieldIds })
  }
  if (entries.length === 0) return

  const { order } = topologicallySort(entries)

  for (const record of records) {
    const ctx: Record<string, string | number | boolean | null> = {}
    for (const [fieldId, raw] of Object.entries(record.values)) {
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
        const inner = (raw as Record<string, Json>).value
        if (
          inner === null ||
          typeof inner === 'string' ||
          typeof inner === 'number' ||
          typeof inner === 'boolean'
        ) {
          ctx[fieldId] = inner
        } else {
          ctx[fieldId] = JSON.stringify(inner)
        }
      }
    }
    for (const entry of order) {
      try {
        const result = evaluateFormula(entry.ast, { fieldValues: ctx })
        ctx[entry.fieldId] = result
        record.values[entry.fieldId] = { value: result as Json }
      } catch {
        record.values[entry.fieldId] = { value: null }
      }
    }
  }
}

// Server-side admin helper for advanced operations that need service role.
export async function loadFieldsAdmin(workspaceId: string, collectionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(castFieldType)
}
