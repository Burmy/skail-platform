'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CopyIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { updateFormConfig } from '@/app/databases/actions'
import { DEFAULT_FORM_CONFIG } from '@/lib/views/types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { SavedViewWithConfig } from '@/lib/views/types'

import { PublicFormView } from './public-form-view'

export type FormViewProps = {
  workspaceId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  titleFieldId: string | null
  canManageSchema: boolean
}

function defaultSlug() {
  return `form-${Math.random().toString(36).slice(2, 8)}`
}

export function FormView(props: FormViewProps) {
  const { workspaceId, view, fields, titleFieldId, canManageSchema } = props
  const router = useRouter()
  const [, startTransition] = useTransition()

  const cfg = view.config.form ?? DEFAULT_FORM_CONFIG

  const [title, setTitle] = useState(cfg.title)
  const [description, setDescription] = useState(cfg.description ?? '')
  const [submitButtonText, setSubmitButtonText] = useState(cfg.submitButtonText)
  const [successMessage, setSuccessMessage] = useState(cfg.successMessage)
  const [sharePublicly, setSharePublicly] = useState(cfg.sharePublicly)
  const [publicSlug, setPublicSlug] = useState(cfg.publicSlug ?? defaultSlug())
  const [includedFieldIds, setIncludedFieldIds] = useState<string[]>(
    cfg.includedFieldIds.length > 0
      ? cfg.includedFieldIds
      : fields.filter((f) => !f.is_system).map((f) => f.id),
  )
  const [requiredFieldIds, setRequiredFieldIds] = useState<string[]>(cfg.requiredFieldIds)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [activeTab, setActiveTab] = useState<'design' | 'preview'>('design')

  const includedSet = new Set(includedFieldIds)
  const requiredSet = new Set(requiredFieldIds)

  // Auto-save with debounce
  useEffect(() => {
    if (!canManageSchema) return
    const id = setTimeout(() => {
      setSavingState('saving')
      setErrorMessage(null)
      startTransition(async () => {
        const result = await updateFormConfig({
          workspaceId,
          viewId: view.id,
          title: title.trim() || 'Untitled form',
          description: description.trim() || undefined,
          includedFieldIds,
          requiredFieldIds,
          submitButtonText: submitButtonText.trim() || 'Submit',
          successMessage: successMessage.trim() || 'Thanks!',
          sharePublicly,
          publicSlug: sharePublicly ? publicSlug : undefined,
        })
        if (result.ok) {
          setSavingState('saved')
          setTimeout(() => setSavingState('idle'), 1500)
        } else {
          setErrorMessage(result.error)
          setSavingState('idle')
        }
        router.refresh()
      })
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    submitButtonText,
    successMessage,
    sharePublicly,
    publicSlug,
    includedFieldIds.join(','),
    requiredFieldIds.join(','),
  ])

  function toggleIncluded(fieldId: string) {
    setIncludedFieldIds((current) =>
      current.includes(fieldId) ? current.filter((id) => id !== fieldId) : [...current, fieldId],
    )
    if (requiredSet.has(fieldId) && includedSet.has(fieldId)) {
      setRequiredFieldIds((current) => current.filter((id) => id !== fieldId))
    }
  }

  function toggleRequired(fieldId: string) {
    setRequiredFieldIds((current) =>
      current.includes(fieldId) ? current.filter((id) => id !== fieldId) : [...current, fieldId],
    )
    if (!includedSet.has(fieldId)) {
      setIncludedFieldIds((current) => [...current, fieldId])
    }
  }

  const previewFields = useMemo(
    () => fields.filter((f) => includedFieldIds.includes(f.id)),
    [fields, includedFieldIds],
  )

  const publicUrl = sharePublicly && publicSlug ? `/f/${publicSlug}` : null

  if (!canManageSchema) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Only owners and admins can configure forms. Members can use the public link.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'design' | 'preview')} className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <TabsList>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {savingState === 'saving' ? <span>Saving…</span> : null}
            {savingState === 'saved' ? <span>Saved</span> : null}
            {errorMessage ? <span className="text-destructive">{errorMessage}</span> : null}
          </div>
        </div>

        <TabsContent value="design" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Fields</p>
              <ul className="flex flex-col">
                {fields.map((field) => (
                  <li
                    key={field.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b py-1.5 last:border-b-0"
                  >
                    <span className="truncate text-sm">{field.name}</span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={includedSet.has(field.id)}
                        onCheckedChange={() => toggleIncluded(field.id)}
                      />
                      <span>Included</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={requiredSet.has(field.id)}
                        onCheckedChange={() => toggleRequired(field.id)}
                      />
                      <span>Required</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Submit button text</label>
                <Input
                  value={submitButtonText}
                  onChange={(e) => setSubmitButtonText(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Success message</label>
                <Input
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  maxLength={400}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sharePublicly ? (
                    <EyeIcon className="size-3.5 text-primary" />
                  ) : (
                    <EyeOffIcon className="size-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Share publicly</span>
                </div>
                <Switch checked={sharePublicly} onCheckedChange={setSharePublicly} />
              </div>
              {sharePublicly ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Public slug</label>
                    <div className="flex gap-2">
                      <Input
                        value={publicSlug}
                        onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="font-mono text-xs"
                      />
                      {publicUrl ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.origin + publicUrl)
                          }}
                          aria-label="Copy public URL"
                        >
                          <CopyIcon className="size-3.5" />
                        </Button>
                      ) : null}
                      {publicUrl ? (
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <a href={publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this URL can submit the form anonymously.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 overflow-y-auto bg-muted/20">
          <PublicFormView
            data={{
              slug: publicSlug,
              workspaceName: 'Preview',
              config: {
                title: title || 'Untitled form',
                description,
                includedFieldIds,
                requiredFieldIds,
                submitButtonText,
                successMessage,
              },
              fields: previewFields,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
