'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

import { cn } from '@/lib/utils'
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
import { upsertPageForm, submitPageForm } from '@/app/pages/actions'
import { usePageRuntime } from '@/components/pages/page-runtime-context'

type FieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'select'
  | 'date'
  | 'email'
  | 'url'
  | 'checkbox'

type FormField = {
  id: string
  name: string
  type: FieldType
  required?: boolean
  options?: string[]
}

const DEFAULT_FIELDS: FormField[] = [
  { id: crypto.randomUUID(), name: 'Name', type: 'text', required: true },
  { id: crypto.randomUUID(), name: 'Email', type: 'email', required: true },
  { id: crypto.randomUUID(), name: 'Message', type: 'long_text' },
]

export const PageFormBlock = createReactBlockSpec(
  {
    type: 'page_form',
    propSchema: {
      ...defaultProps,
      formId: { default: '' },
      pageId: { default: '' },
      workspaceId: { default: '' },
      mode: { default: 'edit' as 'edit' | 'submit' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const props = block.props as {
        formId: string
        pageId: string
        workspaceId: string
        mode: 'edit' | 'submit'
      }
      return (
        <PageFormBody
          formId={props.formId}
          pageId={props.pageId}
          workspaceId={props.workspaceId}
          blockId={block.id}
          mode={props.mode}
          onModeChange={(mode) =>
            editor.updateBlock(block, {
              props: { ...block.props, mode },
            })
          }
          onFormCreated={(formId) =>
            editor.updateBlock(block, {
              props: { ...block.props, formId },
            })
          }
        />
      )
    },
  },
)

function PageFormBody({
  formId,
  pageId,
  workspaceId,
  blockId,
  mode,
  onModeChange,
  onFormCreated,
}: {
  formId: string
  pageId: string
  workspaceId: string
  blockId: string
  mode: 'edit' | 'submit'
  onModeChange: (mode: 'edit' | 'submit') => void
  onFormCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('Form')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS)
  const [submitText, setSubmitText] = useState('Submit')
  const [successMessage, setSuccessMessage] = useState('Thanks for submitting!')
  const [pending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const runtime = usePageRuntime()
  const effectiveMode = runtime.mode === 'public' ? 'submit' : mode
  const canEditForm = runtime.canManageStructure && runtime.mode !== 'public'

  useEffect(() => {
    if (!formId) return
    fetch(
      `/api/pages/forms/${encodeURIComponent(formId)}?workspaceId=${encodeURIComponent(
        workspaceId,
      )}`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (j.error) return
        setTitle(j.title ?? 'Form')
        setDescription(j.description ?? '')
        setFields((j.fields_json ?? []) as FormField[])
        setSubmitText(j.submit_text ?? 'Submit')
        setSuccessMessage(j.success_message ?? 'Thanks for submitting!')
      })
      .catch(() => undefined)
  }, [formId, workspaceId])

  function persist(next?: Partial<{ fields: FormField[]; title: string; description: string; submitText: string; successMessage: string }>) {
    if (!canEditForm) return
    startTransition(async () => {
      const result = await upsertPageForm({
        workspaceId,
        pageId,
        blockId,
        title: next?.title ?? title,
        description: next?.description ?? description,
        fields: next?.fields ?? fields,
        submitText: next?.submitText ?? submitText,
        successMessage: next?.successMessage ?? successMessage,
      })
      if (result.ok && result.data?.id && !formId) onFormCreated(result.data.id)
    })
  }

  function addField() {
    const next: FormField[] = [
      ...fields,
      { id: crypto.randomUUID(), name: 'Untitled', type: 'text' },
    ]
    setFields(next)
    persist({ fields: next })
  }

  function updateField(id: string, patch: Partial<FormField>) {
    const next = fields.map((f) => (f.id === id ? { ...f, ...patch } : f))
    setFields(next)
    persist({ fields: next })
  }

  function removeField(id: string) {
    const next = fields.filter((f) => f.id !== id)
    setFields(next)
    persist({ fields: next })
  }

  async function handleSubmit() {
    if (!formId) return
    const result = await submitPageForm({
      formId,
      values,
      publicToken: runtime.publicToken,
    })
    if (result.ok) {
      setSubmitted(true)
      setValues({})
    }
  }

  if (submitted) {
    return (
      <div className="my-2 flex items-center gap-2 rounded-md border bg-card p-4 text-sm">
        <CheckCircle2Icon className="size-4 text-success" />
        <span>{successMessage}</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setSubmitted(false)}
        >
          Submit another
        </Button>
      </div>
    )
  }

  return (
    <div className="my-2 rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        {effectiveMode === 'edit' && canEditForm ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => persist({ title })}
            className="h-7 flex-1 border-0 px-1 text-base font-semibold shadow-none focus-visible:ring-0"
          />
        ) : (
          <h3 className="flex-1 text-base font-semibold">{title}</h3>
        )}
        {canEditForm ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onModeChange(mode === 'edit' ? 'submit' : 'edit')}
          >
            {mode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
        ) : null}
      </div>

      {effectiveMode === 'edit' && canEditForm ? (
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => persist({ description })}
          placeholder="Optional description"
          rows={2}
          className="mb-3 border-0 px-1 text-sm shadow-none focus-visible:ring-0"
        />
      ) : description ? (
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field) =>
          effectiveMode === 'edit' && canEditForm ? (
            <FormFieldEditorRow
              key={field.id}
              field={field}
              onChange={(patch) => updateField(field.id, patch)}
              onRemove={() => removeField(field.id)}
            />
          ) : (
            <FormFieldSubmitRow
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ),
        )}
      </div>

      {effectiveMode === 'edit' && canEditForm ? (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={addField} className="gap-1">
            <PlusIcon className="size-3.5" />
            Add field
          </Button>
          <Input
            value={submitText}
            onChange={(e) => setSubmitText(e.target.value)}
            onBlur={() => persist({ submitText })}
            placeholder="Submit button text"
            className="ml-auto h-7 w-44 text-xs"
          />
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-end">
          <Button size="sm" disabled={pending || !formId} onClick={handleSubmit}>
            {submitText}
          </Button>
        </div>
      )}
    </div>
  )
}

