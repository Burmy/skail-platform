'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircleIcon,
  CheckIcon,
  FunctionSquareIcon,
  Loader2Icon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { setFieldFormula } from '@/app/databases/actions'
import { parseFormula, FORMULA_FUNCTIONS } from '@/lib/databases/formula/grammar'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { Json } from '@/lib/supabase/database.types'

export type FormulaEditorProps = {
  workspaceId: string
  field: CollectionFieldWithType
  fields: CollectionFieldWithType[]
  isReadOnly?: boolean
  className?: string
  computedValue?: Json | null
  suppressRefresh?: boolean
}

function readFormulaSource(field: CollectionFieldWithType) {
  const stored = field.formula_json
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return ''
  const obj = stored as Record<string, unknown>
  return typeof obj.source === 'string' ? obj.source : ''
}

function readComputedValueDisplay(value: Json | null | undefined) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    const inner = (value as Record<string, Json>).value
    return readComputedValueDisplay(inner ?? null)
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return JSON.stringify(value)
}

export function FormulaEditor({
  workspaceId,
  field,
  fields,
  isReadOnly,
  className,
  computedValue,
  suppressRefresh = false,
}: FormulaEditorProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const initialSource = readFormulaSource(field)
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState(initialSource)
  const [pending, setPending] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const validation = useMemo(() => {
    if (source.trim().length === 0) return { ok: true, ast: null, refs: [] as string[] }
    const result = parseFormula(source)
    if (result.ok) return { ok: true, ast: result.ast, refs: result.referencedFieldIds }
    return { ok: false, error: result.error }
  }, [source])

  function insertFieldRef(fieldId: string) {
    setSource((s) => `${s}{${fieldId}}`)
  }

  function insertFunction(fn: string) {
    setSource((s) => `${s}${fn}()`)
  }

  function save() {
    if (!validation.ok) return
    setPending(true)
    setSavedMessage(null)
    startTransition(async () => {
      const result = await setFieldFormula({
        workspaceId,
        fieldId: field.id,
        source: source.trim(),
      })
      setPending(false)
      if (result.ok) {
        setSavedMessage('Saved')
        setTimeout(() => setSavedMessage(null), 1500)
        if (!suppressRefresh) router.refresh()
        setOpen(false)
      } else {
        setSavedMessage(result.error)
      }
    })
  }

  const fieldLookup = useMemo(
    () => new Map(fields.map((f) => [f.id, f])),
    [fields],
  )
  const validationRefs = validation.ok ? validation.refs ?? [] : []

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={(o) => !isReadOnly && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            <FunctionSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{readComputedValueDisplay(computedValue ?? null)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[480px] p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Formula</span>
              <div className="text-xs text-muted-foreground">
                {validation.ok ? (
                  <span className="inline-flex items-center gap-1">
                    <CheckIcon className="size-3" />
                    Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertCircleIcon className="size-3" />
                    {validation.ok === false ? validation.error : ''}
                  </span>
                )}
              </div>
            </div>
            <Textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder='Example: {priceFieldId} * {quantityFieldId}'
              rows={5}
              className="font-mono text-xs"
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Insert field</span>
              <div className="flex flex-wrap gap-1">
                {fields
                  .filter((f) => f.id !== field.id)
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => insertFieldRef(f.id)}
                      className="rounded-sm border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                      title={f.name}
                    >
                      {f.name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Functions</span>
              <div className="flex flex-wrap gap-1">
                {FORMULA_FUNCTIONS.map((fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => insertFunction(fn)}
                    className="rounded-sm border bg-background px-1.5 py-0.5 text-[10px] font-mono hover:bg-accent/40"
                  >
                    {fn}
                  </button>
                ))}
              </div>
            </div>
            {validationRefs.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                References:{' '}
                {validationRefs
                  .map((id) => fieldLookup.get(id)?.name ?? id)
                  .join(', ')}
              </p>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">{savedMessage}</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={save}
                  disabled={!validation.ok || pending}
                >
                  {pending ? <Loader2Icon className="size-3 animate-spin" /> : null}
                  {pending ? 'Saving…' : 'Save formula'}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
