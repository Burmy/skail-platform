'use client'

import { useState, useTransition } from 'react'
import { ArrowDownAZIcon, ArrowUpAZIcon, PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateViewSorts } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { ViewSort } from '@/lib/views/types'

export type SortPopoverProps = {
  workspaceId: string
  viewId: string
  fields: CollectionFieldWithType[]
  initialSorts: ViewSort[]
  onLocalChange?: (sorts: ViewSort[]) => void
  persistChanges?: boolean
}

export function SortPopover(props: SortPopoverProps) {
  const {
    workspaceId,
    viewId,
    fields,
    initialSorts,
    onLocalChange,
    persistChanges = true,
  } = props
  const [open, setOpen] = useState(false)
  const [sorts, setSorts] = useState<ViewSort[]>(initialSorts)
  const [, startTransition] = useTransition()

  function persist(next: ViewSort[]) {
    setSorts(next)
    onLocalChange?.(next)
    if (!persistChanges) return
    startTransition(async () => {
      await updateViewSorts({ workspaceId, viewId, sorts: next })
    })
  }

  function addSort() {
    const firstField = fields[0]
    if (!firstField) return
    persist([
      ...sorts,
      { id: crypto.randomUUID(), fieldId: firstField.id, direction: 'asc' },
    ])
  }

  function update(id: string, patch: Partial<ViewSort>) {
    persist(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: string) {
    persist(sorts.filter((s) => s.id !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <ArrowDownAZIcon className="size-3.5" />
          <span className="text-xs">
            Sort
            {sorts.length > 0 ? ` (${sorts.length})` : ''}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="flex flex-col gap-2">
          {sorts.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No sorts yet. Sort precedence is top-down.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sorts.map((sort) => (
                <div key={sort.id} className="flex items-center gap-1">
                  <Select
                    value={sort.fieldId}
                    onValueChange={(v) => update(sort.id, { fieldId: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={sort.direction}
                    onValueChange={(v) =>
                      update(sort.id, { direction: v as 'asc' | 'desc' })
                    }
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => remove(sort.id)}
                    aria-label="Remove sort"
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addSort}
            className="justify-start gap-1"
          >
            <PlusIcon className="size-3.5" />
            <span className="text-xs">Add sort</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
