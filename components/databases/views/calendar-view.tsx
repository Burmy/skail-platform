'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createRecordInline,
  rescheduleCalendarRecord,
  updateCalendarConfig,
  updateRecordField,
} from '@/app/databases/actions'
import { newClientRequestId } from '@/lib/databases/realtime'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { SavedViewWithConfig } from '@/lib/views/types'

import type { RecordMutators } from '../hooks/use-optimistic-records'

export type CalendarViewProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  mutators?: RecordMutators
  titleFieldId: string | null
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  onOpenRecord: (recordId: string) => void
}

type Mode = 'month' | 'week' | 'day'

function dateValueOf(record: CollectionRecordWithValues, fieldId: string) {
  const raw = record.values[fieldId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('value' in raw)) return null
  const inner = (raw as Record<string, Json>).value
  if (typeof inner !== 'string') return null
  const d = new Date(inner)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function startOfWeek(d: Date) {
  const day = d.getDay() // 0 = Sun
  const out = new Date(d)
  out.setDate(d.getDate() - day)
  out.setHours(0, 0, 0, 0)
  return out
}
function addDays(d: Date, days: number) {
  const out = new Date(d)
  out.setDate(d.getDate() + days)
  return out
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView(props: CalendarViewProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    records,
    mutators,
    titleFieldId,
    readOnly = false,
    canConfigureView = true,
    pageId,
    onOpenRecord,
  } = props
  const router = useRouter()
  const [, startTransition] = useTransition()

  const dateFieldId = view.config.calendar.dateFieldId
  const initialMode = view.config.calendar.defaultMode ?? 'month'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [cursor, setCursor] = useState<Date>(new Date())

  const dateFields = fields.filter((f) => f.field_type === 'date')

  const recordsByDay = useMemo(() => {
    if (!dateFieldId) return new Map<string, CollectionRecordWithValues[]>()
    const map = new Map<string, CollectionRecordWithValues[]>()
    for (const record of records) {
      const date = dateValueOf(record, dateFieldId)
      if (!date) continue
      const key = ymd(date)
      const list = map.get(key) ?? []
      list.push(record)
      map.set(key, list)
    }
    return map
  }, [dateFieldId, records])

  function setDateField(fieldId: string | null) {
    if (!canConfigureView) return
    startTransition(async () => {
      await updateCalendarConfig({
        workspaceId,
        viewId: view.id,
        dateFieldId: fieldId,
        defaultMode: mode,
      })
      router.refresh()
    })
  }

  function changeMode(next: Mode) {
    if (!canConfigureView) {
      setMode(next)
      return
    }
    setMode(next)
    startTransition(async () => {
      await updateCalendarConfig({
        workspaceId,
        viewId: view.id,
        dateFieldId,
        defaultMode: next,
      })
    })
  }

  function step(direction: 1 | -1) {
    if (mode === 'month') {
      setCursor((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1))
    } else if (mode === 'week') {
      setCursor((d) => addDays(d, 7 * direction))
    } else {
      setCursor((d) => addDays(d, direction))
    }
  }

  function reschedule(recordId: string, day: Date) {
    if (!dateFieldId || readOnly) return
    // Optimistic update so the event jumps to the new day instantly.
    mutators?.setFieldValue(recordId, dateFieldId, ymd(day))
    startTransition(async () => {
      await rescheduleCalendarRecord({
        workspaceId,
        viewId: view.id,
        recordId,
        newDate: ymd(day),
        clientRequestId: newClientRequestId(),
        pageId,
      })
    })
  }

  function createOnDay(day: Date) {
    if (!dateFieldId || readOnly) return
    startTransition(async () => {
      const result = await createRecordInline({
        workspaceId,
        collectionId,
        seedTitle: 'Untitled',
        pageId,
      })
      if (result.ok && result.data) {
        await updateRecordField({
          workspaceId,
          recordId: result.data.id,
          fieldId: dateFieldId,
          value: ymd(day),
          clientRequestId: newClientRequestId(),
          pageId,
        })
        router.refresh()
      }
    })
  }

  if (!dateFieldId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Pick a date field to drive the calendar.
        </p>
        {dateFields.length > 0 ? (
          <Select onValueChange={setDateField} disabled={!canConfigureView}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Date field…" />
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
            Add a date property to a record to enable the calendar.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => step(-1)}>
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => step(1)}>
            <ChevronRightIcon className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <span className="ml-2 text-sm font-medium">{cursorLabel(cursor, mode)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={dateFieldId}
            onValueChange={setDateField}
            disabled={!canConfigureView}
          >
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
          <Select value={mode} onValueChange={(v) => changeMode(v as Mode)}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {mode === 'month' ? (
          <MonthGrid
            cursor={cursor}
            recordsByDay={recordsByDay}
            fields={fields}
            visibleFieldIds={view.config.visibleFieldIds}
            titleFieldId={titleFieldId}
            dateFieldId={dateFieldId}
            onOpenRecord={onOpenRecord}
            onCreateOnDay={createOnDay}
            onReschedule={reschedule}
            readOnly={readOnly}
          />
        ) : mode === 'week' ? (
          <WeekGrid
            cursor={cursor}
            recordsByDay={recordsByDay}
            fields={fields}
            visibleFieldIds={view.config.visibleFieldIds}
            titleFieldId={titleFieldId}
            dateFieldId={dateFieldId}
            onOpenRecord={onOpenRecord}
            onCreateOnDay={createOnDay}
            onReschedule={reschedule}
            readOnly={readOnly}
          />
        ) : (
          <DayList
            cursor={cursor}
            recordsByDay={recordsByDay}
            fields={fields}
            visibleFieldIds={view.config.visibleFieldIds}
            titleFieldId={titleFieldId}
            dateFieldId={dateFieldId}
            workspaceId={workspaceId}
            onOpenRecord={onOpenRecord}
            onCreateOnDay={createOnDay}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  )
}

function CalendarEventChip({
  record,
  fields,
  visibleFieldIds,
  titleFieldId,
  dateFieldId,
}: {
  record: CollectionRecordWithValues
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  titleFieldId: string | null
  dateFieldId: string
  workspaceId: string
}) {
  const visibleSet = new Set(
    visibleFieldIds.length > 0 ? visibleFieldIds : fields.map((f) => f.id),
  )
  const previewFields = fields
    .filter(
      (f) =>
        visibleSet.has(f.id) &&
        f.id !== titleFieldId &&
        f.id !== dateFieldId &&
        f.field_type !== 'long_text',
    )
    .slice(0, 2)
  return (
    <>
      <span className="block truncate font-medium">
        {record.title ?? 'Untitled'}
      </span>
      {previewFields.map((f) => {
        const raw = record.values[f.id]
        let display = '—'
        if (
          raw &&
          typeof raw === 'object' &&
          !Array.isArray(raw) &&
          'value' in raw
        ) {
          const v = (raw as Record<string, unknown>).value
          if (v !== null && v !== undefined) {
            if (Array.isArray(v)) display = v.length > 0 ? v.join(', ') : '—'
            else if (typeof v === 'object') display = '—'
            else display = String(v) || '—'
          }
        }
        return (
          <span
            key={f.id}
            className="block truncate text-[10px] text-muted-foreground"
          >
            {f.name}: {display}
          </span>
        )
      })}
    </>
  )
}

function cursorLabel(cursor: Date, mode: Mode) {
  if (mode === 'month') {
    return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  if (mode === 'week') {
    const start = startOfWeek(cursor)
    const end = addDays(start, 6)
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function MonthGrid({
  cursor,
  recordsByDay,
  fields,
  visibleFieldIds,
  titleFieldId,
  dateFieldId,
  onOpenRecord,
  onCreateOnDay,
  onReschedule,
  readOnly,
}: {
  cursor: Date
  recordsByDay: Map<string, CollectionRecordWithValues[]>
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  titleFieldId: string | null
  dateFieldId: string
  onOpenRecord: (id: string) => void
  onCreateOnDay: (day: Date) => void
  onReschedule: (recordId: string, day: Date) => void
  readOnly: boolean
}) {
  const monthStart = startOfMonth(cursor)
  const gridStart = startOfWeek(monthStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const today = new Date()

  return (
    <div className="grid grid-cols-7 border-l border-t">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="border-b border-r bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground"
        >
          {label}
        </div>
      ))}
      {days.map((day) => {
        const inMonth = day.getMonth() === cursor.getMonth()
        const key = ymd(day)
        const items = recordsByDay.get(key) ?? []
        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const recordId = e.dataTransfer.getData('text/plain')
              if (recordId) onReschedule(recordId, day)
            }}
            className={cn(
              'group relative flex min-h-[6rem] flex-col gap-0.5 border-b border-r p-1.5 text-xs',
              !inMonth && 'bg-muted/20 text-muted-foreground',
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-xs',
                  sameDay(day, today) && 'bg-foreground text-background',
                )}
              >
                {day.getDate()}
              </span>
            <button
              type="button"
              onClick={() => onCreateOnDay(day)}
              className={cn(
                'opacity-0 transition-opacity group-hover:opacity-100',
                readOnly && 'hidden',
              )}
              aria-label="Create record"
            >
                <PlusIcon className="size-3" />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {items.slice(0, 3).map((record) => (
                <li
                  key={record.id}
                  draggable={!readOnly}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                  onClick={() => onOpenRecord(record.id)}
                  className="cursor-grab rounded-sm bg-background px-1.5 py-0.5 text-foreground hover:bg-accent"
                >
                  <CalendarEventChip
                    record={record}
                    fields={fields}
                    visibleFieldIds={visibleFieldIds}
                    titleFieldId={titleFieldId}
                    dateFieldId={dateFieldId}
                    workspaceId=""
                  />
                </li>
              ))}
              {items.length > 3 ? (
                <li className="text-[10px] text-muted-foreground">
                  +{items.length - 3} more
                </li>
              ) : null}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function WeekGrid({
  cursor,
  recordsByDay,
  fields,
  visibleFieldIds,
  titleFieldId,
  dateFieldId,
  onOpenRecord,
  onCreateOnDay,
  onReschedule,
  readOnly,
}: {
  cursor: Date
  recordsByDay: Map<string, CollectionRecordWithValues[]>
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  titleFieldId: string | null
  dateFieldId: string
  onOpenRecord: (id: string) => void
  onCreateOnDay: (day: Date) => void
  onReschedule: (recordId: string, day: Date) => void
  readOnly: boolean
}) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="grid grid-cols-7 border-l border-t">
      {days.map((day) => (
        <div
          key={ymd(day)}
          className="border-b border-r bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground"
        >
          {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
        </div>
      ))}
      {days.map((day) => {
        const items = recordsByDay.get(ymd(day)) ?? []
        return (
          <div
            key={`col-${ymd(day)}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const recordId = e.dataTransfer.getData('text/plain')
              if (recordId) onReschedule(recordId, day)
            }}
            className="group min-h-[24rem] border-b border-r p-1.5"
          >
            <button
              type="button"
              onClick={() => onCreateOnDay(day)}
              className={cn(
                'mb-1 flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent/40',
                readOnly && 'hidden',
              )}
            >
              <PlusIcon className="size-3" />
              New
            </button>
            <ul className="flex flex-col gap-1">
              {items.map((record) => (
                <li
                  key={record.id}
                  draggable={!readOnly}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', record.id)}
                  onClick={() => onOpenRecord(record.id)}
                  className="cursor-grab rounded-sm border bg-background px-1.5 py-1 text-xs hover:bg-accent"
                >
                  <CalendarEventChip
                    record={record}
                    fields={fields}
                    visibleFieldIds={visibleFieldIds}
                    titleFieldId={titleFieldId}
                    dateFieldId={dateFieldId}
                    workspaceId=""
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function DayList({
  cursor,
  recordsByDay,
  fields,
  visibleFieldIds,
  titleFieldId,
  dateFieldId,
  workspaceId,
  onOpenRecord,
  onCreateOnDay,
  readOnly,
}: {
  cursor: Date
  recordsByDay: Map<string, CollectionRecordWithValues[]>
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  titleFieldId: string | null
  dateFieldId: string
  workspaceId: string
  onOpenRecord: (id: string) => void
  onCreateOnDay: (day: Date) => void
  readOnly: boolean
}) {
  const items = recordsByDay.get(ymd(cursor)) ?? []
  return (
    <div className="flex flex-col gap-2 p-4">
      {!readOnly ? (
        <Button size="sm" variant="ghost" className="self-start gap-1" onClick={() => onCreateOnDay(cursor)}>
          <PlusIcon className="size-3.5" />
          New record
        </Button>
      ) : null}
      <ul className="divide-y rounded-md border">
        {items.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing scheduled for this day.
          </li>
        ) : (
          items.map((record) => (
            <li
              key={record.id}
              onClick={() => onOpenRecord(record.id)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent/40"
            >
              <CalendarEventChip
                record={record}
                fields={fields}
                visibleFieldIds={visibleFieldIds}
                titleFieldId={titleFieldId}
                dateFieldId={dateFieldId}
                workspaceId={workspaceId}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
