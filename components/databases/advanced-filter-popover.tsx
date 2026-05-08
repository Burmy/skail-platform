'use client'

import { useState, useTransition, useMemo } from 'react'
import { FilterIcon, FolderPlusIcon, PlusIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
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
import { updateAdvancedFilters } from '@/app/databases/actions'
import { isFilterGroup, type ViewFilter, type ViewFilterGroup, type ViewFilterOperator } from '@/lib/views/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { PropertyType } from '@/lib/properties/types'

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

export type AdvancedFilterPopoverProps = {
  workspaceId: string
  viewId: string
  fields: CollectionFieldWithType[]
  initialTree: ViewFilterGroup | null
  onLocalChange?: (tree: ViewFilterGroup | null) => void
  persistChanges?: boolean
}

function makeGroup(): ViewFilterGroup {
  return { id: crypto.randomUUID(), conjunction: 'and', children: [] }
}

export function AdvancedFilterPopover(props: AdvancedFilterPopoverProps) {
  const {
    workspaceId,
    viewId,
    fields,
    initialTree,
    onLocalChange,
    persistChanges = true,
  } = props
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [tree, setTree] = useState<ViewFilterGroup>(
    initialTree ?? makeGroup(),
  )

  function persist(next: ViewFilterGroup) {
    setTree(next)
    onLocalChange?.(next.children.length === 0 ? null : next)
    if (!persistChanges) return
    startTransition(async () => {
      await updateAdvancedFilters({
        workspaceId,
        viewId,
        filterTree: next.children.length === 0 ? null : next,
        flatFilters: flattenLeaves(next),
      })
    })
  }

  const filterCount = useMemo(() => countLeaves(tree), [tree])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <FilterIcon className="size-3.5" />
          <span className="text-xs">
            Advanced filter
            {filterCount > 0 ? ` (${filterCount})` : ''}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[520px] p-2">
        <FilterGroupNode
          group={tree}
          fields={fields}
          onChange={(next) => persist(next)}
          isRoot
        />
      </PopoverContent>
    </Popover>
  )
}

function FilterGroupNode({
  group,
  fields,
  onChange,
  isRoot,
}: {
  group: ViewFilterGroup
  fields: CollectionFieldWithType[]
  onChange: (next: ViewFilterGroup) => void
  isRoot?: boolean
}) {
  function setConjunction(c: 'and' | 'or') {
    onChange({ ...group, conjunction: c })
  }
  function addLeaf() {
    const firstField = fields[0]
    if (!firstField) return
    const ops = OPERATORS_BY_TYPE[firstField.field_type] ?? ['contains']
    const leaf: ViewFilter = {
      id: crypto.randomUUID(),
      fieldId: firstField.id,
      operator: ops[0]!,
      value: '',
    }
    onChange({ ...group, children: [...group.children, leaf] })
  }
  function addGroup() {
    onChange({ ...group, children: [...group.children, makeGroup()] })
  }
  function updateChild(idx: number, child: ViewFilter | ViewFilterGroup) {
    const next = [...group.children]
    next[idx] = child
    onChange({ ...group, children: next })
  }
  function removeChild(idx: number) {
    const next = group.children.filter((_, i) => i !== idx)
    onChange({ ...group, children: next })
  }

  return (
    <div className={cn('flex flex-col gap-1.5 rounded-md', isRoot ? '' : 'border bg-muted/30 p-2')}>
      <div className="flex items-center justify-between gap-1">
        <Select value={group.conjunction} onValueChange={(v) => setConjunction(v as 'and' | 'or')}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">All of</SelectItem>
            <SelectItem value="or">Any of</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{group.children.length} item(s)</span>
      </div>
      <ul className="flex flex-col gap-1">
        {group.children.map((child, idx) => (
          <li key={isFilterGroup(child) ? child.id : child.id} className="flex items-center gap-1">
            {isFilterGroup(child) ? (
              <div className="flex-1">
                <FilterGroupNode
                  group={child}
                  fields={fields}
                  onChange={(next) => updateChild(idx, next)}
                />
              </div>
            ) : (
              <FilterLeafNode
                leaf={child}
                fields={fields}
                onChange={(next) => updateChild(idx, next)}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => removeChild(idx)}
              aria-label="Remove"
            >
              <XIcon className="size-3" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={addLeaf} className="gap-1">
          <PlusIcon className="size-3.5" />
          <span className="text-xs">Add filter</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={addGroup} className="gap-1">
          <FolderPlusIcon className="size-3.5" />
          <span className="text-xs">Add group</span>
        </Button>
      </div>
    </div>
  )
}

function FilterLeafNode({
  leaf,
  fields,
  onChange,
}: {
  leaf: ViewFilter
  fields: CollectionFieldWithType[]
  onChange: (next: ViewFilter) => void
}) {
  const field = fields.find((f) => f.id === leaf.fieldId)
  const ops = field
    ? OPERATORS_BY_TYPE[field.field_type]
    : DEFAULT_FILTER_OPERATORS
  const showValueInput =
    leaf.operator !== 'is_empty' &&
    leaf.operator !== 'is_not_empty' &&
    leaf.operator !== 'is_checked' &&
    leaf.operator !== 'is_not_checked' &&
    leaf.operator !== 'has_value'

  return (
    <div className="flex flex-1 items-center gap-1">
      <Select
        value={leaf.fieldId}
        onValueChange={(v) => {
          const newField = fields.find((x) => x.id === v)
          const newOps = newField
            ? OPERATORS_BY_TYPE[newField.field_type]
            : DEFAULT_FILTER_OPERATORS
          onChange({ ...leaf, fieldId: v, operator: newOps[0]!, value: '' })
        }}
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
        value={leaf.operator}
        onValueChange={(v) => onChange({ ...leaf, operator: v as ViewFilterOperator })}
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
        <Input
          value={typeof leaf.value === 'string' ? leaf.value : ''}
          onChange={(e) => onChange({ ...leaf, value: e.target.value })}
          className="h-7 text-xs"
          placeholder="Value"
        />
      ) : (
        <span className="flex-1" />
      )}
    </div>
  )
}

function flattenLeaves(group: ViewFilterGroup): ViewFilter[] {
  const out: ViewFilter[] = []
  for (const child of group.children) {
    if (isFilterGroup(child)) out.push(...flattenLeaves(child))
    else out.push(child)
  }
  return out
}

function countLeaves(group: ViewFilterGroup): number {
  return flattenLeaves(group).length
}
