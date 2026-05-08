'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  AtSignIcon,
  BookmarkIcon,
  Code2Icon,
  Columns3Icon,
  LinkIcon,
  Loader2Icon,
  RefreshCwIcon,
} from 'lucide-react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { SuggestionMenuController } from '@blocknote/react'
import '@blocknote/shadcn/style.css'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { savePageDocument } from '@/app/pages/actions'
import { skailBlockSchema } from './blocks'
import {
  getSkailSlashMenuItems,
  filterSkailSlashMenuItems,
} from './blocks/slash-menu'
import {
  SourcePickerDialog,
  type SourceSelection,
  type ViewTypeHint,
} from './source-picker-dialog'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
type BlockSpan = 1 | 2 | 3
type PageLayoutMetadata = {
  blocks: Record<string, { span: BlockSpan }>
}
type SelectedBlockState = {
  id: string
  type: string
  rect: { top: number; left: number; right: number } | null
}
type PasteMenuState = {
  url: string
  blockId: string
  x: number
  y: number
}
type PasteChoice = 'mention' | 'bookmark' | 'embed' | 'url'
type LinkPreview = {
  url: string
  title: string
  description: string
  imageUrl: string
  faviconUrl: string
  siteName: string
  embedUrl: string
  provider: string
  canEmbed: boolean
}

type EditorBlockLike = {
  id: string
  type: string
  children?: EditorBlockLike[]
}

type EditorRuntime = {
  document: EditorBlockLike[]
  getTextCursorPosition?: () => { block?: EditorBlockLike }
  getSelectionBoundingBox?: () => DOMRect | undefined
  insertBlocks?: (
    blocks: unknown[],
    referenceBlock: string | EditorBlockLike,
    placement?: 'before' | 'after',
  ) => unknown[]
}

