'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ImageIcon, Loader2Icon, UploadIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings2Icon } from 'lucide-react'
import { updateGalleryConfig, updateRecordField } from '@/app/databases/actions'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { Json } from '@/lib/supabase/database.types'
import type { SavedViewWithConfig, ViewConfig } from '@/lib/views/types'

import { FieldCell } from '../field-cell'
import type { RecordMutators } from '../hooks/use-optimistic-records'

const SIZE_TO_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 180,
  md: 240,
  lg: 320,
}

export type GalleryViewProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  mutators?: RecordMutators
  titleFieldId: string | null
  embedded?: boolean
  canConfigureView?: boolean
  onViewConfigPatch?: (patch: Partial<ViewConfig>) => void
  onOpenRecord: (recordId: string) => void
}

export function GalleryView(props: GalleryViewProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    records,
    mutators,
    titleFieldId,
    embedded = false,
    canConfigureView = true,
    onViewConfigPatch,
    onOpenRecord,
  } = props
  const [, startTransition] = useTransition()

  const cfg = view.config.gallery
  const cardSize = cfg?.cardSize ?? 'md'
  const coverFit = cfg?.coverFit ?? 'cover'
  const coverFieldId = cfg?.coverFieldId ?? null
  const visibleFieldIds = cfg?.visibleFieldIds ?? []
  const [createdCoverField, setCreatedCoverField] =
    useState<CollectionFieldWithType | null>(null)
  const allFields = useMemo(() => {
    if (!createdCoverField || fields.some((field) => field.id === createdCoverField.id)) {
      return fields
    }
    return [...fields, createdCoverField]
  }, [createdCoverField, fields])

  const eligibleCoverFields = allFields.filter((f) =>
    ['file', 'url'].includes(f.field_type),
  )
  const coverField = coverFieldId ? allFields.find((f) => f.id === coverFieldId) : null
  const coverFieldType =
    coverField?.field_type === 'file' || coverField?.field_type === 'url'
      ? coverField.field_type
      : null

  // For `file` type covers, fetch each record's first file URL once.
  const [fileCoverUrls, setFileCoverUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (coverFieldType !== 'file' || !coverFieldId || records.length === 0) {
      return
    }
    let cancelled = false
    void (async () => {
      const next = new Map<string, string>()
      // Fetch in parallel; each record's file list returns signed URLs valid 5min.
      const results = await Promise.all(
        records.map(async (r) => {
          try {
            const resp = await fetch(
              `/api/databases/files/list?workspaceId=${workspaceId}&recordId=${r.id}&fieldId=${coverFieldId}`,
            )
            if (!resp.ok) return [r.id, null] as const
            const json = (await resp.json()) as {
              files?: { mime_type?: string | null; signedUrl?: string | null }[]
            }
            const firstImage = (json.files ?? []).find((f) =>
              (f.mime_type ?? '').startsWith('image/'),
            )
            return [r.id, firstImage?.signedUrl ?? null] as const
          } catch {
            return [r.id, null] as const
          }
        }),
      )
      if (cancelled) return
      for (const [id, url] of results) if (url) next.set(id, url)
      setFileCoverUrls(next)
    })()
    return () => {
      cancelled = true
    }
  }, [coverFieldType, coverFieldId, workspaceId, records])

  function persist(patch: Partial<NonNullable<typeof cfg>>) {
    const nextGallery = {
      coverFieldId: patch.coverFieldId ?? coverFieldId,
      coverFit: patch.coverFit ?? coverFit,
      cardSize: patch.cardSize ?? cardSize,
      visibleFieldIds: patch.visibleFieldIds ?? visibleFieldIds,
    }
    onViewConfigPatch?.({ gallery: nextGallery })
    if (embedded || !canConfigureView) return
    startTransition(async () => {
      await updateGalleryConfig({
        workspaceId,
        viewId: view.id,
        ...nextGallery,
      })
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">Gallery</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1">
              <Settings2Icon className="size-3.5" />
              <span className="text-xs">Layout</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-2 p-3">
            <ConfigRow label="Cover">
              <Select
                value={coverFieldId ?? '__none__'}
                onValueChange={(v) =>
                  persist({ coverFieldId: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No cover</SelectItem>
                  {eligibleCoverFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigRow>
            <ConfigRow label="Fit">
              <Select value={coverFit} onValueChange={(v) => persist({ coverFit: v as typeof coverFit })}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fit">Fit</SelectItem>
                </SelectContent>
              </Select>
            </ConfigRow>
            <ConfigRow label="Size">
              <Select value={cardSize} onValueChange={(v) => persist({ cardSize: v as typeof cardSize })}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </ConfigRow>
          </PopoverContent>
        </Popover>
      </div>
      {eligibleCoverFields.length === 0 && canConfigureView ? (
        <GalleryCoverSetup
          workspaceId={workspaceId}
          collectionId={collectionId}
          onCreated={(field) => {
            setCreatedCoverField(field)
            persist({ coverFieldId: field.id })
          }}
        />
      ) : null}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${SIZE_TO_PX[cardSize]}px, 1fr))`,
          }}
        >
          {records.map((record) => (
            <GalleryCard
              key={record.id}
              record={record}
              fields={allFields}
              visibleFieldIds={view.config.visibleFieldIds}
              titleFieldId={titleFieldId}
              coverFieldId={coverFieldId}
              coverFieldType={coverFieldType}
              coverFit={coverFit}
              cardSize={cardSize}
              workspaceId={workspaceId}
              mutators={mutators}
              fileCoverUrl={fileCoverUrls.get(record.id) ?? null}
              onOpen={() => onOpenRecord(record.id)}
              onUploaded={(url) => {
                if (url) setFileCoverUrls((current) => new Map(current).set(record.id, url))
              }}
            />
          ))}
        </div>
        {records.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No records yet.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function GalleryCoverSetup({
  workspaceId,
  collectionId,
  onCreated,
}: {
  workspaceId: string
  collectionId: string
  onCreated: (field: CollectionFieldWithType) => void
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="border-b bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-background px-3 py-2">
        <div>
          <p className="text-sm font-medium">Add a Cover image property</p>
          <p className="text-xs text-muted-foreground">
            Gallery cards need an image field before uploads can be shown.
          </p>
        </div>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const fd = new FormData()
              fd.set('workspaceId', workspaceId)
              fd.set('collectionId', collectionId)
              fd.set('name', 'Cover')
              fd.set('fieldType', 'file')
              fd.set('semanticRole', 'cover_image')
              fd.set('options', '')
              const { createField } = await import('@/app/databases/actions')
              const result = await createField({ status: 'idle' }, fd)
              if (result.status === 'success' && result.field) {
                onCreated(result.field as CollectionFieldWithType)
              }
            })
          }}
        >
          Add Cover
        </Button>
      </div>
    </div>
  )
}

function ConfigRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="w-40">{children}</div>
    </div>
  )
}

function readCoverUrl(record: CollectionRecordWithValues, fieldId: string | null) {
  if (!fieldId) return null
  const raw = record.values[fieldId]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('value' in raw)) return null
  const inner = (raw as Record<string, Json>).value
  if (typeof inner === 'string' && /^https?:\/\//.test(inner)) return inner
  if (Array.isArray(inner)) {
    const first = inner.find((v) => typeof v === 'string' && /^https?:\/\//.test(v))
    if (typeof first === 'string') return first
  }
  if (inner && typeof inner === 'object' && 'externalUrl' in inner) {
    const u = (inner as Record<string, unknown>).externalUrl
    if (typeof u === 'string') return u
  }
  return null
}

function GalleryCard({
  record,
  fields,
  visibleFieldIds,
  titleFieldId,
  coverFieldId,
  coverFieldType,
  coverFit,
  cardSize,
  workspaceId,
  mutators,
  fileCoverUrl,
  onOpen,
  onUploaded,
}: {
  record: CollectionRecordWithValues
  fields: CollectionFieldWithType[]
  visibleFieldIds: string[]
  titleFieldId: string | null
  coverFieldId: string | null
  coverFieldType: 'file' | 'url' | null
  coverFit: 'cover' | 'contain' | 'fit'
  cardSize: 'sm' | 'md' | 'lg'
  workspaceId: string
  mutators?: RecordMutators
  fileCoverUrl: string | null
  onOpen: () => void
  onUploaded?: (previewUrl: string | null) => void
}) {
  const url = coverFieldType === 'file' ? fileCoverUrl : readCoverUrl(record, coverFieldId)
  const coverField = coverFieldId ? fields.find((f) => f.id === coverFieldId) : null
  const supportsFileUpload = !!coverField && coverField.field_type === 'file'
  const supportsUrlInput = !!coverField && coverField.field_type === 'url'
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [urlInputOpen, setUrlInputOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const displayUrl = localPreviewUrl ?? url

  const visibleSet = new Set(
    visibleFieldIds.length > 0 ? visibleFieldIds : fields.map((f) => f.id),
  )
  const previewFields = fields
    .filter(
      (f) =>
        visibleSet.has(f.id) &&
        f.id !== titleFieldId &&
        f.id !== coverFieldId &&
        f.field_type !== 'long_text',
    )
    .slice(0, 4)

  async function handleFileUpload(file: File) {
    if (!coverField || coverField.field_type !== 'file') return
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const objectUrl = URL.createObjectURL(file)
    setLocalPreviewUrl(objectUrl)
    try {
      const fd = new FormData()
      fd.set('workspaceId', workspaceId)
      fd.set('recordId', record.id)
      fd.set('fieldId', coverField.id)
      fd.set('file', file)
      const resp = await fetch('/api/databases/files/upload', {
        method: 'POST',
        body: fd,
      })
      const json = (await resp.json()) as {
        storagePath?: string
        signedUrl?: string
        filename?: string
        mimeType?: string | null
        sizeBytes?: number | null
        error?: string
      }
      if (!resp.ok || !json.storagePath) {
        throw new Error(json.error ?? 'upload failed')
      }

      const { uploadFileMetadata } = await import('@/app/databases/actions')
      await uploadFileMetadata({
        workspaceId,
        recordId: record.id,
        fieldId: coverField.id,
        source: 'upload',
        storagePath: json.storagePath,
        filename: json.filename ?? file.name,
        mimeType: json.mimeType ?? file.type,
        sizeBytes: json.sizeBytes ?? file.size,
      })
      onUploaded?.(json.signedUrl ?? null)
    } finally {
      setUploading(false)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
    }
  }

  async function saveUrlCover() {
    if (!coverField || coverField.field_type !== 'url') return
    const trimmed = urlDraft.trim()
    if (!/^https?:\/\//i.test(trimmed)) return
    setLocalPreviewUrl(trimmed)
    mutators?.setFieldValue(record.id, coverField.id, trimmed)
    setUrlInputOpen(false)
    setUrlDraft('')
    await updateRecordField({
      workspaceId,
      recordId: record.id,
      fieldId: coverField.id,
      value: trimmed,
    })
  }

  return (
    <div
      onDragOver={(e) => {
        if (supportsFileUpload) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!supportsFileUpload) return
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void handleFileUpload(file)
      }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border bg-background text-left transition-colors hover:border-foreground/30',
        dragOver && 'border-foreground ring-2 ring-ring',
      )}
    >
      <div
        role={supportsFileUpload || supportsUrlInput ? 'button' : undefined}
        tabIndex={supportsFileUpload || supportsUrlInput ? 0 : undefined}
        aria-label={
          supportsFileUpload || supportsUrlInput ? 'Add gallery cover image' : undefined
        }
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (supportsFileUpload) fileInputRef.current?.click()
          else if (supportsUrlInput) setUrlInputOpen(true)
          else onOpen()
        }}
        onKeyDown={(event) => {
          if (!supportsFileUpload && !supportsUrlInput) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (supportsFileUpload) fileInputRef.current?.click()
            else setUrlInputOpen(true)
          }
        }}
        className={cn(
          'relative flex aspect-4/3 w-full items-center justify-center overflow-hidden border-b bg-muted/40',
          (supportsFileUpload || supportsUrlInput) && 'cursor-pointer',
        )}
        data-gallery-cover-control
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt=""
            className={cn(
              'h-full w-full',
              coverFit === 'cover' && 'object-cover',
              coverFit === 'contain' && 'object-contain',
              coverFit === 'fit' && 'object-scale-down',
            )}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
            <ImageIcon className="size-8" />
            {supportsFileUpload || supportsUrlInput ? (
              <span className="text-[10px]">
                {supportsFileUpload
                  ? dragOver
                    ? 'Drop to upload'
                    : 'Drop image here'
                  : 'Paste image URL'}
              </span>
            ) : null}
          </div>
        )}
        {supportsFileUpload ? (
          <>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleFileUpload(file)
              }}
            />
            <div className="absolute right-2 top-2 inline-flex h-7 items-center gap-1 rounded-md border bg-background/90 px-2 text-[11px] font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <UploadIcon className="size-3" />
              Cover
            </div>
          </>
        ) : null}
        {urlInputOpen && supportsUrlInput ? (
          <div
            className="absolute inset-x-2 bottom-2 rounded-md border bg-background/95 p-2 shadow-sm"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              autoFocus
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void saveUrlCover()
                }
                if (event.key === 'Escape') {
                  setUrlInputOpen(false)
                  setUrlDraft('')
                }
              }}
              placeholder="https://image-url..."
              className="h-7 w-full rounded-sm border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ) : null}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
            <Loader2Icon className="mr-1 size-3.5 animate-spin" />
            Uploading...
          </div>
        ) : null}
      </div>
      <div className={cn('flex flex-col gap-1 p-2', cardSize === 'lg' && 'p-3')}>
        <button
          type="button"
          onClick={onOpen}
          className="truncate text-left text-sm font-medium hover:underline"
        >
          {record.title ?? 'Untitled'}
        </button>
        {previewFields.length > 0 ? (
          <div
            className="mt-0.5 flex flex-col gap-1"
            onPointerDown={(e) => e.stopPropagation()}
            data-gallery-field-control
          >
            {previewFields.map((field) => (
              <div key={field.id} className="flex items-center gap-1.5 text-xs">
                <span className="w-16 shrink-0 truncate text-muted-foreground">
                  {field.name}
                </span>
                <div className="min-w-0 flex-1 truncate text-foreground">
                  <FieldCell
                    workspaceId={workspaceId}
                    field={field}
                    record={record}
                    isReadOnly
                    onSave={async () => ({ ok: true })}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
