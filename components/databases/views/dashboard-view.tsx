'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3Icon,
  GripVerticalIcon,
  ListIcon,
  Maximize2Icon,
  Minimize2Icon,
  PlusIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { updateDashboardBlocks } from '@/app/databases/actions'
import { aggregateChartClient, aggregateKpiClient } from '@/lib/databases/aggregations-client'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { DashboardBlock, SavedViewWithConfig } from '@/lib/views/types'

import { DashboardTemplatesPopover } from '../dashboard-templates-popover'

const CHART_COLORS = [
  '#5645d4',
  '#8b7cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

export type DashboardViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  titleFieldId: string | null
  onOpenRecord: (recordId: string) => void
}

export function DashboardView(props: DashboardViewProps) {
  const { workspaceId, view, fields, records, titleFieldId, onOpenRecord } = props
  const router = useRouter()
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const blocks: DashboardBlock[] = useMemo(
    () => view.config.dashboard?.blocks ?? [],
    [view.config.dashboard],
  )

  function persist(next: DashboardBlock[]) {
    startTransition(async () => {
      await updateDashboardBlocks({ workspaceId, viewId: view.id, blocks: next })
      router.refresh()
    })
  }

  function addBlock(type: DashboardBlock['type']) {
    const next: DashboardBlock = {
      id: crypto.randomUUID(),
      type,
      title: defaultTitle(type),
      layout: {
        x: 0,
        y: blocks.reduce((max, b) => Math.max(max, b.layout.y + b.layout.h), 0),
        w: type === 'kpi' ? 3 : type === 'status_count' ? 6 : 6,
        h: type === 'list' ? 4 : 3,
      },
      aggregation: type === 'kpi' ? 'count' : undefined,
    }
    persist([...blocks, next])
  }

  function removeBlock(id: string) {
    persist(blocks.filter((b) => b.id !== id))
  }

  function updateBlock(id: string, patch: Partial<DashboardBlock>) {
    persist(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    persist(arrayMove(blocks, oldIdx, newIdx))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">Dashboard</span>
        <div className="flex items-center gap-1">
          <DashboardTemplatesPopover
            workspaceId={workspaceId}
            viewId={view.id}
            currentBlocks={blocks}
          />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1">
              <PlusIcon className="size-3.5" />
              <span className="text-xs">Add block</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => addBlock('kpi')}>
              <TrendingUpIcon className="size-3.5" />
              KPI
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addBlock('status_count')}>
              <BarChart3Icon className="size-3.5" />
              Status count
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addBlock('chart')}>
              <BarChart3Icon className="size-3.5" />
              Chart
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addBlock('list')}>
              <ListIcon className="size-3.5" />
              List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {blocks.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>Empty dashboard</EmptyTitle>
              <EmptyDescription>
                Add a KPI, status count, chart, or list block to get started.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-12 gap-3">
                {blocks.map((block) => (
                  <DashboardBlockCard
                    key={block.id}
                    block={block}
                    fields={fields}
                    records={records}
                    titleFieldId={titleFieldId}
                    onOpenRecord={onOpenRecord}
                    onRemove={() => removeBlock(block.id)}
                    onUpdate={(patch) => updateBlock(block.id, patch)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

function defaultTitle(type: DashboardBlock['type']) {
  switch (type) {
    case 'kpi':
      return 'KPI'
    case 'status_count':
      return 'Status'
    case 'chart':
      return 'Chart'
    case 'list':
      return 'Recent records'
  }
}

function DashboardBlockCard({
  block,
  fields,
  records,
  titleFieldId,
  onOpenRecord,
  onRemove,
  onUpdate,
}: {
  block: DashboardBlock
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  titleFieldId: string | null
  onOpenRecord: (id: string) => void
  onRemove: () => void
  onUpdate: (patch: Partial<DashboardBlock>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const colSpan = Math.min(Math.max(block.layout.w, 1), 12)
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        gridColumn: `span ${colSpan} / span ${colSpan}`,
      }}
      className="rounded-lg border bg-background"
    >
      <div className="flex items-center justify-between border-b px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground"
            aria-label="Reorder block"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
          <span className="text-xs font-medium">{block.title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() =>
              onUpdate({ layout: { ...block.layout, w: Math.max(block.layout.w - 3, 3) } })
            }
            aria-label="Shrink"
          >
            <Minimize2Icon className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() =>
              onUpdate({ layout: { ...block.layout, w: Math.min(block.layout.w + 3, 12) } })
            }
            aria-label="Grow"
          >
            <Maximize2Icon className="size-3" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="size-6" aria-label="Configure">
                <BarChart3Icon className="size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2 p-3">
              <BlockConfig block={block} fields={fields} onUpdate={onUpdate} />
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove"
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        {block.type === 'kpi' ? (
          <KpiBlock block={block} fields={fields} records={records} />
        ) : null}
        {block.type === 'status_count' ? (
          <StatusBlock block={block} fields={fields} records={records} />
        ) : null}
        {block.type === 'chart' ? (
          <ChartBlock block={block} fields={fields} records={records} />
        ) : null}
        {block.type === 'list' ? (
          <ListBlock block={block} records={records} onOpenRecord={onOpenRecord} />
        ) : null}
      </div>
    </div>
  )
}

function BlockConfig({
  block,
  fields,
  onUpdate,
}: {
  block: DashboardBlock
  fields: CollectionFieldWithType[]
  onUpdate: (patch: Partial<DashboardBlock>) => void
}) {
  if (block.type === 'kpi') {
    const numericFields = fields.filter((f) => ['number', 'currency'].includes(f.field_type))
    return (
      <div className="space-y-2">
        <ConfigRow label="Field">
          <Select
            value={block.fieldId ?? '__none__'}
            onValueChange={(v) => onUpdate({ fieldId: v === '__none__' ? null : v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Records" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Count records</SelectItem>
              {numericFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigRow>
        <ConfigRow label="Aggregation">
          <Select
            value={block.aggregation ?? 'count'}
            onValueChange={(v) => onUpdate({ aggregation: v as DashboardBlock['aggregation'] })}
          >
            <SelectTrigger className="h-7 text-xs">
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
        </ConfigRow>
      </div>
    )
  }
  if (block.type === 'status_count') {
    const groupableFields = fields.filter((f) =>
      ['select', 'status', 'multi_select'].includes(f.field_type),
    )
    return (
      <ConfigRow label="Field">
        <Select
          value={block.fieldId ?? '__none__'}
          onValueChange={(v) => onUpdate({ fieldId: v === '__none__' ? null : v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {groupableFields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfigRow>
    )
  }
  if (block.type === 'chart') {
    const chart = block.chart ?? { chartType: 'bar' as const, xFieldId: null, yFieldId: null, aggregation: 'count' as const }
    const xCandidates = fields.filter((f) =>
      ['select', 'status', 'multi_select', 'date'].includes(f.field_type),
    )
    const yCandidates = fields.filter((f) => ['number', 'currency'].includes(f.field_type))
    return (
      <div className="space-y-2">
        <ConfigRow label="Type">
          <Select
            value={chart.chartType}
            onValueChange={(v) => onUpdate({ chart: { ...chart, chartType: v as 'bar' } })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="pie">Pie</SelectItem>
              <SelectItem value="donut">Donut</SelectItem>
              <SelectItem value="area">Area</SelectItem>
            </SelectContent>
          </Select>
        </ConfigRow>
        <ConfigRow label="X axis">
          <Select
            value={chart.xFieldId ?? '__none__'}
            onValueChange={(v) =>
              onUpdate({ chart: { ...chart, xFieldId: v === '__none__' ? null : v } })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Field" />
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
        </ConfigRow>
        <ConfigRow label="Y axis">
          <Select
            value={chart.yFieldId ?? '__none__'}
            onValueChange={(v) =>
              onUpdate({ chart: { ...chart, yFieldId: v === '__none__' ? null : v } })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Records" />
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
        </ConfigRow>
        <ConfigRow label="Aggregation">
          <Select
            value={chart.aggregation}
            onValueChange={(v) => onUpdate({ chart: { ...chart, aggregation: v as 'count' } })}
          >
            <SelectTrigger className="h-7 text-xs">
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
        </ConfigRow>
      </div>
    )
  }
  return null
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="w-40">{children}</div>
    </div>
  )
}

function KpiBlock({
  block,
  fields,
  records,
}: {
  block: DashboardBlock
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
}) {
  const result = aggregateKpiClient({
    records,
    fields,
    fieldId: block.fieldId ?? null,
    aggregation: block.aggregation ?? 'count',
  })
  const formatted = Number.isFinite(result.value)
    ? Math.round(result.value * 100) / 100
    : 0
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-semibold tabular-nums">{formatted}</span>
      <span className="text-xs text-muted-foreground">
        {result.field?.name ?? 'records'}
      </span>
    </div>
  )
}

function StatusBlock({
  block,
  fields,
  records,
}: {
  block: DashboardBlock
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
}) {
  const data = aggregateChartClient({
    records,
    fields,
    xFieldId: block.fieldId ?? null,
    yFieldId: null,
    aggregation: 'count',
  })
  if (!block.fieldId || data.points.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Pick a select / status field to break down by.
      </p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data.points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value">
          {data.points.map((p, i) => (
            <Cell key={i} fill={p.meta?.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartBlock({
  block,
  fields,
  records,
}: {
  block: DashboardBlock
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
}) {
  const c = block.chart
  if (!c) return <p className="text-xs text-muted-foreground">Configure the chart axis fields.</p>
  const data = aggregateChartClient({
    records,
    fields,
    xFieldId: c.xFieldId,
    yFieldId: c.yFieldId ?? null,
    aggregation: c.aggregation,
  })
  if (data.points.length === 0) {
    return <p className="text-xs text-muted-foreground">No data for this configuration.</p>
  }
  if (c.chartType === 'pie' || c.chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Tooltip />
          <Pie
            data={data.points}
            dataKey="value"
            nameKey="label"
            innerRadius={c.chartType === 'donut' ? 50 : 0}
            outerRadius={80}
          >
            {data.points.map((p, i) => (
              <Cell key={i} fill={p.meta?.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data.points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill={CHART_COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ListBlock({
  block,
  records,
  onOpenRecord,
}: {
  block: DashboardBlock
  records: CollectionRecordWithValues[]
  onOpenRecord: (id: string) => void
}) {
  const top = records.slice(0, 8)
  return (
    <ul className="divide-y">
      {top.map((record) => (
        <li
          key={record.id}
          onClick={() => onOpenRecord(record.id)}
          className="cursor-pointer truncate px-1 py-1.5 text-sm hover:bg-accent/40"
        >
          {record.title ?? 'Untitled'}
        </li>
      ))}
      {top.length === 0 ? (
        <li className="px-1 py-2 text-xs text-muted-foreground">No records.</li>
      ) : null}
    </ul>
  )
}
