'use client'

import { useMemo, useState } from 'react'
import {
  CheckIcon,
  ExternalLinkIcon,
  FileIcon,
  FunctionSquareIcon,
  MapPinIcon,
  Paperclip,
  UserIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  parseFieldOptions,
  type CollectionRecordWithValues,
  type FieldOption,
  type LocationValue,
  type PropertyType,
} from '@/lib/properties/types'
import type { CollectionField, Json } from '@/lib/supabase/database.types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'

import { useCellAutosave, type AutosaveState } from './hooks/use-cell-autosave'
import { FileEditor } from './field-editors/file-editor'
import { PersonEditor } from './field-editors/person-editor'
import { RelationEditor } from './field-editors/relation-editor'
import { FormulaEditor } from './field-editors/formula-editor'
import { LocationEditor } from './field-editors/location-editor'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type FieldWithType = CollectionField & { field_type: PropertyType }

export type FieldCellProps = {
  field: FieldWithType
  record: CollectionRecordWithValues
  workspaceId: string
  onSave: (
    fieldId: string,
    value: unknown,
    clientRequestId: string,
  ) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
  onOpenRecord?: () => void
  allFields?: CollectionFieldWithType[]
  suppressRefresh?: boolean
}

function extractValue(values: CollectionRecordWithValues['values'], fieldId: string): Json | null {
  const raw = values[fieldId]
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    const inner = (raw as Record<string, Json>).value
    return inner ?? null
  }
  return null
}

function SaveDot({ state }: { state: AutosaveState }) {
  if (state === 'idle' || state === 'saved') return null
  return (
    <span
      className={cn(
        'pointer-events-none absolute right-1 top-1 size-1.5 rounded-full',
        state === 'saving' && 'bg-muted-foreground animate-pulse',
        state === 'error' && 'bg-destructive',
      )}
      aria-hidden
    />
  )
}

