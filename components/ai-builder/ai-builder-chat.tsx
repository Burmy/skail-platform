'use client'

import { useMemo, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Database,
  Eye,
  FileText,
  Layout,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  TableProperties,
  Undo2,
  Wand2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type AiBuilderPlan = {
  intent: string
  summary: string
  risk_level: 'low' | 'medium' | 'high'
  requires_confirmation: boolean
  changes: Record<string, Record<string, unknown>[]>
  warnings?: string[]
  questions?: string[]
}

type PreviewState = {
  previewId: string
  plan: AiBuilderPlan
  changeCount: number
  canApply: boolean
  status: 'preview' | 'applied' | 'undone'
  operations?: Array<{
    type: string
    label: string
  }>
  skipped?: string[]
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type AiBuilderChatProps = {
  workspaceId: string
  canApply: boolean
  userEmail: string | null
}

const suggestedPrompts = [
  'Create a client onboarding portal with a checklist database and dashboard page',
  'Build a project tracker with status, priority, due date, table, and kanban view',
  'Add a lightweight CRM with contacts, companies, and a pipeline board',
  'Create a content calendar with calendar view and publishing status',
]

const changeLabels: Record<string, string> = {
  pages_to_create: 'Pages to create',
  pages_to_update: 'Pages to update',
  collections_to_create: 'Collections to create',
  fields_to_create: 'Fields to create',
  fields_to_update: 'Fields to update',
  views_to_create: 'Views to create',
  widgets_to_create: 'Widgets to create',
  layout_changes: 'Layout changes',
}

const changeIcons: Record<string, ComponentType<{ className?: string }>> = {
  pages_to_create: FileText,
  pages_to_update: FileText,
  collections_to_create: Database,
  fields_to_create: TableProperties,
  fields_to_update: TableProperties,
  views_to_create: Layout,
  widgets_to_create: Layout,
  layout_changes: Layout,
}

function initialsFromEmail(email: string | null) {
  if (!email) {
    return 'U'
  }

  return email.slice(0, 2).toUpperCase()
}

function itemName(item: Record<string, unknown>) {
  const name =
    item.title ??
    item.name ??
    item.field_name ??
    item.collection_name ??
    item.view_name ??
    item.widget_type ??
    'Untitled change'

  return typeof name === 'string' ? name : 'Untitled change'
}

function countChanges(plan: AiBuilderPlan | null) {
  if (!plan) {
    return 0
  }

  return Object.values(plan.changes).reduce(
    (count, changes) => count + changes.length,
    0,
  )
}

function riskVariant(risk: AiBuilderPlan['risk_level']) {
  return risk === 'high' ? 'destructive' : risk === 'medium' ? 'secondary' : 'outline'
}

async function parseApiResponse(response: Response) {
  const payload = (await response.json()) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'AI Builder request failed.')
  }

  return payload
}

