'use client'

import { useState, useTransition } from 'react'
import { FilterIcon, PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { updateViewFilters } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type {
  ViewFilter,
  ViewFilterOperator,
  ViewFilterValue,
} from '@/lib/views/types'
import type { PropertyType } from '@/lib/properties/types'
import { parseFieldOptions } from '@/lib/properties/types'

const DEFAULT_FILTER_OPERATORS: readonly ViewFilterOperator[] = ['contains']

const OPERATORS_BY_TYPE: Record<PropertyType, readonly ViewFilterOperator[]> = {
  text: ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  long_text: ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty'],
  currency: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty'],
  select: ['is', 'is_not', 'is_empty', 'is_not_empty'],
  status: ['is', 'is_not', 'is_empty', 'is_not_empty'],
  multi_select: ['contains_any', 'contains_all', 'is_empty', 'is_not_empty'],
  date: ['before', 'after', 'on', 'within', 'is_empty', 'is_not_empty'],
  checkbox: ['is_checked', 'is_not_checked'],
  url: ['contains', 'has_value', 'is_empty'],
  email: ['contains', 'has_value', 'is_empty'],
  phone: ['contains', 'has_value', 'is_empty'],
  file: ['has_value', 'is_empty'],
  person: ['contains_any', 'contains_all', 'is_empty'],
  relation: ['contains', 'does_not_contain', 'is_empty'],
  formula: ['contains', 'equals', 'is_empty'],
  formula_placeholder: ['is_empty', 'is_not_empty'],
  location: ['has_value', 'is_empty'],
}

const OPERATOR_LABELS: Record<ViewFilterOperator, string> = {
  contains: 'contains',
  not_contains: 'does not contain',
  equals: 'equals',
  not_equals: 'does not equal',
  starts_with: 'starts with',
  ends_with: 'ends with',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
  before: 'before',
  after: 'after',
  on: 'on',
  within: 'within',
  is: 'is',
  is_not: 'is not',
  contains_any: 'contains any of',
  contains_all: 'contains all of',
  does_not_contain: 'does not contain',
  is_checked: 'is checked',
  is_not_checked: 'is unchecked',
  has_value: 'has value',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

export type FilterPopoverProps = {
  workspaceId: string
  viewId: string
  fields: CollectionFieldWithType[]
  initialFilters: ViewFilter[]
  onLocalChange?: (filters: ViewFilter[]) => void
  persistChanges?: boolean
}

export function FilterPopover(props: FilterPopoverProps) {
  const {
    workspaceId,
    viewId,
    fields,
    initialFilters,
    onLocalChange,
    persistChanges = true,
  } = props
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<ViewFilter[]>(initialFilters)
  const [, startTransition] = useTransition()

  function persist(next: ViewFilter[]) {
    setFilters(next)
    onLocalChange?.(next)
    if (!persistChanges) return
    startTransition(async () => {
      await updateViewFilters({ workspaceId, viewId, filters: next })
    })
  }

  function addFilter() {
    const firstField = fields[0]
    if (!firstField) return
    const ops = OPERATORS_BY_TYPE[firstField.field_type] ?? DEFAULT_FILTER_OPERATORS
    const next: ViewFilter = {
      id: crypto.randomUUID(),
      fieldId: firstField.id,
      operator: ops[0]!,
      value: '',
    }
    persist([...filters, next])
  }

  function updateFilter(id: string, patch: Partial<ViewFilter>) {
    const next = filters.map((f) => {
      if (f.id !== id) return f
      // If field changes, reset operator to a valid one
      if (patch.fieldId && patch.fieldId !== f.fieldId) {
        const newField = fields.find((x) => x.id === patch.fieldId)
        const ops = newField
          ? OPERATORS_BY_TYPE[newField.field_type]
          : DEFAULT_FILTER_OPERATORS
        return { ...f, ...patch, operator: ops[0]!, value: '' as ViewFilterValue }
      }
      return { ...f, ...patch }
    })
    persist(next)
  }

  function removeFilter(id: string) {
    persist(filters.filter((f) => f.id !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <FilterIcon className="size-3.5" />
          <span className="text-xs">
            Filter
            {filters.length > 0 ? ` (${filters.length})` : ''}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-2">
        <div className="flex flex-col gap-2">
          {filters.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No filters yet. Add one to narrow the view.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filters.map((filter) => {
                const field = fields.find((f) => f.id === filter.fieldId)
                const ops = field
                  ? OPERATORS_BY_TYPE[field.field_type]
                  : DEFAULT_FILTER_OPERATORS
                const showValueInput =
                  filter.operator !== 'is_empty' &&
                  filter.operator !== 'is_not_empty' &&
                  filter.operator !== 'is_checked' &&
                  filter.operator !== 'is_not_checked' &&
                  filter.operator !== 'has_value'
                return (
                  <div key={filter.id} className="flex items-center gap-1">
                    <Select
                      value={filter.fieldId}
                      onValueChange={(v) => updateFilter(filter.id, { fieldId: v })}
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
                      value={filter.operator}
                      onValueChange={(v) =>
                        updateFilter(filter.id, { operator: v as ViewFilterOperator })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ops.map((op) => (
                          <SelectItem key={op} value={op}>
                            {OPERATOR_LABELS[op]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showValueInput ? (
                      field &&
                      (field.field_type === 'select' ||
                        field.field_type === 'status' ||
                        field.field_type === 'multi_select') ? (
                        <Select
                          value={typeof filter.value === 'string' ? filter.value : ''}
                          onValueChange={(v) =>
                            updateFilter(filter.id, { value: v })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Pick option" />
                          </SelectTrigger>
                          <SelectContent>
                            {parseFieldOptions(field.options_json).map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field?.field_type === 'date' ? (
                        <Input
                          type="date"
                          value={typeof filter.value === 'string' ? filter.value : ''}
                          onChange={(e) =>
                            updateFilter(filter.id, { value: e.target.value })
                          }
                          className="h-7 text-xs"
                        />
                      ) : field?.field_type === 'number' ||
                        field?.field_type === 'currency' ? (
                        <Input
                          type="number"
                          value={
                            typeof filter.value === 'string' ||
                            typeof filter.value === 'number'
                              ? String(filter.value)
                              : ''
                          }
                          onChange={(e) =>
                            updateFilter(filter.id, {
                              value:
                                e.target.value === ''
                                  ? ''
                                  : Number(e.target.value),
                            })
                          }
                          className="h-7 text-xs"
                          placeholder="Value"
                        />
                      ) : (
                        <Input
                          value={typeof filter.value === 'string' ? filter.value : ''}
                          onChange={(e) =>
                            updateFilter(filter.id, { value: e.target.value })
                          }
                          className="h-7 text-xs"
                          placeholder="Value"
                        />
                      )
                    ) : (
                      <span className="flex-1" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => removeFilter(filter.id)}
                      aria-label="Remove filter"
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addFilter}
            className="justify-start gap-1"
          >
            <PlusIcon className="size-3.5" />
            <span className="text-xs">Add filter</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
