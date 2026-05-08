'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Settings2Icon, FileTextIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateListConfig } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { SavedViewWithConfig } from '@/lib/views/types'

import { FieldCell } from '../field-cell'

export type ListViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  titleFieldId: string | null
  onOpenRecord: (recordId: string) => void
}

export function ListView(props: ListViewProps) {
  const { workspaceId, view, fields, records, titleFieldId, onOpenRecord } = props
  const [, startTransition] = useTransition()

  const cfg = view.config.list
  const computedDefault = useMemo(
    () =>
      fields
        .filter((f) => f.id !== titleFieldId && f.field_type !== 'long_text')
        .slice(0, 3)
        .map((f) => f.id),
    [fields, titleFieldId],
  )

  const [showFieldIds, setShowFieldIds] = useState<string[]>(
    cfg?.showFieldIds && cfg.showFieldIds.length > 0
      ? cfg.showFieldIds
      : computedDefault,
  )
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    cfg?.density ?? 'comfortable',
  )

  // Reseed when the view changes (e.g. switched view tab)
  useEffect(() => {
    setShowFieldIds(
      cfg?.showFieldIds && cfg.showFieldIds.length > 0
        ? cfg.showFieldIds
        : computedDefault,
    )
    setDensity(cfg?.density ?? 'comfortable')
  }, [view.id])

  function persist(nextShow: string[], nextDensity: 'comfortable' | 'compact') {
    startTransition(async () => {
      await updateListConfig({
        workspaceId,
        viewId: view.id,
        showFieldIds: nextShow,
        iconFieldId: cfg?.iconFieldId ?? null,
        density: nextDensity,
      })
    })
  }

  function toggleField(fieldId: string) {
    const next = showFieldIds.includes(fieldId)
      ? showFieldIds.filter((id) => id !== fieldId)
      : [...showFieldIds, fieldId]
    setShowFieldIds(next)
    persist(next, density)
  }

  function changeDensity(next: 'comfortable' | 'compact') {
    setDensity(next)
    persist(showFieldIds, next)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">List</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1">
              <Settings2Icon className="size-3.5" />
              <span className="text-xs">Layout</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Density</span>
                <Select
                  value={density}
                  onValueChange={(v) => changeDensity(v as 'comfortable' | 'compact')}
                >
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-2">
                <p className="mb-1.5 text-xs text-muted-foreground">Inline fields</p>
                <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
                  {fields
                    .filter((f) => f.id !== titleFieldId)
                    .map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center gap-2 rounded-sm px-1 py-1 text-xs hover:bg-accent/40"
                      >
                        <Checkbox
                          checked={showFieldIds.includes(f.id)}
                          onCheckedChange={() => toggleField(f.id)}
                        />
                        <span className="flex-1 truncate">{f.name}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y">
          {records.map((record) => (
            <li
              key={record.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3 transition-colors hover:bg-accent/30',
                density === 'compact' ? 'py-1.5' : 'py-2.5',
              )}
              onClick={() => onOpenRecord(record.id)}
            >
              <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-medium">
                {record.title ?? 'Untitled'}
              </span>
              <div
                className="flex shrink-0 items-center gap-3"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {showFieldIds
                  .map((id) => fields.find((f) => f.id === id))
                  .filter((f): f is CollectionFieldWithType => Boolean(f))
                  .map((f) => (
                    <div key={f.id} className="text-xs text-muted-foreground">
                      <FieldCell
                        workspaceId={workspaceId}
                        field={f}
                        record={record}
                        isReadOnly
                        onSave={async () => ({ ok: true })}
                      />
                    </div>
                  ))}
              </div>
            </li>
          ))}
          {records.length === 0 ? (
            <li className="px-3 py-12 text-center text-sm text-muted-foreground">
              No records yet.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
