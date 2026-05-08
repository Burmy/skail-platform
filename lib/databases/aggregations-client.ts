// Pure aggregation logic for chart and dashboard blocks.
// Mirrors the SSR version in aggregations.ts but consumes already-loaded records,
// so it can be called from client components without server-only constraints.

import { parseFieldOptions, type PropertyType } from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'

export type AggregationKind = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type AggregationPoint = {
  key: string
  label: string
  value: number
  meta?: { color?: string }
}

export type ChartAggregation = {
  field: { id: string; name: string; field_type: PropertyType } | null
  yField: { id: string; name: string; field_type: PropertyType } | null
  aggregation: AggregationKind
  total: number
  points: AggregationPoint[]
}

function unwrap(json: Json | null | undefined) {
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

export function aggregateChartClient(input: {
  records: CollectionRecordWithValues[]
  fields: CollectionFieldWithType[]
  xFieldId: string | null
  yFieldId: string | null
  aggregation: AggregationKind
}): ChartAggregation {
  const xField = input.fields.find((f) => f.id === input.xFieldId) ?? null
  const yField = input.fields.find((f) => f.id === input.yFieldId) ?? null

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

  function ensure(key: string, label: string, color?: string) {
    const existing = points.get(key)
    if (existing) return existing
    const p: AggregationPoint = { key, label, value: 0, meta: color ? { color } : undefined }
    points.set(key, p)
    return p
  }

  for (const record of input.records) {
    const xRaw = unwrap(record.values[xField?.id ?? ''] ?? null)
    const yRaw = unwrap(record.values[yField?.id ?? ''] ?? null)

    let buckets: { key: string; label: string; color?: string }[] = []
    if (!xField) {
      buckets = [{ key: 'total', label: 'Total' }]
    } else if (xField.field_type === 'date') {
      const day = dayBucket(xRaw)
      if (day) buckets = [{ key: day, label: day }]
    } else if (xField.field_type === 'multi_select' && Array.isArray(xRaw)) {
      buckets = xRaw
        .filter((v): v is string => typeof v === 'string')
        .map((id) => optionLabelById.get(id) ?? { label: id })
        .map((m) => ({ key: m.label, label: m.label, color: m.color }))
    } else {
      const id = typeof xRaw === 'string' ? xRaw : xRaw === null || xRaw === undefined ? null : String(xRaw)
      if (id !== null) {
        const opt = optionLabelById.get(id)
        buckets = [{ key: opt?.label ?? id, label: opt?.label ?? id, color: opt?.color }]
      } else {
        buckets = [{ key: '__empty__', label: 'No value' }]
      }
    }

    for (const bucket of buckets) {
      const point = ensure(bucket.key, bucket.label, bucket.color)
      if (input.aggregation === 'count' || !yField) {
        point.value += 1
        continue
      }
      const yNum = typeof yRaw === 'number' ? yRaw : Number(yRaw)
      if (!Number.isFinite(yNum)) continue
      switch (input.aggregation) {
        case 'sum':
          point.value += yNum
          break
        case 'avg':
          sumPerKey.set(bucket.key, (sumPerKey.get(bucket.key) ?? 0) + yNum)
          countPerKey.set(bucket.key, (countPerKey.get(bucket.key) ?? 0) + 1)
          point.value =
            (sumPerKey.get(bucket.key) ?? 0) / (countPerKey.get(bucket.key) ?? 1)
          break
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

export function aggregateKpiClient(input: {
  records: CollectionRecordWithValues[]
  fields: CollectionFieldWithType[]
  fieldId: string | null
  aggregation: AggregationKind
}) {
  const result = aggregateChartClient({
    records: input.records,
    fields: input.fields,
    xFieldId: null,
    yFieldId: input.fieldId,
    aggregation: input.aggregation,
  })
  return { value: result.total, field: result.field }
}