export function PageEditor({
  workspaceId,
  pageId,
  initialContent,
  initialVersion,
  readOnly,
}: {
  workspaceId: string
  pageId: string
  initialContent: unknown
  initialVersion: number
  readOnly?: boolean
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const blockNoteTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  const versionRef = useRef(initialVersion)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef<PageLayoutMetadata>(parseInitialLayout(initialContent))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [layout, setLayout] = useState<PageLayoutMetadata>(() =>
    parseInitialLayout(initialContent),
  )
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlockState | null>(null)
  const [pasteMenu, setPasteMenu] = useState<PasteMenuState | null>(null)
  const [pasteBusy, setPasteBusy] = useState<PasteChoice | null>(null)

  // Source picker for database blocks (resolved from slash menu).
  const sourceResolverRef = useRef<{
    resolve: (selection: SourceSelection | null) => void
    viewType: ViewTypeHint
    chartSubtype: string | null
  } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerRequestedViewType, setPickerRequestedViewType] =
    useState<ViewTypeHint | null>(null)

  function pickDatabaseSource(viewType: string, chartSubtype?: string) {
    const requestedViewType = coerceViewTypeHint(viewType)
    return new Promise<{
      sourceType: 'collection' | 'view'
      sourceId: string
      sourceName: string
      collectionId: string
      viewType: string
    } | null>((resolve) => {
      sourceResolverRef.current = {
        resolve: (sel) => {
          if (!sel) {
            resolve(null)
            return
          }
          if (sel.kind === 'collection') {
            resolve({
              sourceType: 'collection',
              sourceId: sel.id,
              sourceName: sel.name,
              collectionId: sel.id,
              viewType: requestedViewType,
            })
          } else {
            resolve({
              sourceType: 'view',
              sourceId: sel.id,
              sourceName: sel.name,
              collectionId: sel.collectionId,
              viewType: sel.viewType,
            })
          }
        },
        viewType: requestedViewType,
        chartSubtype: chartSubtype ?? null,
      }
      setPickerRequestedViewType(requestedViewType)
      setPickerOpen(true)
    })
  }

  function onPickerSelect(selection: SourceSelection) {
    sourceResolverRef.current?.resolve(selection)
    sourceResolverRef.current = null
  }

  function onPickerClose() {
    setPickerOpen(false)
    setPickerRequestedViewType(null)
    if (sourceResolverRef.current) {
      sourceResolverRef.current.resolve(null)
      sourceResolverRef.current = null
    }
  }

  // Build editor with SKAIL schema + initial content
  const editor = useCreateBlockNote({
    schema: skailBlockSchema,
    initialContent: parseInitial(initialContent),
    uploadFile: async (file) => uploadPageAsset(workspaceId, pageId, file),
  })

  const flushSave = useCallback(
    async (clientRequestId?: string) => {
      const document = editor.document
      setStatus('saving')
      const result = await savePageDocument({
        workspaceId,
        pageId,
        contentJson: {
          blocks: document,
          layout: layoutRef.current,
        } as never,
        expectedVersion: versionRef.current,
        clientRequestId,
      })
      if (result.ok && result.data) {
        versionRef.current = result.data.version
        setStatus('saved')
        window.setTimeout(() => setStatus('idle'), 1500)
      } else if (!result.ok && result.error.startsWith('Page changed elsewhere')) {
        setStatus('conflict')
      } else {
        setStatus('error')
      }
    },
    [editor, pageId, workspaceId],
  )

  const scheduleSave = useCallback(
    (delay = 800) => {
      if (readOnly) return
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        void flushSave()
      }, delay)
    },
    [flushSave, readOnly],
  )

  // Debounced autosave on every change
  useEffect(() => {
    if (readOnly) return
    const off = editor.onChange(() => {
      applyBlockLayoutAttributes(editorHostRef.current, editor.document, layoutRef.current)
      scheduleSave()
    })
    return () => {
      off?.()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [editor, readOnly, scheduleSave])

  useEffect(() => {
    layoutRef.current = layout
    const frame = window.requestAnimationFrame(() => {
      applyBlockLayoutAttributes(editorHostRef.current, editor.document, layout)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editor, layout])

  function handleSelectionChange() {
    const runtime = editor as unknown as EditorRuntime
    const block = runtime.getTextCursorPosition?.().block
    if (!block?.id) {
      setSelectedBlock(null)
      return
    }
    const rect = runtime.getSelectionBoundingBox?.()
    setSelectedBlock({
      id: block.id,
      type: block.type,
      rect: rect
        ? { top: rect.top, left: rect.left, right: rect.right }
        : null,
    })
  }

  function updateBlockSpan(blockId: string, blockType: string, span: BlockSpan) {
    const nextSpan = blockType === 'database_view' && span === 1 ? 2 : span
    setLayout((current) => {
      const next = {
        ...current,
        blocks: {
          ...current.blocks,
          [blockId]: { span: nextSpan },
        },
      }
      layoutRef.current = next
      return next
    })
    scheduleSave(250)
  }

  function handlePasteCapture(event: ReactClipboardEvent<HTMLDivElement>) {
    if (readOnly) return
    const text = event.clipboardData.getData('text/plain').trim()
    const normalizedUrl = normalizeHttpUrl(text)
    if (!normalizedUrl) return

    const runtime = editor as unknown as EditorRuntime
    const block = runtime.getTextCursorPosition?.().block ?? runtime.document[0]
    if (!block?.id) return

    event.preventDefault()
    const rect = runtime.getSelectionBoundingBox?.()
    setPasteMenu({
      url: normalizedUrl,
      blockId: block.id,
      x: clamp((rect?.left ?? window.innerWidth / 2) + 8, 16, window.innerWidth - 292),
      y: clamp((rect?.bottom ?? window.innerHeight / 2) + 8, 16, window.innerHeight - 220),
    })
  }

  async function handlePasteChoice(choice: PasteChoice) {
    if (!pasteMenu) return
    const current = pasteMenu
    setPasteBusy(choice)
    try {
      let preview: LinkPreview | null = null
      if (choice !== 'url') {
        preview = await fetchLinkPreview(current.url)
      }

      if (choice === 'mention') {
        const internalPageId = getInternalPageId(current.url)
        insertBlocksAfter(editor, current.blockId, [
          internalPageId
            ? {
                type: 'page_link',
                props: { pageId: internalPageId, workspaceId },
              }
            : {
                type: 'web_mention',
                props: {
                  url: current.url,
                  title: preview?.title || preview?.siteName || '',
                  faviconUrl: preview?.faviconUrl || '',
                },
              },
        ])
      } else if (choice === 'bookmark') {
        insertBlocksAfter(editor, current.blockId, [
          {
            type: 'web_bookmark',
            props: {
              url: current.url,
              title: preview?.title || '',
              description: preview?.description || '',
              imageUrl: preview?.imageUrl || '',
              faviconUrl: preview?.faviconUrl || '',
              siteName: preview?.siteName || '',
            },
          },
        ])
      } else if (choice === 'embed') {
        if (preview?.canEmbed && preview.embedUrl) {
          insertBlocksAfter(editor, current.blockId, [
            {
              type: 'web_embed',
              props: {
                url: current.url,
                title: preview.title || preview.provider || '',
                embedUrl: preview.embedUrl,
                provider: preview.provider || '',
              },
            },
          ])
        } else {
          insertBlocksAfter(editor, current.blockId, [
            {
              type: 'web_bookmark',
              props: {
                url: current.url,
                title: preview?.title || '',
                description: preview?.description || '',
                imageUrl: preview?.imageUrl || '',
                faviconUrl: preview?.faviconUrl || '',
                siteName: preview?.siteName || '',
              },
            },
          ])
        }
      } else {
        insertBlocksAfter(editor, current.blockId, [
          { type: 'paragraph', content: current.url },
        ])
      }
      setPasteMenu(null)
      scheduleSave(150)
    } finally {
      setPasteBusy(null)
    }
  }

  return (
    <div className="relative">
      <SaveBadge
        status={status}
        onReload={() => router.refresh()}
      />

      <div
        ref={editorHostRef}
        className="skail-page-editor-grid"
        onPasteCapture={handlePasteCapture}
      >
        <BlockNoteView
          editor={editor as never}
          editable={!readOnly}
          slashMenu={false}
          theme={blockNoteTheme}
          onSelectionChange={handleSelectionChange}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSkailSlashMenuItems(
                getSkailSlashMenuItems(editor as never, {
                  workspaceId,
                  pageId,
                  onPickDatabaseSource: pickDatabaseSource,
                }),
                query,
              )
            }
          />
        </BlockNoteView>
      </div>

      {!readOnly && selectedBlock ? (
        <BlockWidthMenu
          block={selectedBlock}
          span={layout.blocks[selectedBlock.id]?.span ?? 3}
          onChange={(span) =>
            updateBlockSpan(selectedBlock.id, selectedBlock.type, span)
          }
        />
      ) : null}

      {pasteMenu ? (
        <PasteAsMenu
          state={pasteMenu}
          busy={pasteBusy}
          onPick={(choice) => void handlePasteChoice(choice)}
          onClose={() => setPasteMenu(null)}
        />
      ) : null}

      <SourcePickerDialog
        open={pickerOpen}
        onClose={onPickerClose}
        onSelect={onPickerSelect}
        workspaceId={workspaceId}
        initialTab="view"
        requestedViewType={pickerRequestedViewType}
      />
    </div>
  )
}

function BlockWidthMenu({
  block,
  span,
  onChange,
}: {
  block: SelectedBlockState
  span: BlockSpan
  onChange: (span: BlockSpan) => void
}) {
  const isDatabase = block.type === 'database_view'
  const left = block.rect
    ? clamp(block.rect.right - 214, 16, window.innerWidth - 232)
    : 24
  const top = block.rect ? clamp(block.rect.top - 42, 56, window.innerHeight - 64) : 72

  return (
    <div
      className="fixed z-40 flex items-center gap-1 rounded-md border bg-popover p-1 text-xs text-popover-foreground shadow-md"
      style={{ left, top }}
      aria-label="Block width"
    >
      <Columns3Icon className="mx-1 size-3.5 text-muted-foreground" />
      {([1, 2, 3] as const).map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={span === value ? 'secondary' : 'ghost'}
          className="h-7 px-2 text-xs"
          disabled={isDatabase && value === 1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(value)}
        >
          {value === 1 ? '1/3' : value === 2 ? '2/3' : 'Full'}
        </Button>
      ))}
    </div>
  )
}