function FormFieldEditorRow({
  field,
  onChange,
  onRemove,
}: {
  field: FormField
  onChange: (patch: Partial<FormField>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      <Input
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="h-7 flex-1 text-sm"
        placeholder="Field name"
      />
      <Select
        value={field.type}
        onValueChange={(v) => onChange({ type: v as FieldType })}
      >
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="long_text">Long text</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="select">Select</SelectItem>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="url">URL</SelectItem>
          <SelectItem value="checkbox">Checkbox</SelectItem>
        </SelectContent>
      </Select>
      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Checkbox
          checked={field.required ?? false}
          onCheckedChange={(c) => onChange({ required: c === true })}
        />
        required
      </label>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="size-7"
        aria-label="Remove field"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}

function FormFieldSubmitRow({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'long_text') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {field.name}
          {field.required ? ' *' : ''}
        </label>
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>
    )
  }
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value === true}
          onCheckedChange={(c) => onChange(c === true)}
        />
        {field.name}
      </label>
    )
  }
  if (field.type === 'select') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          {field.name}
          {field.required ? ' *' : ''}
        </label>
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {field.name}
        {field.required ? ' *' : ''}
      </label>
      <Input
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : ''
        }
        onChange={(e) =>
          onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
        }
        type={
          field.type === 'number'
            ? 'number'
            : field.type === 'email'
              ? 'email'
              : field.type === 'url'
                ? 'url'
                : field.type === 'date'
                  ? 'date'
                  : 'text'
        }
        className="h-8 text-sm"
      />
    </div>
  )
}
