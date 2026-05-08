'use client'

import { useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateChartConfig } from '@/app/databases/actions'
import {
  aggregateChartClient,
  type AggregationKind,
} from '@/lib/databases/aggregations-client'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { SavedViewWithConfig } from '@/lib/views/types'

const CHART_COLORS = [
  '#5645d4', // brand primary
  '#8b7cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

export type ChartViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
}

export function ChartView({ workspaceId, view, fields, records }: ChartViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const cfg = view.config.chart
  const chartType = cfg?.chartType ?? 'bar'
  const xFieldId = cfg?.xFieldId ?? null
  const yFieldId = cfg?.yFieldId ?? null
  const aggregation: AggregationKind = cfg?.aggregation ?? 'count'

  const xCandidates = fields.filter((f) =>
    ['select', 'status', 'multi_select', 'date'].includes(f.field_type),
  )
  const yCandidates = fields.filter((f) => ['number', 'currency'].includes(f.field_type))

  const data = useMemo(
    () =>
      aggregateChartClient({
        records,
        fields,
        xFieldId,
        yFieldId,
        aggregation,
      }),
    [records, fields, xFieldId, yFieldId, aggregation],
  )

  function persist(patch: Partial<NonNullable<typeof cfg>>) {
    startTransition(async () => {
      await updateChartConfig({
        workspaceId,
        viewId: view.id,
        chartType: patch.chartType ?? chartType,
        xFieldId: patch.xFieldId ?? xFieldId,
        yFieldId: patch.yFieldId ?? yFieldId,
        aggregation: patch.aggregation ?? aggregation,
      })
      router.refresh()
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <ConfigPair label="Chart">
          <Select
            value={chartType}
            onValueChange={(v) => persist({ chartType: v as typeof chartType })}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="pie">Pie</SelectItem>
              <SelectItem value="donut">Donut</SelectItem>
            </SelectContent>
          </Select>
        </ConfigPair>
        <ConfigPair label="X axis">
          <Select
            value={xFieldId ?? '__none__'}
            onValueChange={(v) => persist({ xFieldId: v === '__none__' ? null : v })}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Field…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {xCandidates.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigPair>
        <ConfigPair label="Y axis">
          <Select
            value={yFieldId ?? '__none__'}
            onValueChange={(v) => persist({ yFieldId: v === '__none__' ? null : v })}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Field…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Count records</SelectItem>
              {yCandidates.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigPair>
        <ConfigPair label="Aggregation">
          <Select
            value={aggregation}
            onValueChange={(v) => persist({ aggregation: v as AggregationKind })}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="avg">Average</SelectItem>
              <SelectItem value="min">Min</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
        </ConfigPair>
      </div>
      <div className="flex-1 p-4">
        {data.points.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No data yet</EmptyTitle>
                <EmptyDescription>
                  Pick an X axis field, then add records that have a value for it.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(chartType, data.points)}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function ConfigPair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function renderChart(
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut',
  points: { key: string; label: string; value: number; meta?: { color?: string } }[],
) {
  if (chartType === 'bar') {
    return (
      <BarChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value">
          {points.map((p, i) => (
            <Cell key={i} fill={p.meta?.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    )
  }
  if (chartType === 'line') {
    return (
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot />
      </LineChart>
    )
  }
  if (chartType === 'area') {
    return (
      <AreaChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
      </AreaChart>
    )
  }
  // pie / donut
  return (
    <PieChart>
      <Tooltip />
      <Legend />
      <Pie
        data={points}
        dataKey="value"
        nameKey="label"
        innerRadius={chartType === 'donut' ? 60 : 0}
        outerRadius={120}
        label
      >
        {points.map((p, i) => (
          <Cell key={i} fill={p.meta?.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </Pie>
    </PieChart>
  )
}