function PasteAsMenu({
  state,
  busy,
  onPick,
  onClose,
}: {
  state: PasteMenuState
  busy: PasteChoice | null
  onPick: (choice: PasteChoice) => void
  onClose: () => void
}) {
  const options: Array<{
    value: PasteChoice
    label: string
    description: string
    icon: typeof LinkIcon
  }> = [
    {
      value: 'mention',
      label: 'Mention',
      description: 'Compact inline-style reference',
      icon: AtSignIcon,
    },
    {
      value: 'bookmark',
      label: 'Bookmark',
      description: 'Rich preview card',
      icon: BookmarkIcon,
    },
    {
      value: 'embed',
      label: 'Embed',
      description: 'Safe supported providers only',
      icon: Code2Icon,
    },
    {
      value: 'url',
      label: 'URL',
      description: 'Plain linked address',
      icon: LinkIcon,
    },
  ]

  return (
    <div
      className="fixed z-50 w-72 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: state.x, top: state.y }}
      role="menu"
      aria-label="Paste as"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">
        Paste as
      </div>
      {options.map((option) => {
        const Icon = option.icon
        const disabled = busy !== null
        return (
          <button
            key={option.value}
            type="button"
            className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(option.value)}
          >
            <Icon className="mt-0.5 size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {busy === option.value ? 'Loading...' : option.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </button>
        )
      })}
      <div className="mt-1 border-t px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className="block truncate">{state.url}</span>
      </div>
    </div>
  )
}