export function AiBuilderChat({
  workspaceId,
  canApply,
  userEmail,
}: AiBuilderChatProps) {
  const router = useRouter()
  const userInitials = initialsFromEmail(userEmail)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Tell me what to build. I will return a structured preview before anything is applied.',
    },
  ])
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibleChangeCount = useMemo(() => countChanges(preview?.plan ?? null), [preview])

  async function sendPrompt(prompt: string) {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || isGenerating) {
      return
    }

    setError(null)
    setPreview(null)
    setInputValue('')
    setIsGenerating(true)
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedPrompt,
      },
    ])

    try {
      const payload = (await parseApiResponse(
        await fetch('/api/ai-builder/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            prompt: trimmedPrompt,
          }),
        }),
      )) as {
        previewId: string
        plan: AiBuilderPlan
        changeCount: number
        canApply: boolean
      }

      setPreview({
        previewId: payload.previewId,
        plan: payload.plan,
        changeCount: payload.changeCount,
        canApply: payload.canApply,
        status: 'preview',
      })
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: payload.plan.summary,
        },
      ])
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'AI Builder request failed.'

      setError(message)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: message,
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  async function applyPreview() {
    if (!preview || isApplying) {
      return
    }

    setError(null)
    setIsApplying(true)

    try {
      const payload = (await parseApiResponse(
        await fetch('/api/ai-builder/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            previewId: preview.previewId,
          }),
        }),
      )) as {
        operations: PreviewState['operations']
        skipped: string[]
      }

      setPreview({
        ...preview,
        status: 'applied',
        operations: payload.operations,
        skipped: payload.skipped,
      })
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Applied ${payload.operations?.length ?? 0} changes.`,
        },
      ])
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Apply failed.',
      )
    } finally {
      setIsApplying(false)
    }
  }

  async function undoLastChange() {
    if (isUndoing) {
      return
    }

    setError(null)
    setIsUndoing(true)

    try {
      const payload = (await parseApiResponse(
        await fetch('/api/ai-builder/undo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            previewId: preview?.status === 'applied' ? preview.previewId : undefined,
          }),
        }),
      )) as {
        undone: string[]
      }

      setPreview((current) =>
        current
          ? {
              ...current,
              status: 'undone',
            }
          : current,
      )
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Undid ${payload.undone.length} changes.`,
        },
      ])
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Undo failed.',
      )
    } finally {
      setIsUndoing(false)
    }
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] min-h-0 grid-cols-[minmax(0,1fr)_420px]">
      <section className="flex min-w-0 flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <div
                className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' && 'flex-row-reverse',
                )}
                key={message.id}
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                    message.role === 'assistant'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {message.role === 'assistant' ? (
                    <Sparkles className="size-4" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[78%] rounded-lg border px-4 py-3 text-sm leading-6',
                    message.role === 'assistant'
                      ? 'bg-card text-card-foreground'
                      : 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    type="button"
                  >
                    <Wand2 className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">{prompt}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Generating preview
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-card p-4">
          <div className="mx-auto grid max-w-3xl gap-2">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="relative">
              <Textarea
                className="min-h-24 resize-none pr-14"
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendPrompt(inputValue)
                  }
                }}
                placeholder="Describe the workspace change..."
                value={inputValue}
              />
              <Button
                className="absolute bottom-2 right-2"
                disabled={!inputValue.trim() || isGenerating}
                onClick={() => void sendPrompt(inputValue)}
                size="icon"
                type="button"
              >
                <Send />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col border-l bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Preview changes</h2>
          </div>
          <Badge variant="secondary">{visibleChangeCount} changes</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {preview ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{preview.plan.intent}</CardTitle>
                    <Badge variant={riskVariant(preview.plan.risk_level)}>
                      {preview.plan.risk_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{preview.plan.summary}</p>
                  {preview.plan.requires_confirmation && (
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="size-4" />
                      Confirmation required
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                {Object.entries(preview.plan.changes).map(([key, changes]) => {
                  if (changes.length === 0) {
                    return null
                  }

                  const Icon = changeIcons[key] ?? Sparkles

                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Icon className="size-4 text-primary" />
                          {changeLabels[key] ?? key}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {changes.map((change, index) => (
                          <div
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                            key={`${key}-${index}`}
                          >
                            <div className="font-medium">{itemName(change)}</div>
                            <pre className="mt-1 max-h-28 overflow-auto text-xs text-muted-foreground">
                              {JSON.stringify(change, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {(preview.plan.warnings?.length ?? 0) > 0 && (
                <Alert>
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    {preview.plan.warnings?.join(' ')}
                  </AlertDescription>
                </Alert>
              )}

              {(preview.skipped?.length ?? 0) > 0 && (
                <Alert>
                  <AlertDescription>{preview.skipped?.join(' ')}</AlertDescription>
                </Alert>
              )}

              {(preview.operations?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-success" />
                      Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {preview.operations?.map((operation, index) => (
                      <div key={`${operation.type}-${index}`}>
                        {operation.type}: {operation.label}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-md border border-dashed p-6 text-center">
              <div>
                <Sparkles className="mx-auto mb-3 size-9 text-muted-foreground" />
                <h3 className="font-semibold">No preview yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Send a prompt to generate structured changes.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t p-4">
          <Button
            className="w-full"
            disabled={
              !preview ||
              preview.status !== 'preview' ||
              !canApply ||
              !preview.canApply ||
              isApplying
            }
            onClick={() => void applyPreview()}
            type="button"
          >
            {isApplying ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Apply changes
          </Button>
          <Button
            className="w-full"
            disabled={isUndoing}
            onClick={() => void undoLastChange()}
            type="button"
            variant="outline"
          >
            {isUndoing ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Undo2 data-icon="inline-start" />
            )}
            Undo last change
          </Button>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!preview}
              onClick={() => {
                if (preview) {
                  void navigator.clipboard.writeText(
                    JSON.stringify(preview.plan, null, 2),
                  )
                }
              }}
              type="button"
              variant="ghost"
            >
              <Copy data-icon="inline-start" />
              Copy JSON
            </Button>
            <Button
              className="flex-1"
              disabled={isGenerating || messages.length <= 1}
              onClick={() => {
                const lastUserMessage = [...messages]
                  .reverse()
                  .find((message) => message.role === 'user')

                if (lastUserMessage) {
                  void sendPrompt(lastUserMessage.content)
                }
              }}
              type="button"
              variant="ghost"
            >
              <RotateCcw data-icon="inline-start" />
              Regenerate
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}
