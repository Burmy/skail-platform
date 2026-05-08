'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  archivePage,
  archiveStack,
  createPage,
  createStack,
  movePage,
  renamePage,
  renameStack,
} from '@/app/pages/actions'
import type {
  PageNode,
  RecentPage,
  StackTreeEntry,
} from '@/lib/pages/queries'
import { ShareDialog } from './share-dialog'

type NavData = {
  recents: RecentPage[]
  stacks: StackTreeEntry[]
  trashCount: number
}

export function SidebarPagesSection({
  workspaceId,
}: {
  workspaceId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [data, setData] = useState<NavData | null>(null)
  const [collapsedStacks, setCollapsedStacks] = useState<Set<string>>(new Set())
  const [recentsExpanded, setRecentsExpanded] = useState(false)
  const [stacksExpanded, setStacksExpanded] = useState(true)
  const [, startTransition] = useTransition()

  const refresh = useCallback(async () => {
    const r = await fetch(
      `/api/pages/nav?workspaceId=${encodeURIComponent(workspaceId)}`,
    )
    if (r.ok) setData(await r.json())
  }, [workspaceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function onRefresh() {
      void refresh()
    }

    window.addEventListener('skail:pages-nav-refresh', onRefresh)
    return () => {
      window.removeEventListener('skail:pages-nav-refresh', onRefresh)
    }
  }, [refresh])

  if (!data) {
    return (
      <div className="space-y-1 px-2 py-1 text-[11px] text-muted-foreground">
        Loading…
      </div>
    )
  }

  function toggleStack(stackId: string) {
    setCollapsedStacks((prev) => {
      const next = new Set(prev)
      if (next.has(stackId)) next.delete(stackId)
      else next.add(stackId)
      return next
    })
  }

  function handleNewPage(stackId: string | null, parentPageId?: string) {
    startTransition(async () => {
      const result = await createPage({
        workspaceId,
        stackId,
        parentPageId: parentPageId ?? null,
      })
      if (result.ok && result.data) {
        await refresh()
        router.push(`/p/${result.data.id}`)
      }
    })
  }

  function handleNewStack() {
    startTransition(async () => {
      const result = await createStack({ workspaceId, name: 'New stack' })
      if (result.ok) await refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Recents */}
      {data.recents.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setRecentsExpanded((value) => !value)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            aria-expanded={recentsExpanded}
          >
            {recentsExpanded ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )}
            <ClockIcon className="size-3" />
            <span>Recents</span>
          </button>
          {recentsExpanded ? (
            <ul className="space-y-0.5">
              {data.recents.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <SidebarPageLink
                    pageId={r.id}
                    title={r.title}
                    icon={r.icon}
                    active={pathname === `/p/${r.id}`}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Stacks */}
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setStacksExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            aria-expanded={stacksExpanded}
          >
            {stacksExpanded ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )}
            <span>Stacks</span>
          </button>
          <button
            type="button"
            onClick={handleNewStack}
            className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="New stack"
            aria-label="New stack"
          >
            <PlusIcon className="size-3" />
          </button>
        </div>
        {stacksExpanded ? (
          <ul className="space-y-0.5">
            {data.stacks.map((entry) => (
              <li key={entry.stack?.id ?? '__private__'}>
                <StackNode
                  workspaceId={workspaceId}
                  entry={entry}
                  collapsed={
                    entry.stack ? collapsedStacks.has(entry.stack.id) : false
                  }
                  onToggle={() =>
                    entry.stack ? toggleStack(entry.stack.id) : undefined
                  }
                  onCreatePage={(parentId) =>
                    handleNewPage(entry.stack?.id ?? null, parentId)
                  }
                  onMutated={refresh}
                  pathname={pathname}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Trash */}
      {data.trashCount > 0 ? (
        <Link
          href="/pages/trash"
          className={cn(
            'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors',
            pathname === '/pages/trash'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
          )}
        >
          <Trash2Icon className="size-4" />
          Trash
          <span className="ml-auto text-[10px] text-muted-foreground">
            {data.trashCount}
          </span>
        </Link>
      ) : null}
    </div>
  )
}

function StackNode({
  workspaceId,
  entry,
  collapsed,
  onToggle,
  onCreatePage,
  onMutated,
  pathname,
}: {
  workspaceId: string
  entry: StackTreeEntry
  collapsed: boolean
  onToggle: () => void
  onCreatePage: (parentPageId?: string) => void
  onMutated: () => Promise<void> | void
  pathname: string
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.stack?.name ?? '')
  const [, startTransition] = useTransition()

  const stackName = entry.stack?.name ?? 'Private'
  const isPrivate = !entry.stack

  function commitRename() {
    if (!entry.stack) {
      setEditing(false)
      return
    }
    const trimmed = name.trim()
    if (!trimmed || trimmed === entry.stack.name) {
      setEditing(false)
      setName(entry.stack.name)
      return
    }
    startTransition(async () => {
      await renameStack({
        workspaceId,
        stackId: entry.stack!.id,
        name: trimmed,
      })
      setEditing(false)
      await onMutated()
    })
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="group flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-sidebar-accent/40">
            <button
              type="button"
              onClick={onToggle}
              className="text-muted-foreground hover:text-sidebar-foreground"
              aria-label={collapsed ? 'Expand stack' : 'Collapse stack'}
            >
              {collapsed ? (
                <ChevronRightIcon className="size-3" />
              ) : (
                <ChevronDownIcon className="size-3" />
              )}
            </button>
            {editing && entry.stack ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') {
                    setEditing(false)
                    setName(entry.stack!.name)
                  }
                }}
                className="h-6 flex-1 rounded-sm border bg-background px-1 text-xs"
              />
            ) : (
              <span
                onDoubleClick={() => !isPrivate && setEditing(true)}
                className="flex-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {stackName}
              </span>
            )}
            <button
              type="button"
              onClick={() => onCreatePage()}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              title="New page in stack"
              aria-label="New page in stack"
            >
              <PlusIcon className="size-3 text-muted-foreground" />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {!isPrivate ? (
            <ContextMenuItem onSelect={() => setEditing(true)}>
              Rename stack
            </ContextMenuItem>
          ) : null}
          {!isPrivate ? (
            <ShareDialog
              workspaceId={workspaceId}
              scopeType="stack"
              scopeId={entry.stack!.id}
              trigger={
                <ContextMenuItem onSelect={(event) => event.preventDefault()}>
                  <Share2Icon className="mr-2 size-4" />
                  Share stack
                </ContextMenuItem>
              }
            />
          ) : null}
          <ContextMenuItem onSelect={() => onCreatePage()}>
            New page
          </ContextMenuItem>
          {!isPrivate ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive"
                onSelect={() => {
                  startTransition(async () => {
                    await archiveStack({
                      workspaceId,
                      stackId: entry.stack!.id,
                    })
                    await onMutated()
                  })
                }}
              >
                Archive stack
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>

      {!collapsed ? (
        <ul className="ml-3 space-y-0.5 border-l border-sidebar-border/40 pl-1">
          {entry.pages.map((node) => (
            <PageTreeRow
              key={node.id}
              node={node}
              workspaceId={workspaceId}
              stackId={entry.stack?.id ?? null}
              onCreatePage={onCreatePage}
              onMutated={onMutated}
              pathname={pathname}
            />
          ))}
          {entry.pages.length === 0 ? (
            <li className="px-2 py-1 text-[11px] text-muted-foreground">
              No pages yet.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

function PageTreeRow({
  node,
  workspaceId,
  stackId,
  onCreatePage,
  onMutated,
  pathname,
}: {
  node: PageNode
  workspaceId: string
  stackId: string | null
  onCreatePage: (parentPageId: string) => void
  onMutated: () => Promise<void> | void
  pathname: string
}) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(node.title)
  const [, startTransition] = useTransition()

  function commitRename() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === node.title) {
      setEditing(false)
      setTitle(node.title)
      return
    }
    startTransition(async () => {
      await renamePage({
        workspaceId,
        pageId: node.id,
        title: trimmed,
      })
      setEditing(false)
      await onMutated()
    })
  }

  const active = pathname === `/p/${node.id}`

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'group flex h-7 items-center gap-1 rounded-md px-1 transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/40',
            )}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'application/x-skail-page',
                JSON.stringify({ id: node.id, stackId, parentId: node.parent_page_id }),
              )
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const raw = e.dataTransfer.getData('application/x-skail-page')
              if (!raw) return
              try {
                const dragged = JSON.parse(raw) as { id: string }
                if (dragged.id === node.id) return
                startTransition(async () => {
                  await movePage({
                    workspaceId,
                    pageId: dragged.id,
                    stackId,
                    parentPageId: node.id,
                  })
                  await onMutated()
                })
              } catch {
                /* ignore */
              }
            }}
          >
            {node.children.length > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground"
                aria-label="Toggle children"
              >
                {expanded ? (
                  <ChevronDownIcon className="size-3" />
                ) : (
                  <ChevronRightIcon className="size-3" />
                )}
              </button>
            ) : (
              <span className="size-3" />
            )}
            {node.icon ? (
              <span className="text-sm leading-none">{node.icon}</span>
            ) : (
              <FileTextIcon className="size-3.5 text-muted-foreground" />
            )}
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') {
                    setEditing(false)
                    setTitle(node.title)
                  }
                }}
                className="h-6 flex-1 rounded-sm border bg-background px-1 text-sm"
              />
            ) : (
              <Link
                href={`/p/${node.id}`}
                className="flex-1 truncate text-sm"
                onDoubleClick={(e) => {
                  e.preventDefault()
                  setEditing(true)
                }}
              >
                {node.title}
              </Link>
            )}
            <button
              type="button"
              onClick={() => onCreatePage(node.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="New subpage"
            >
              <PlusIcon className="size-3 text-muted-foreground" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Open page actions for ${node.title}`}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontalIcon className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <ShareDialog
                  workspaceId={workspaceId}
                  scopeType="page"
                  scopeId={node.id}
                  trigger={
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                      <Share2Icon className="size-4" />
                      Share
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCreatePage(node.id)}>
                  New subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    startTransition(async () => {
                      await archivePage({ workspaceId, pageId: node.id })
                      await onMutated()
                    })
                  }}
                >
                  <Trash2Icon className="size-4" />
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ShareDialog
            workspaceId={workspaceId}
            scopeType="page"
            scopeId={node.id}
            trigger={
              <ContextMenuItem onSelect={(event) => event.preventDefault()}>
                <Share2Icon className="mr-2 size-4" />
                Share
              </ContextMenuItem>
            }
          />
          <ContextMenuItem onSelect={() => setEditing(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onCreatePage(node.id)}>
            New subpage
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive"
            onSelect={() => {
              startTransition(async () => {
                await archivePage({ workspaceId, pageId: node.id })
                await onMutated()
              })
            }}
          >
            Move to Trash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {expanded && node.children.length > 0 ? (
        <ul className="ml-4 space-y-0.5 border-l border-sidebar-border/40 pl-1">
          {node.children.map((child) => (
            <PageTreeRow
              key={child.id}
              node={child}
              workspaceId={workspaceId}
              stackId={stackId}
              onCreatePage={onCreatePage}
              onMutated={onMutated}
              pathname={pathname}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function SidebarPageLink({
  pageId,
  title,
  icon,
  active,
}: {
  pageId: string
  title: string
  icon: string | null
  active: boolean
}) {
  return (
    <Link
      href={`/p/${pageId}`}
      className={cn(
        'flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
      )}
    >
      {icon ? (
        <span className="text-sm leading-none">{icon}</span>
      ) : (
        <FileTextIcon className="size-3.5" />
      )}
      <span className="truncate">{title}</span>
    </Link>
  )
}
