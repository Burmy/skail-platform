'use client'

import { useState, useTransition, useMemo } from 'react'
import { Columns3Icon, EyeIcon, EyeOffIcon, GripVerticalIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { updateViewFieldLayout } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'

export type PropertyVisibilityPopoverProps = {
  workspaceId: string
  viewId: string
  fields: CollectionFieldWithType[]
  initialVisibleFieldIds: string[]
  initialFieldOrder: string[]
  onLocalChange?: (visibleFieldIds: string[], fieldOrder: string[]) => void
  persistChanges?: boolean
}

export function PropertyVisibilityPopover(props: PropertyVisibilityPopoverProps) {
  const {
    workspaceId,
    viewId,
    fields,
    initialVisibleFieldIds,
    initialFieldOrder,
    onLocalChange,
    persistChanges = true,
  } = props
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const orderedIds = useMemo(() => {
    const known = new Set(fields.map((f) => f.id))
    const ordered = initialFieldOrder.filter((id) => known.has(id))
    const missing = fields.filter((f) => !ordered.includes(f.id)).map((f) => f.id)
    return [...ordered, ...missing]
  }, [fields, initialFieldOrder])

  const [order, setOrder] = useState<string[]>(orderedIds)
  const [visible, setVisible] = useState<Set<string>>(
    new Set(initialVisibleFieldIds.length > 0 ? initialVisibleFieldIds : fields.map((f) => f.id)),
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function persist(nextOrder: string[], nextVisible: Set<string>) {
    const visibleArr = Array.from(nextVisible)
    onLocalChange?.(visibleArr, nextOrder)
    if (!persistChanges) return
    startTransition(async () => {
      await updateViewFieldLayout({
        workspaceId,
        viewId,
        visibleFieldIds: visibleArr,
        fieldOrder: nextOrder,
      })
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)
    persist(next, visible)
  }

  function toggle(fieldId: string) {
    const next = new Set(visible)
    if (next.has(fieldId)) next.delete(fieldId)
    else next.add(fieldId)
    setVisible(next)
    persist(order, next)
  }

  function setAll(vis: boolean) {
    const next = new Set<string>(vis ? fields.map((f) => f.id) : [])
    setVisible(next)
    persist(order, next)
  }

  const filtered = order.filter((id) => {
    const f = fields.find((x) => x.id === id)
    if (!f) return false
    return f.name.toLowerCase().includes(filter.toLowerCase())
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <Columns3Icon className="size-3.5" />
          <span className="text-xs">Properties</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="flex flex-col gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search property…"
            className="h-7 text-xs"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Shown in view</span>
            <button
              type="button"
              className="hover:underline"
              onClick={() => setAll(visible.size === fields.length ? false : true)}
            >
              {visible.size === fields.length ? 'Hide all' : 'Show all'}
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-0.5">
                {filtered.map((fieldId) => {
                  const field = fields.find((f) => f.id === fieldId)
                  if (!field) return null
                  return (
                    <PropertyRow
                      key={fieldId}
                      field={field}
                      visible={visible.has(fieldId)}
                      onToggle={() => toggle(fieldId)}
                    />
                  )
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PropertyRow({
  field,
  visible,
  onToggle,
}: {
  field: CollectionFieldWithType
  visible: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="flex items-center gap-1 rounded-sm px-1 py-1 text-sm hover:bg-accent/40"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
        aria-label="Reorder"
      >
        <GripVerticalIcon className="size-3.5" />
      </button>
      <span className="flex-1 truncate">{field.name}</span>
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide' : 'Show'}
      >
        {visible ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
      </button>
    </li>
  )
}