function SaveBadge({
  status,
  onReload,
}: {
  status: SaveStatus
  onReload: () => void
}) {
  if (status === 'idle') return null
  return (
    <div
      className={cn(
        'pointer-events-none fixed right-4 top-16 z-30 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs shadow-sm',
        status === 'error' && 'border-destructive text-destructive',
        status === 'conflict' && 'pointer-events-auto border-warning text-warning-foreground bg-warning/10',
      )}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' ? (
        <>
          <Loader2Icon className="size-3 animate-spin" />
          Saving…
        </>
      ) : status === 'saved' ? (
        <>Saved</>
      ) : status === 'error' ? (
        <>Save failed</>
      ) : (
        <>
          <RefreshCwIcon className="size-3" />
          Page changed elsewhere
          <Button
            size="sm"
            variant="ghost"
            className="ml-2 h-5 px-1 text-xs"
            onClick={onReload}
          >
            Reload
          </Button>
        </>
      )}
    </div>
  )
}

function parseInitial(content: unknown) {
  if (
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    'blocks' in content
  ) {
    const blocks = (content as { blocks?: unknown }).blocks
    if (Array.isArray(blocks) && blocks.length > 0) {
      return blocks as never
    }
  }
  return undefined
}

function parseInitialLayout(content: unknown): PageLayoutMetadata {
  if (
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    'layout' in content
  ) {
    const layout = (content as { layout?: unknown }).layout
    if (
      layout &&
      typeof layout === 'object' &&
      !Array.isArray(layout) &&
      'blocks' in layout
    ) {
      const rawBlocks = (layout as { blocks?: unknown }).blocks
      if (rawBlocks && typeof rawBlocks === 'object' && !Array.isArray(rawBlocks)) {
        const blocks: PageLayoutMetadata['blocks'] = {}
        for (const [blockId, value] of Object.entries(rawBlocks)) {
          if (!value || typeof value !== 'object' || Array.isArray(value)) continue
          const span = (value as { span?: unknown }).span
          if (span === 1 || span === 2 || span === 3) {
            blocks[blockId] = { span }
          }
        }
        return { blocks }
      }
    }
  }
  return { blocks: {} }
}

function applyBlockLayoutAttributes(
  host: HTMLDivElement | null,
  document: EditorBlockLike[],
  layout: PageLayoutMetadata,
) {
  if (!host) return
  const blockTypes = new Map<string, string>()
  collectBlockTypes(document, blockTypes)
  host.querySelectorAll<HTMLElement>('.bn-block-outer[data-id]').forEach((node) => {
    const blockId = node.dataset.id
    if (!blockId) return
    const blockType = blockTypes.get(blockId) ?? ''
    const rawSpan = layout.blocks[blockId]?.span ?? 3
    const span = blockType === 'database_view' && rawSpan === 1 ? 2 : rawSpan
    node.dataset.skailSpan = String(span)
    node.dataset.skailBlockType = blockType
  })
}

function collectBlockTypes(blocks: EditorBlockLike[], map: Map<string, string>) {
  for (const block of blocks) {
    map.set(block.id, block.type)
    if (Array.isArray(block.children)) collectBlockTypes(block.children, map)
  }
}

function normalizeHttpUrl(value: string) {
  if (!value || /\s/.test(value.replace(/^https?:\/\//i, ''))) return null
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function getInternalPageId(url: string) {
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.origin !== window.location.origin) return null
    const match = parsed.pathname.match(/^\/p\/([^/]+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function insertBlocksAfter(
  editor: unknown,
  blockId: string,
  blocks: Array<Record<string, unknown>>,
) {
  const runtime = editor as EditorRuntime
  runtime.insertBlocks?.(blocks, blockId, 'after')
}

async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const response = await fetch(
    `/api/pages/link-preview?url=${encodeURIComponent(url)}`,
  )
  if (!response.ok) {
    return {
      url,
      title: '',
      description: '',
      imageUrl: '',
      faviconUrl: '',
      siteName: '',
      embedUrl: '',
      provider: '',
      canEmbed: false,
    }
  }
  return (await response.json()) as LinkPreview
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function coerceViewTypeHint(value: string): ViewTypeHint {
  if (
    value === 'table' ||
    value === 'kanban' ||
    value === 'gallery' ||
    value === 'list' ||
    value === 'calendar' ||
    value === 'timeline' ||
    value === 'chart' ||
    value === 'dashboard' ||
    value === 'map' ||
    value === 'form'
  ) {
    return value
  }
  return 'table'
}

async function uploadPageAsset(
  workspaceId: string,
  pageId: string,
  file: File,
): Promise<string> {
  const fd = new FormData()
  fd.set('workspaceId', workspaceId)
  fd.set('pageId', pageId)
  fd.set('blockId', `inline-${crypto.randomUUID()}`)
  fd.set('file', file)
  const resp = await fetch('/api/pages/assets/upload', { method: 'POST', body: fd })
  if (!resp.ok) {
    const j = (await resp.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error ?? 'Upload failed')
  }
  const json = (await resp.json()) as { signedUrl?: string }
  return json.signedUrl ?? ''
}
