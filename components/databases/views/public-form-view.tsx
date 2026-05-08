'use client'

import { useState } from 'react'
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { parseFieldOptions, type FieldOption, type PropertyType } from '@/lib/properties/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'

export type PublicFormData = {
  slug: string
  workspaceName: string
  config: {
    title: string
    description?: string
    includedFieldIds: string[]
    requiredFieldIds: string[]
    submitButtonText: string
    successMessage: string
    redirectUrl?: string
  }
  fields: CollectionFieldWithType[]
}

export function PublicFormView({ data }: { data: PublicFormData }) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fieldsById = new Map(data.fields.map((f) => [f.id, f]))
  const required = new Set(data.config.requiredFieldIds)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: data.slug, values }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        setErrorMessage(json.error ?? 'Submission failed.')
      } else {
        setSubmitted(true)
        if (data.config.redirectUrl) {
          setTimeout(() => {
            window.location.href = data.config.redirectUrl!
          }, 800)
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-16 text-center">
        <CheckCircle2Icon className="size-10 text-primary" />
        <h2 className="text-lg font-semibold">{data.config.successMessage}</h2>
        <p className="text-sm text-muted-foreground">{data.workspaceName}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {data.workspaceName}
        </p>
        <h1 className="text-2xl font-semibold">{data.config.title}</h1>
        {data.config.description ? (
          <p className="text-sm text-muted-foreground">{data.config.description}</p>
        ) : null}
      </header>

      {data.config.includedFieldIds.map((fieldId) => {
        const field = fieldsById.get(fieldId)
        if (!field) return null
        const value = values[fieldId]
        return (
          <div key={fieldId} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={`field-${fieldId}`}>
              {field.name}
              {required.has(fieldId) ? (
                <span className="ml-1 text-destructive">*</span>
              ) : null}
            </label>
            <FieldInput
              field={field}
              id={`field-${fieldId}`}
              value={value}
              onChange={(next) => setValues((s) => ({ ...s, [fieldId]: next }))}
              required={required.has(fieldId)}
            />
          </div>
        )
      })}

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
        {submitting ? 'Submitting…' : data.config.submitButtonText}
      </Button>
    </form>
  )
}

function FieldInput({
  field,
  id,
  value,
  onChange,
  required,
}: {
  field: CollectionFieldWithType
  id: string
  value: unknown
  onChange: (value: unknown) => void
  required?: boolean
}) {
  const options: FieldOption[] = parseFieldOptions(field.options_json)

  switch (field.field_type as PropertyType) {
    case 'long_text':
      return (
        <Textarea
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={4}
        />
      )
    case 'number':
    case 'currency':
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          required={required}
        />
      )
    case 'checkbox':
      return (
        <Checkbox
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      )
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )
    case 'select':
    case 'status':
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'multi_select': {
      const current = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const checked = current.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onChange(checked ? current.filter((id) => id !== opt.id) : [...current, opt.id])
                }
                className={
                  checked
                    ? 'rounded-md bg-accent px-2 py-1 text-xs'
                    : 'rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent/40'
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )
    }
    case 'email':
      return (
        <Input
          id={id}
          type="email"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )
    case 'url':
      return (
        <Input
          id={id}
          type="url"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )
    case 'phone':
      return (
        <Input
          id={id}
          type="tel"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )
    default:
      return (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )
  }
}
