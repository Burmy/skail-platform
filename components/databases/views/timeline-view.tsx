'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { moveTimelineRecord, updateTimelineConfig } from '@/app/databases/actions'
import { newClientRequestId } from '@/lib/databases/realtime'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { SavedViewWithConfig } from '@/lib/views/types'

export type TimelineViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  titleFieldId: string | null
  onOpenRecord: (recordId: string) => void
}

type Mode = 'days' | 'weeks' | 'months' | 'quarters'

const MODE_TO_DAYS: Record<Mode, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  quarters: 90,
}

const COLUMN_PX: Record<Mode, number> = {
  days: 64,
  weeks: 80,
  months: 120,
  quarters: 200,
}

function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateValue(record: CollectionRecordWithValues, fieldId: string | null) {
  if (!fieldId) return null
  const raw = record.values[fieldId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('value' in raw)) return null
  const inner = (raw as Record<string, Json>).value
  if (typeof inner !== 'string') return null
  const d = new Date(inner)
  return Number.isNaN(d.getTime()) ? null : d
}

function diffDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

function addDays(d: Date, days: number) {
  const out = new Date(d)
  out.setDate(d.getDate() + days)
  return out
}

export function TimelineView(props: TimelineViewProps) {
  const { workspaceId, view, fields, records, onOpenRecord } = props
  const router = useRouter()
  const [, startTransition] = useTransition()

  const cfg = view.config.timeline
  const startFieldId = cfg?.startFieldId ?? null
  const endFieldId = cfg?.endFieldId ?? null
  const mode: Mode = cfg?.mode ?? 'weeks'
  const dateFields = fields.filter((f) => f.field_type === 'date')

  const [originDate] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() - 14)
    today.setHours(0, 0, 0, 0)
    return today
  })

  const totalDays = 120
  const colDays = MODE_TO_DAYS[mode]
  const colPx = COLUMN_PX[mode]
  const dayPx = colPx / colDays
  const totalCols = Math.ceil(totalDays / colDays)

  const items = useMemo(() => {
    if (!startFieldId) return []
    return records
      .map((record) => {
        const start = dateValue(record, startFieldId)
        if (!start) return null
        const end = endFieldId ? dateValue(record, endFieldId) : null
        const startOffsetDays = Math.max(diffDays(start, originDate), 0)
        const endDate = end ?? addDays(start, 1)
        const span = Math.max(diffDays(endDate, start), 1)
        return { record, startDate: start, endDate, startOffsetDays, span }
      })
      .filter(Boolean) as Array<{
      record: CollectionRecordWithValues
      startDate: Date
      endDate: Date
      startOffsetDays: number
      span: number
    }>
  }, [records, startFieldId, endFieldId, originDate])

  function persistConfig(patch: Partial<NonNullable<typeof cfg>>) {
    startTransition(async () => {
      await updateTimelineConfig({
        workspaceId,
        viewId: view.id,
        startFieldId: patch.startFieldId ?? startFieldId,
        endFieldId: patch.endFieldId ?? endFieldId,
        mode: patch.mode ?? mode,
        groupFieldId: patch.groupFieldId ?? cfg?.groupFieldId ?? null,
      })
      router.refresh()
    })
  }

  function handleBarDrop(recordId: string, daysOffset: number) {
    if (!startFieldId) return
    startTransition(async () => {
      const item = items.find((it) => it.record.id === recordId)
      if (!item) return
      const newStart = addDays(item.startDate, daysOffset)
      const newEnd = addDays(item.endDate, daysOffset)
      await moveTimelineRecord({
        workspaceId,
        viewId: view.id,
        recordId,
        newStart: ymd(newStart),
        newEnd: endFieldId ? ymd(newEnd) : undefined,
        clientRequestId: newClientRequestId(),
      })
      router.refresh()
    })
  }

  if (!startFieldId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Pick a start date field to drive the timeline.
        </p>
        {dateFields.length > 0 ? (
          <Select onValueChange={(v) => persistConfig({ startFieldId: v })}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Start date field…" />
            </SelectTrigger>
            <SelectContent>
              {dateFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a date property to a record to enable the timeline.
          </p>
        )}
      </div>
    )
  }

  const totalWidth = totalCols * colPx + 240

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Start</span>
          <Select value={startFieldId} onValueChange={(v) => persistConfig({ startFieldId: v })}>
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">End</span>
          <Select
            value={endFieldId ?? '__none__'}
            onValueChange={(v) => persistConfig({ endFieldId: v === '__none__' ? null : v })}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {dateFields.filter((f) => f.id !== startFieldId).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={mode} onValueChange={(v) => persistConfig({ mode: v as Mode })}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="days">Days</SelectItem>
            <SelectItem value="weeks">Weeks</SelectItem>
            <SelectItem value="months">Months</SelectItem>
            <SelectItem value="quarters">Quarters</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-auto">
        <div style={{ width: totalWidth }}>
          <div className="sticky top-0 z-10 flex border-b bg-background">
            <div className="w-[240px] border-r px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Record
            </div>
            <div className="flex">
              {Array.from({ length: totalCols }, (_, i) => {
                const colDate = addDays(originDate, i * colDays)
                return (
                  <div
                    key={i}
                    className="border-r px-1.5 py-1.5 text-xs text-muted-foreground"
                    style={{ width: colPx }}
                  >
                    {colDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <ul className="flex flex-col">
            {items.map((it) => (
              <TimelineRow
                key={it.record.id}
                record={it.record}
                startOffsetDays={it.startOffsetDays}
                spanDays={it.span}
                dayPx={dayPx}
                colPx={colPx}
                totalCols={totalCols}
                onOpen={() => onOpenRecord(it.record.id)}
                onBarDrop={(daysOffset) => handleBarDrop(it.record.id, daysOffset)}
              />
            ))}
            {items.length === 0 ? (
              <li className="px-3 py-12 text-center text-sm text-muted-foreground">
                No records have a start date.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  )
}

function TimelineRow({
  record,
  startOffsetDays,
  spanDays,
  dayPx,
  colPx,
  totalCols,
  onOpen,
  onBarDrop,
}: {
  record: CollectionRecordWithValues
  startOffsetDays: number
  spanDays: number
  dayPx: number
  colPx: number
  totalCols: number
  onOpen: () => void
  onBarDrop: (daysOffset: number) => void
}) {
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragOffsetDays, setDragOffsetDays] = useState(0)

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    setDragStartX(e.clientX)
    setDragOffsetDays(0)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartX === null) return
    const deltaPx = e.clientX - dragStartX
    setDragOffsetDays(Math.round(deltaPx / dayPx))
  }
  function handlePointerUp() {
    if (dragStartX !== null && dragOffsetDays !== 0) {
      onBarDrop(dragOffsetDays)
    }
    setDragStartX(null)
    setDragOffsetDays(0)
  }

  const left = (startOffsetDays + dragOffsetDays) * dayPx
  const width = spanDays * dayPx

  return (
    <li className="flex border-b">
      <div
        className="w-[240px] cursor-pointer truncate border-r px-2 py-2 text-sm hover:bg-accent/30"
        onClick={onOpen}
      >
        {record.title ?? 'Untitled'}
      </div>
      <div className="relative" style={{ width: totalCols * colPx, height: 36 }}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={(e) => {
            if (Math.abs(dragOffsetDays) === 0) {
              e.stopPropagation()
              onOpen()
            }
          }}
          className={cn(
            'absolute top-1.5 cursor-grab rounded-md bg-primary/80 px-2 py-1 text-xs text-primary-foreground shadow-sm hover:bg-primary',
            dragStartX !== null && 'cursor-grabbing opacity-80',
          )}
          style={{ left, width: Math.max(width, 32) }}
        >
          <span className="truncate">{record.title ?? 'Untitled'}</span>
        </div>
      </div>
    </li>
  )
}
