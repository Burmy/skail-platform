import 'server-only'

import type { Json } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import { parseFieldOptions, type PropertyType } from '@/lib/properties/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'

export type AggregationKind = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type AggregationPoint = {
  key: string
  label: string
  value: number
  meta?: { color?: string }
}

export type AggregationResult = {
  field: { id: string; name: string; field_type: PropertyType } | null
  yField: { id: string; name: string; field_type: PropertyType } | null
  aggregation: AggregationKind
  total: number
  points: AggregationPoint[]
}

function unwrap(json: Json | null): Json | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const inner = (json as Record<string, Json>).value
  return inner ?? null
}

function dayBucket(value: unknown) {
  if (typeof value !== 'string') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function ensurePoint(map: Map<string, AggregationPoint>, key: string, label: string, color?: string) {
  const existing = map.get(key)
  if (existing) return existing
  const next: AggregationPoint = { key, label, value: 0, meta: color ? { color } : undefined }
  map.set(key, next)
  return next
}

// Compute a chart aggregate for the active record set.
// All aggregation runs in app server code over the in-memory record values; for Phase 2 this
// is fine for sub-5k record collections. Phase 1.5 server pushdown can replace this later.
export async function aggregateChart(input: {
  workspaceId: string
  collectionId: string
  fields: CollectionFieldWithType[]
  xFieldId: string | null
  yFieldId: string | null
  aggregation: AggregationKind
}): Promise<AggregationResult> {
  const supabase = await createClient()
  const xField = input.fields.find((f) => f.id === input.xFieldId) ?? null
  const yField = input.fields.find((f) => f.id === input.yFieldId) ?? null

  const { data: records } = await supabase
    .from('collection_records')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('collection_id', input.collectionId)
    .is('archived_at', null)
    .limit(5000)

  const recordIds = (records ?? []).map((r) => r.id)
  if (recordIds.length === 0) {
    return {
      field: xField ? { id: xField.id, name: xField.name, field_type: xField.field_type } : null,
      yField: yField ? { id: yField.id, name: yField.name, field_type: yField.field_type } : null,
      aggregation: input.aggregation,
      total: 0,
      points: [],
    }
  }

  const fieldIdsToLoad = [xField?.id, yField?.id].filter((id): id is string => Boolean(id))
  const { data: values } = fieldIdsToLoad.length > 0
    ? await supabase
        .from('record_values')
        .select('record_id, field_id, value_json')
        .eq('workspace_id', input.workspaceId)
        .in('record_id', recordIds)
        .in('field_id', fieldIdsToLoad)
    : { data: [] }

  const byRecord = new Map<string, Record<string, Json | null>>()
  for (const v of values ?? []) {
    if (!v.record_id || !v.field_id) continue
    const m = byRecord.get(v.record_id) ?? {}
    m[v.field_id] = v.value_json ?? null
    byRecord.set(v.record_id, m)
  }

  const optionLabelById = new Map<string, { label: string; color?: string }>()
  if (xField && (xField.field_type === 'select' || xField.field_type === 'multi_select' || xField.field_type === 'status')) {
    for (const opt of parseFieldOptions(xField.options_json)) {
      optionLabelById.set(opt.id, { label: opt.label, color: opt.color })
      optionLabelById.set(opt.label, { label: opt.label, color: opt.color })
    }
  }

  const points = new Map<string, AggregationPoint>()
  const sumPerKey = new Map<string, number>()
  const countPerKey = new Map<string, number>()
  const minPerKey = new Map<string, number>()
  const maxPerKey = new Map<string, number>()

  for (const recordId of recordIds) {
    const vals = byRecord.get(recordId) ?? {}
    const xRaw = unwrap(vals[xField?.id ?? ''] ?? null)
    const yRaw = unwrap(vals[yField?.id ?? ''] ?? null)

    let bucketKeys: { key: string; label: string; color?: string }[] = []
    if (!xField) {
      bucketKeys = [{ key: 'total', label: 'Total' }]
    } else if (xField.field_type === 'date') {
      const day = dayBucket(xRaw)
      if (day) bucketKeys = [{ key: day, label: day }]
    } else if (xField.field_type === 'multi_select' && Array.isArray(xRaw)) {
      bucketKeys = xRaw
        .filter((v): v is string => typeof v === 'string')
        .map((id) => optionLabelById.get(id) ?? { label: id })
        .map((m) => ({ key: m.label, label: m.label, color: m.color }))
    } else {
      const id = typeof xRaw === 'string' ? xRaw : xRaw === null || xRaw === undefined ? null : String(xRaw)
      if (id !== null) {
        const opt = optionLabelById.get(id)
        bucketKeys = [{ key: opt?.label ?? id, label: opt?.label ?? id, color: opt?.color }]
      } else {
        bucketKeys = [{ key: '__empty__', label: 'No value' }]
      }
    }

    for (const bucket of bucketKeys) {
      const point = ensurePoint(points, bucket.key, bucket.label, bucket.color)

      if (input.aggregation === 'count' || !yField) {
        point.value += 1
        continue
      }

      const yNum = typeof yRaw === 'number' ? yRaw : Number(yRaw)
      if (!Number.isFinite(yNum)) continue
      switch (input.aggregation) {
        case 'sum': {
          point.value += yNum
          break
        }
        case 'avg': {
          sumPerKey.set(bucket.key, (sumPerKey.get(bucket.key) ?? 0) + yNum)
          countPerKey.set(bucket.key, (countPerKey.get(bucket.key) ?? 0) + 1)
          point.value =
            (sumPerKey.get(bucket.key) ?? 0) / (countPerKey.get(bucket.key) ?? 1)
          break
        }
        case 'min': {
          const cur = minPerKey.get(bucket.key)
          const next = cur === undefined ? yNum : Math.min(cur, yNum)
          minPerKey.set(bucket.key, next)
          point.value = next
          break
        }
        case 'max': {
          const cur = maxPerKey.get(bucket.key)
          const next = cur === undefined ? yNum : Math.max(cur, yNum)
          maxPerKey.set(bucket.key, next)
          point.value = next
          break
        }
      }
    }
  }

  const sorted = Array.from(points.values()).sort((a, b) => a.label.localeCompare(b.label))
  const total = sorted.reduce((sum, p) => sum + p.value, 0)

  return {
    field: xField ? { id: xField.id, name: xField.name, field_type: xField.field_type } : null,
    yField: yField ? { id: yField.id, name: yField.name, field_type: yField.field_type } : null,
    aggregation: input.aggregation,
    total,
    points: sorted,
  }
}

// Aggregate of records grouped by a status/select field used by the dashboard "status_count" block.
export async function aggregateStatusCount(input: {
  workspaceId: string
  collectionId: string
  fields: CollectionFieldWithType[]
  fieldId: string
}): Promise<AggregationResult> {
  return aggregateChart({
    workspaceId: input.workspaceId,
    collectionId: input.collectionId,
    fields: input.fields,
    xFieldId: input.fieldId,
    yFieldId: null,
    aggregation: 'count',
  })
}

// Single-number KPI: total count or sum/avg/min/max over a numeric field.
export async function aggregateKpi(input: {
  workspaceId: string
  collectionId: string
  fields: CollectionFieldWithType[]
  fieldId: string | null
  aggregation: AggregationKind
}): Promise<{ value: number; field: AggregationResult['field'] }> {
  const result = await aggregateChart({
    workspaceId: input.workspaceId,
    collectionId: input.collectionId,
    fields: input.fields,
    xFieldId: null,
    yFieldId: input.fieldId,
    aggregation: input.aggregation,
  })
  return { value: result.total, field: result.field }
}
