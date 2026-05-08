'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  LinkIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { removeFile, uploadFileMetadata } from '@/app/databases/actions'

export type FileEditorProps = {
  workspaceId: string
  recordId: string
  fieldId: string
  isReadOnly?: boolean
  className?: string
}

type FileEntry = {
  id: string
  source: 'upload' | 'external_link'
  storage_path: string | null
  external_url: string | null
  filename: string
  mime_type: string | null
  size_bytes: number | null
}

export function FileEditor({
  workspaceId,
  recordId,
  fieldId,
  isReadOnly,
  className,
}: FileEditorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      const r = await fetch(
        `/api/databases/files/list?workspaceId=${workspaceId}&recordId=${recordId}&fieldId=${fieldId}`,
      )
      const j = await r.json()
      setFiles(j.files ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleUpload(file: File) {
    setPending(true)
    setErrorMessage(null)
    try {
      const formData = new FormData()
      formData.set('workspaceId', workspaceId)
      formData.set('recordId', recordId)
      formData.set('fieldId', fieldId)
      formData.set('file', file)
      const response = await fetch('/api/databases/files/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Upload failed')

      const meta = await uploadFileMetadata({
        workspaceId,
        recordId,
        fieldId,
        source: 'upload',
        storagePath: json.storagePath,
        filename: json.filename,
        mimeType: json.mimeType,
        sizeBytes: json.sizeBytes,
      })
      if (!meta.ok) throw new Error(meta.error)
      await refresh()
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setPending(false)
    }
  }

  async function handleAttachLink() {
    if (!linkUrl.trim()) return
    setPending(true)
    setErrorMessage(null)
    try {
      const filename = linkUrl.split('/').pop()?.split('?')[0] || linkUrl
      const meta = await uploadFileMetadata({
        workspaceId,
        recordId,
        fieldId,
        source: 'external_link',
        externalUrl: linkUrl.trim(),
        filename,
      })
      if (!meta.ok) throw new Error(meta.error)
      setLinkUrl('')
      await refresh()
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not attach link')
    } finally {
      setPending(false)
    }
  }

  async function handleRemove(id: string) {
    setPending(true)
    try {
      const result = await removeFile({ workspaceId, fileId: id })
      if (!result.ok) throw new Error(result.error)
      await refresh()
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setPending(false)
    }
  }

  async function openFile(id: string) {
    const r = await fetch(`/api/databases/files/${id}`)
    const j = await r.json()
    if (j.url) window.open(j.url as string, '_blank', 'noopener')
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (isReadOnly) return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleUpload(file)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={(o) => !isReadOnly && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="flex h-7 w-full items-center gap-1 rounded-sm px-1.5 text-left text-sm hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
          >
            <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className={cn(files.length === 0 && 'text-muted-foreground', 'truncate')}>
              {files.length === 0 ? '—' : `${files.length} file${files.length === 1 ? '' : 's'}`}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                Upload
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1">
                Link
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-1">
                Files
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({files.length})
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-xs hover:bg-accent/30"
              >
                {pending ? (
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <UploadIcon className="size-5 text-muted-foreground" />
                )}
                <span className="font-medium">Drop a file or click to browse</span>
                <span className="text-muted-foreground">25 MB max</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleUpload(f)
                  e.target.value = ''
                }}
              />
            </TabsContent>
            <TabsContent value="link" className="mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Paste a URL</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-7 text-xs"
                />
                <Button size="sm" onClick={handleAttachLink} disabled={pending}>
                  <LinkIcon className="size-3.5" />
                  Attach link
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="files" className="mt-2">
              {loading ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
              ) : files.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">No files yet.</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {files.map((file) => {
                    const isImage = file.mime_type?.startsWith('image/') ?? false
                    return (
                      <li
                        key={file.id}
                        className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => openFile(file.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          {isImage ? (
                            <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : file.source === 'external_link' ? (
                            <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{file.filename}</span>
                        </button>
                        {file.size_bytes ? (
                          <span className="text-[10px] text-muted-foreground">
                            {humanSize(file.size_bytes)}
                          </span>
                        ) : null}
                        {!isReadOnly ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemove(file.id)}
                            aria-label="Remove file"
                          >
                            <Trash2Icon className="size-3" />
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
          {errorMessage ? (
            <p className="mt-2 px-1 text-xs text-destructive">{errorMessage}</p>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