export function FieldCell(props: FieldCellProps) {
  const { field, record, isReadOnly, onSave, className } = props
  const initialValue = useMemo(() => extractValue(record.values, field.id), [record.values, field.id])

  const onSaveImpl = async (next: unknown, crq: string) => onSave(field.id, next, crq)

  switch (field.field_type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return (
        <TextCell
          field={field}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
          onOpenRecord={props.onOpenRecord}
        />
      )
    case 'long_text':
      return (
        <LongTextCell
          field={field}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    case 'number':
    case 'currency':
      return (
        <NumberCell
          field={field}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    case 'checkbox':
      return (
        <CheckboxCell
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    case 'date':
      return (
        <DateCell
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    case 'select':
    case 'status':
      return (
        <SelectCell
          field={field}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
          workspaceId={props.workspaceId}
        />
      )
    case 'multi_select':
      return (
        <MultiSelectCell
          field={field}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
          workspaceId={props.workspaceId}
        />
      )
    case 'file':
      return (
        <FileEditor
          workspaceId={props.workspaceId}
          recordId={record.id}
          fieldId={field.id}
          isReadOnly={isReadOnly}
          className={className}
          suppressRefresh={props.suppressRefresh}
        />
      )
    case 'person':
      return (
        <PersonEditor
          workspaceId={props.workspaceId}
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    case 'relation':
      return (
        <RelationEditor
          workspaceId={props.workspaceId}
          recordId={record.id}
          fieldId={field.id}
          isReadOnly={isReadOnly}
          className={className}
          suppressRefresh={props.suppressRefresh}
        />
      )
    case 'formula':
    case 'formula_placeholder':
      return (
        <FormulaEditor
          workspaceId={props.workspaceId}
          field={field as CollectionFieldWithType}
          fields={props.allFields ?? []}
          isReadOnly={isReadOnly}
          className={className}
          computedValue={record.values[field.id] ?? null}
          suppressRefresh={props.suppressRefresh}
        />
      )
    case 'location':
      return (
        <LocationEditor
          initial={initialValue}
          onSave={onSaveImpl}
          isReadOnly={isReadOnly}
          className={className}
        />
      )
    default:
      return <span className={cn('text-muted-foreground', className)}>—</span>
  }
}

// ---------------------------------------------------------------------------
// Text-shaped cells (text, url, email, phone)
// ---------------------------------------------------------------------------

function TextCell({
  field,
  initial,
  onSave,
  isReadOnly,
  className,
  onOpenRecord,
}: {
  field: FieldWithType
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
  onOpenRecord?: () => void
}) {
  const initialString = typeof initial === 'string' ? initial : ''
  const autosave = useCellAutosave<string>(initialString, { onSave })
  const inputType =
    field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : field.field_type === 'phone' ? 'tel' : 'text'

  if (isReadOnly) {
    return <span className={cn('truncate', className)}>{autosave.value || ''}</span>
  }

  const isTitle = field.semantic_role === 'title'

  return (
    <div className={cn('relative w-full', className)}>
      {isTitle && onOpenRecord ? (
        <button
          type="button"
          onClick={onOpenRecord}
          className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
          title="Open record"
          aria-label="Open record"
        >
          <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
        </button>
      ) : null}
      <Input
        type={inputType}
        value={autosave.value}
        onChange={(e) => autosave.change(e.target.value)}
        onBlur={autosave.blur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') autosave.blur()
        }}
        className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:bg-accent/40 focus-visible:rounded-sm px-1.5 text-sm"
        aria-label={field.name}
      />
      <SaveDot state={autosave.state} />
    </div>
  )
}

function LongTextCell({
  field,
  initial,
  onSave,
  isReadOnly,
  className,
}: {
  field: FieldWithType
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}) {
  const initialString = typeof initial === 'string' ? initial : ''
  const autosave = useCellAutosave<string>(initialString, { onSave })

  if (isReadOnly) {
    return <span className={cn('truncate', className)}>{autosave.value || ''}</span>
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Textarea
        value={autosave.value}
        onChange={(e) => autosave.change(e.target.value)}
        onBlur={autosave.blur}
        rows={1}
        className="min-h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:bg-accent/40 px-1.5 text-sm resize-none"
        aria-label={field.name}
      />
      <SaveDot state={autosave.state} />
    </div>
  )
}

function NumberCell({
  field,
  initial,
  onSave,
  isReadOnly,
  className,
}: {
  field: FieldWithType
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}) {
  const initialNumber = typeof initial === 'number' ? String(initial) : ''
  const autosave = useCellAutosave<string>(initialNumber, {
    onSave: (val, crq) => onSave(val === '' ? null : Number(val), crq),
  })

  if (isReadOnly) {
    const display = autosave.value === '' ? '' : field.field_type === 'currency' ? `$${autosave.value}` : autosave.value
    return <span className={cn('text-right tabular-nums', className)}>{display}</span>
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        type="number"
        inputMode="decimal"
        value={autosave.value}
        onChange={(e) => autosave.change(e.target.value)}
        onBlur={autosave.blur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') autosave.blur()
        }}
        className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:bg-accent/40 px-1.5 text-sm tabular-nums text-right"
        aria-label={field.name}
      />
      <SaveDot state={autosave.state} />
    </div>
  )
}

function CheckboxCell({
  initial,
  onSave,
  isReadOnly,
  className,
}: {
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}) {
  const initialBool = initial === true
  const autosave = useCellAutosave<boolean>(initialBool, {
    onSave,
    immediate: true,
  })

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Checkbox
        checked={autosave.value}
        disabled={isReadOnly}
        onCheckedChange={(next) => autosave.change(next === true)}
      />
      <SaveDot state={autosave.state} />
    </div>
  )
}

function DateCell({
  initial,
  onSave,
  isReadOnly,
  className,
}: {
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
}) {
  const initialDate =
    typeof initial === 'string' && initial.length > 0 ? initial.slice(0, 10) : ''
  const autosave = useCellAutosave<string>(initialDate, {
    onSave: (val, crq) => onSave(val === '' ? null : val, crq),
    immediate: true,
  })

  if (isReadOnly) {
    return <span className={cn('text-sm', className)}>{autosave.value}</span>
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        type="date"
        value={autosave.value}
        onChange={(e) => autosave.change(e.target.value)}
        className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:bg-accent/40 px-1.5 text-sm"
      />
      <SaveDot state={autosave.state} />
    </div>
  )
}

function optionByValue(options: FieldOption[], value: unknown) {
  if (typeof value !== 'string') return null
  return options.find((o) => o.id === value || o.label === value) ?? null
}

function SelectCell({
  field,
  initial,
  onSave,
  isReadOnly,
  className,
  workspaceId,
}: {
  field: FieldWithType
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
  workspaceId: string
}) {
  const options = useMemo(() => parseFieldOptions(field.options_json), [field.options_json])
  const initialValue = typeof initial === 'string' ? initial : null
  const autosave = useCellAutosave<string | null>(initialValue, {
    onSave,
    immediate: true,
  })

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState('')
  const [pending, setPending] = useState(false)
  const selected = autosave.value ? optionByValue(options, autosave.value) : null

  async function handleCreateOption(label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    if (options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())) {
      const existing = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())!
      autosave.change(existing.id)
      setCreating('')
      setOpen(false)
      return
    }
    setPending(true)
    try {
      const fd = new FormData()
      fd.set('workspaceId', workspaceId)
      fd.set('collectionId', field.collection_id ?? '')
      fd.set('fieldId', field.id)
      fd.set('optionLabel', trimmed)
      const { addFieldOption } = await import('@/app/databases/actions')
      await addFieldOption({ status: 'idle' }, fd)
      // Optimistically: we don't know the new id, so let parent refresh. The cell remains visible.
      const { useRouter } = await import('next/navigation')
      void useRouter
      window.dispatchEvent(new CustomEvent('skail:refresh-records'))
      setCreating('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            {selected ? (
              <Badge variant="secondary" className="font-normal">
                {selected.label}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1.5">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                autosave.change(null)
                setOpen(false)
              }}
            >
              <span className="text-muted-foreground">Clear</span>
              {autosave.value === null ? <CheckIcon className="size-3.5" /> : null}
            </button>
            {options
              .filter((o) =>
                creating
                  ? o.label.toLowerCase().includes(creating.toLowerCase())
                  : true,
              )
              .map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    autosave.change(opt.id)
                    setOpen(false)
                  }}
                >
                  <Badge variant="secondary" className="font-normal">
                    {opt.label}
                  </Badge>
                  {autosave.value === opt.id ? <CheckIcon className="size-3.5" /> : null}
                </button>
              ))}
            {!isReadOnly ? (
              <div className="mt-1 border-t pt-1">
                <Input
                  value={creating}
                  onChange={(e) => setCreating(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleCreateOption(creating)
                    }
                  }}
                  placeholder="+ Add option"
                  disabled={pending}
                  className="h-7 text-xs"
                />
                {creating.trim() &&
                !options.some(
                  (o) => o.label.toLowerCase() === creating.trim().toLowerCase(),
                ) ? (
                  <button
                    type="button"
                    onClick={() => void handleCreateOption(creating)}
                    disabled={pending}
                    className="mt-1 flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent"
                  >
                    Create &ldquo;{creating.trim()}&rdquo;
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <SaveDot state={autosave.state} />
    </div>
  )
}

function MultiSelectCell({
  field,
  initial,
  onSave,
  isReadOnly,
  className,
  workspaceId,
}: {
  field: FieldWithType
  initial: Json | null
  onSave: (next: unknown, crq: string) => Promise<{ ok: boolean; error?: string }>
  isReadOnly?: boolean
  className?: string
  workspaceId: string
}) {
  const options = useMemo(() => parseFieldOptions(field.options_json), [field.options_json])
  const initialList = Array.isArray(initial) ? (initial.filter((v) => typeof v === 'string') as string[]) : []
  const autosave = useCellAutosave<string[]>(initialList, {
    onSave,
    immediate: true,
  })
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState('')
  const [pending, setPending] = useState(false)
  const selected = autosave.value
    .map((id) => options.find((o) => o.id === id || o.label === id))
    .filter((o): o is FieldOption => Boolean(o))

  function toggle(optionId: string) {
    const next = autosave.value.includes(optionId)
      ? autosave.value.filter((id) => id !== optionId)
      : [...autosave.value, optionId]
    autosave.change(next)
  }

  async function handleCreateOption(label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    if (options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())) {
      const existing = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())!
      if (!autosave.value.includes(existing.id)) toggle(existing.id)
      setCreating('')
      return
    }
    setPending(true)
    try {
      const fd = new FormData()
      fd.set('workspaceId', workspaceId)
      fd.set('collectionId', field.collection_id ?? '')
      fd.set('fieldId', field.id)
      fd.set('optionLabel', trimmed)
      const { addFieldOption } = await import('@/app/databases/actions')
      await addFieldOption({ status: 'idle' }, fd)
      window.dispatchEvent(new CustomEvent('skail:refresh-records'))
      setCreating('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full flex-wrap items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            {selected.length > 0 ? (
              selected.map((opt) => (
                <Badge key={opt.id} variant="secondary" className="font-normal">
                  {opt.label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1.5">
          <div className="flex flex-col gap-0.5">
            {options
              .filter((o) =>
                creating
                  ? o.label.toLowerCase().includes(creating.toLowerCase())
                  : true,
              )
              .map((opt) => {
                const checked = autosave.value.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => toggle(opt.id)}
                  >
                    <Badge variant="secondary" className="font-normal">
                      {opt.label}
                    </Badge>
                    {checked ? <CheckIcon className="size-3.5" /> : null}
                  </button>
                )
              })}
            {!isReadOnly ? (
              <div className="mt-1 border-t pt-1">
                <Input
                  value={creating}
                  onChange={(e) => setCreating(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleCreateOption(creating)
                    }
                  }}
                  placeholder="+ Add option"
                  disabled={pending}
                  className="h-7 text-xs"
                />
                {creating.trim() &&
                !options.some(
                  (o) => o.label.toLowerCase() === creating.trim().toLowerCase(),
                ) ? (
                  <button
                    type="button"
                    onClick={() => void handleCreateOption(creating)}
                    disabled={pending}
                    className="mt-1 flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-xs hover:bg-accent"
                  >
                    Create &ldquo;{creating.trim()}&rdquo;
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <SaveDot state={autosave.state} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase 3 stub renderers — display only, full editors arrive in Phase 3
// ---------------------------------------------------------------------------

function FileStubCell({ value, className }: { value: Json | null; className?: string }) {
  const count = Array.isArray(value) ? value.length : value ? 1 : 0
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <Paperclip className="size-3.5" />
      {count > 0 ? `${count} file${count === 1 ? '' : 's'}` : '—'}
    </span>
  )
}

function PersonStubCell({ value, className }: { value: Json | null; className?: string }) {
  const arr = Array.isArray(value) ? value.length : value ? 1 : 0
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <UserIcon className="size-3.5" />
      {arr > 0 ? `${arr} assignee${arr === 1 ? '' : 's'}` : '—'}
    </span>
  )
}

function RelationStubCell({ value, className }: { value: Json | null; className?: string }) {
  const arr = Array.isArray(value) ? value.length : value ? 1 : 0
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <FileIcon className="size-3.5" />
      {arr > 0 ? `${arr} record${arr === 1 ? '' : 's'}` : '—'}
    </span>
  )
}

function FormulaStubCell({ value, className }: { value: Json | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <FunctionSquareIcon className="size-3.5" />
      {value === null || value === undefined ? '—' : String(value)}
    </span>
  )
}

function LocationStubCell({ value, className }: { value: Json | null; className?: string }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>
  }
  const loc = value as unknown as LocationValue
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <MapPinIcon className="size-3.5" />
      <span className="truncate">{loc.address}</span>
    </span>
  )
}

// Tiny utility for tests / external consumers
export function isFieldEditable(field: FieldWithType) {
  if (field.is_locked && field.semantic_role !== 'title') return false
  if (field.field_type === 'formula' || field.field_type === 'formula_placeholder') return false
  return true
}
