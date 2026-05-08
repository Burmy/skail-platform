'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArchiveIcon,
  CalendarIcon,
  ChartBarIcon,
  ClipboardListIcon,
  CopyIcon,
  KanbanIcon,
  LayoutGridIcon,
  LayoutListIcon,
  LayoutPanelLeftIcon,
  ListIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RectangleHorizontalIcon,
  TableIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  archiveView,
  createView,
  renameView,
} from '@/app/databases/actions'
import {
  VIEW_TYPE_META,
  VIEW_TYPES,
  type SavedViewType,
  type SavedViewWithConfig,
} from '@/lib/views/types'

const VIEW_ICONS: Record<SavedViewType, typeof TableIcon> = {
  table: TableIcon,
  kanban: KanbanIcon,
  gallery: LayoutGridIcon,
  list: ListIcon,
  calendar: CalendarIcon,
  timeline: RectangleHorizontalIcon,
  chart: ChartBarIcon,
  dashboard: LayoutPanelLeftIcon,
  map: MapPinIcon,
  form: ClipboardListIcon,
}

export type ViewTabsProps = {
  workspaceId: string
  collectionId: string
  views: SavedViewWithConfig[]
  activeViewId: string
  onArchiveView?: (view: SavedViewWithConfig) => void
}

export function ViewTabs(props: ViewTabsProps) {
  const { workspaceId, collectionId, views, activeViewId, onArchiveView } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function measure() {
      if (!container) return
      // Reserve 180px for "More" button + "Add view" trigger
      const available = container.clientWidth - 180
      let cumulative = 0
      const next = new Set<string>()
      for (const view of views) {
        const el = tabRefs.current.get(view.id)
        if (!el) continue
        const width = el.scrollWidth + 4
        // Always keep the active tab visible.
        if (view.id === activeViewId) {
          cumulative += width
          continue
        }
        if (cumulative + width > available) {
          next.add(view.id)
        } else {
          cumulative += width
        }
      }
      setHiddenIds(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    return () => ro.disconnect()
  }, [views, activeViewId])

  const hiddenViews = views.filter((v) => hiddenIds.has(v.id))

  return (
    <div ref={containerRef} className="flex items-center gap-1 overflow-hidden border-b">
      {views.map((view) => (
        <div
          key={view.id}
          ref={(el) => {
            if (el) tabRefs.current.set(view.id, el)
            else tabRefs.current.delete(view.id)
          }}
          className={hiddenIds.has(view.id) ? 'pointer-events-none invisible absolute' : 'flex'}
        >
          <ViewTab
            workspaceId={workspaceId}
            collectionId={collectionId}
            view={view}
            isActive={view.id === activeViewId}
            onArchiveView={onArchiveView}
          />
        </div>
      ))}
      {hiddenViews.length > 0 ? (
        <MoreViewsDropdown
          workspaceId={workspaceId}
          collectionId={collectionId}
          views={hiddenViews}
          activeViewId={activeViewId}
        />
      ) : null}
      <AddViewPopover workspaceId={workspaceId} collectionId={collectionId} />
    </div>
  )
}

function MoreViewsDropdown({
  workspaceId,
  collectionId,
  views,
  activeViewId,
}: {
  workspaceId: string
  collectionId: string
  views: SavedViewWithConfig[]
  activeViewId: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="ml-1 h-7 gap-1 px-2 text-xs">
          <MoreHorizontalIcon className="size-3.5" />
          More
          <span className="rounded-full bg-muted px-1 text-[10px] text-muted-foreground">
            {views.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {views.map((view) => {
          const Icon = VIEW_ICONS[view.view_type] ?? TableIcon
          return (
            <DropdownMenuItem key={view.id} asChild>
              <Link
                href={`/databases/${collectionId}?workspace_id=${workspaceId}&view=${view.id}`}
                className="flex items-center gap-2"
              >
                <Icon className="size-3.5" />
                <span className="truncate">{view.name}</span>
                {view.id === activeViewId ? (
                  <span className="ml-auto text-[10px] text-muted-foreground">active</span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewTab({
  workspaceId,
  collectionId,
  view,
  isActive,
  onArchiveView,
}: {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  isActive: boolean
  onArchiveView?: (view: SavedViewWithConfig) => void
}) {
  const Icon = VIEW_ICONS[view.view_type] ?? TableIcon

  return (
    <div
      className={cn(
        'group relative flex items-center gap-1 border-b-2 px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Link
        href={`/databases/${collectionId}?workspace_id=${workspaceId}&view=${view.id}`}
        className="flex items-center gap-1.5"
      >
        <Icon className="size-3.5" />
        <span className={cn(isActive && 'font-medium')}>{view.name}</span>
      </Link>
      {isActive ? (
        <ViewMenu workspaceId={workspaceId} view={view} onArchiveView={onArchiveView} />
      ) : null}
    </div>
  )
}

function ViewMenu({
  workspaceId,
  view,
  onArchiveView,
}: {
  workspaceId: string
  view: SavedViewWithConfig
  onArchiveView?: (view: SavedViewWithConfig) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [name, setName] = useState(view.name)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-5" aria-label="View menu">
            <MoreHorizontalIcon className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <PencilIcon className="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              startTransition(async () => {
                const result = await createView({
                  workspaceId,
                  collectionId: view.collection_id!,
                  name: `${view.name} copy`,
                  viewType: view.view_type,
                  duplicateFromViewId: view.id,
                })
                if (result.ok && result.data) {
                  router.push(
                    `/databases/${view.collection_id}?workspace_id=${workspaceId}&view=${result.data.id}`,
                  )
                }
              })
            }}
          >
            <CopyIcon className="size-3.5" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              setOpen(false)
              onArchiveView?.(view)
            }}
          >
            <ArchiveIcon className="size-3.5" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renameOpen ? (
        <Popover open onOpenChange={setRenameOpen}>
          <PopoverTrigger asChild>
            <span className="sr-only" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  await renameView({ workspaceId, viewId: view.id, name: name.trim() || view.name })
                  setRenameOpen(false)
                  router.refresh()
                })
              }}
              className="flex flex-col gap-2"
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  Save
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>
      ) : null}

    </>
  )
}

function AddViewPopover({
  workspaceId,
  collectionId,
}: {
  workspaceId: string
  collectionId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<SavedViewType>('table')
  const [pending, startTransition] = useTransition()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="ml-1 gap-1">
          <PlusIcon className="size-3.5" />
          <span className="text-xs">Add view</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(async () => {
              const trimmed = name.trim() || VIEW_TYPE_META[type].label
              const result = await createView({
                workspaceId,
                collectionId,
                name: trimmed,
                viewType: type,
              })
              if (result.ok && result.data) {
                setOpen(false)
                setName('')
                router.push(
                  `/databases/${collectionId}?workspace_id=${workspaceId}&view=${result.data.id}`,
                )
              }
            })
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Type</span>
            <div className="grid grid-cols-3 gap-1">
              {VIEW_TYPES.map((t) => {
                const Icon = VIEW_ICONS[t]
                const active = t === type
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition-colors',
                      active
                        ? 'border-foreground bg-accent'
                        : 'border-border text-muted-foreground hover:bg-accent/40',
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{VIEW_TYPE_META[t].label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="view-name" className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={VIEW_TYPE_META[type].label}
              maxLength={80}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Adding…' : 'Add view'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
