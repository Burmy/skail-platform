'use client'

import { useEffect, useState, useTransition } from 'react'
import { ImageIcon, Share2Icon, SmilePlusIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  renamePage,
  setPageCover,
  setPageIcon,
} from '@/app/pages/actions'
import { ShareDialog } from './share-dialog'

const GRADIENT_PRESETS: string[] = [
  'linear-gradient(135deg,#fde68a,#f97316)',
  'linear-gradient(135deg,#bae6fd,#3b82f6)',
  'linear-gradient(135deg,#bbf7d0,#10b981)',
  'linear-gradient(135deg,#fbcfe8,#ec4899)',
  'linear-gradient(135deg,#ddd6fe,#8b5cf6)',
  'linear-gradient(135deg,#fed7aa,#ef4444)',
  'linear-gradient(135deg,#fef9c3,#facc15)',
  'linear-gradient(135deg,#cffafe,#06b6d4)',
  'linear-gradient(135deg,#e2e8f0,#64748b)',
  'linear-gradient(135deg,#1f2937,#0f172a)',
  'linear-gradient(135deg,#f5f3ff,#a78bfa)',
  'linear-gradient(135deg,#ffe4e6,#f43f5e)',
]

const EMOJI_QUICK = [
  '📄',
  '📚',
  '📝',
  '📌',
  '✨',
  '⭐',
  '🎯',
  '🚀',
  '🔥',
  '💡',
  '🧠',
  '📊',
  '📅',
  '✅',
  '🛠️',
  '🎨',
  '☕',
  '🌱',
  '🧩',
  '🧪',
]

export function PageHeader({
  workspaceId,
  pageId,
  initialTitle,
  initialIcon,
  initialCover,
  readOnly,
  canShare = false,
}: {
  workspaceId: string
  pageId: string
  initialTitle: string
  initialIcon: string | null
  initialCover: string | null
  readOnly?: boolean
  canShare?: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  const [icon, setIcon] = useState(initialIcon)
  const [cover, setCover] = useState(initialCover)
  const [coverDialogOpen, setCoverDialogOpen] = useState(false)
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTitle(initialTitle)
    setIcon(initialIcon)
    setCover(initialCover)
  }, [initialTitle, initialIcon, initialCover, pageId])

  function commitTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === initialTitle) return
    startTransition(async () => {
      await renamePage({ workspaceId, pageId, title: trimmed })
    })
  }

  function commitIcon(next: string | null) {
    setIcon(next)
    startTransition(async () => {
      await setPageIcon({ workspaceId, pageId, icon: next })
    })
  }

  function commitCover(next: string | null) {
    setCover(next)
    startTransition(async () => {
      await setPageCover({ workspaceId, pageId, coverImageUrl: next })
    })
  }

  return (
    <header className="group relative">
      <CoverArea cover={cover} />

      <div className="-mt-6 w-full px-6">
        {/* Icon row */}
        <div className="-mt-10 mb-2 flex items-center gap-2">
          {icon ? (
            <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={readOnly}
                  className="flex size-14 items-center justify-center rounded-lg bg-card text-4xl shadow-sm transition-transform hover:scale-105"
                  aria-label="Change icon"
                >
                  {icon}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="grid grid-cols-7 gap-1">
                  {EMOJI_QUICK.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="rounded-md p-1 text-xl hover:bg-accent"
                      onClick={() => {
                        commitIcon(e)
                        setIconPopoverOpen(false)
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-end border-t pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      commitIcon(null)
                      setIconPopoverOpen(false)
                    }}
                  >
                    Remove icon
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {/* Hover-only "+ Add cover / + Add icon" affordances */}
        {!readOnly ? (
          <div
            className={cn(
              'mb-2 flex items-center gap-2 text-xs text-muted-foreground transition-opacity',
              cover && icon ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
            )}
          >
            {!cover ? (
              <button
                type="button"
                onClick={() => setCoverDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/40"
              >
                <ImageIcon className="size-3.5" />
                Add cover
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCoverDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/40"
              >
                <ImageIcon className="size-3.5" />
                Change cover
              </button>
            )}
            {!icon ? (
              <button
                type="button"
                onClick={() => {
                  commitIcon('📄')
                  setIconPopoverOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/40"
              >
                <SmilePlusIcon className="size-3.5" />
                Add icon
              </button>
            ) : null}
            {canShare ? (
              <ShareDialog
                workspaceId={workspaceId}
                scopeType="page"
                scopeId={pageId}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/40"
                  >
                    <Share2Icon className="size-3.5" />
                    Share
                  </button>
                }
              />
            ) : null}
          </div>
        ) : canShare ? (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ShareDialog
              workspaceId={workspaceId}
              scopeType="page"
              scopeId={pageId}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/40"
                >
                  <Share2Icon className="size-3.5" />
                  Share
                </button>
              }
            />
          </div>
        ) : null}

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          disabled={readOnly}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
          aria-label="Page title"
        />
      </div>

      <CoverDialog
        open={coverDialogOpen}
        onClose={() => setCoverDialogOpen(false)}
        currentCover={cover}
        onCommit={commitCover}
        workspaceId={workspaceId}
        pageId={pageId}
      />
    </header>
  )
}

function CoverArea({ cover }: { cover: string | null }) {
  if (!cover) return <div className="h-8 w-full" />
  if (cover.startsWith('linear-gradient')) {
    return (
      <div
        className="h-44 w-full"
        style={{ backgroundImage: cover, backgroundSize: 'cover' }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover}
      alt=""
      className="h-44 w-full object-cover"
    />
  )
}

function CoverDialog({
  open,
  onClose,
  currentCover,
  onCommit,
  workspaceId,
  pageId,
}: {
  open: boolean
  onClose: () => void
  currentCover: string | null
  onCommit: (next: string | null) => void
  workspaceId: string
  pageId: string
}) {
  const [tab, setTab] = useState<'upload' | 'link' | 'gradient'>('gradient')
  const [linkUrl, setLinkUrl] = useState(currentCover ?? '')
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('workspaceId', workspaceId)
      fd.set('pageId', pageId)
      fd.set('blockId', `cover-${pageId}`)
      fd.set('file', file)
      const resp = await fetch('/api/pages/assets/upload', {
        method: 'POST',
        body: fd,
      })
      const json = (await resp.json()) as { signedUrl?: string; error?: string }
      if (resp.ok && json.signedUrl) {
        onCommit(json.signedUrl)
        onClose()
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Page cover</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="gradient">Gradients</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <label className="flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground hover:bg-accent/30">
              {uploading ? 'Uploading…' : 'Click or drop an image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
            </label>
          </TabsContent>
          <TabsContent value="link" className="space-y-2">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
            />
            <Button
              size="sm"
              onClick={() => {
                if (linkUrl.trim()) {
                  onCommit(linkUrl.trim())
                  onClose()
                }
              }}
              disabled={!linkUrl.trim()}
            >
              Use this URL
            </Button>
          </TabsContent>
          <TabsContent value="gradient">
            <div className="grid grid-cols-4 gap-2">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    onCommit(g)
                    onClose()
                  }}
                  className="h-12 rounded-md border transition-transform hover:scale-105"
                  style={{ backgroundImage: g, backgroundSize: 'cover' }}
                  aria-label="Select gradient"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex justify-between">
          {currentCover ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCommit(null)
                onClose()
              }}
              className="gap-1"
            >
              <XIcon className="size-3.5" />
              Remove cover
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
