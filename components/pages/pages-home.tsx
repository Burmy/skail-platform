'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  PlusIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createPage, createStack } from '@/app/pages/actions'
import type {
  RecentPage,
  StackTreeEntry,
} from '@/lib/pages/queries'

export function PagesHome({
  workspaceId,
  recents,
  stacks,
}: {
  workspaceId: string
  recents: RecentPage[]
  stacks: StackTreeEntry[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleNewPage() {
    startTransition(async () => {
      const result = await createPage({ workspaceId })
      if (result.ok && result.data) {
        router.push(`/p/${result.data.id}`)
      }
    })
  }

  function handleNewStack() {
    startTransition(async () => {
      await createStack({ workspaceId, name: 'New stack' })
      router.refresh()
    })
  }

  const totalPages = stacks.reduce((sum, e) => sum + countPages(e.pages), 0)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'} across{' '}
            {stacks.filter((s) => s.stack).length}{' '}
            {stacks.filter((s) => s.stack).length === 1 ? 'stack' : 'stacks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewStack} className="gap-1">
            <LayersIcon className="size-3.5" />
            New stack
          </Button>
          <Button size="sm" onClick={handleNewPage} className="gap-1">
            <PlusIcon className="size-3.5" />
            New page
          </Button>
        </div>
      </header>

      {/* Recents grid */}
      {recents.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Recents
          </h2>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {recents.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/p/${r.id}`}
                  className="flex h-24 flex-col gap-1 rounded-md border bg-card p-3 transition-colors hover:border-foreground/30 hover:bg-accent/30"
                >
                  <span className="text-base">
                    {r.icon ?? <FileTextIcon className="size-4 text-muted-foreground" />}
                  </span>
                  <span className="line-clamp-2 text-sm font-medium">
                    {r.title || 'Untitled'}
                  </span>
                  <span className="mt-auto text-[11px] text-muted-foreground">
                    {formatRelative(r.last_opened_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Stacks */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <LayersIcon className="size-3.5" />
          Stacks
        </h2>

        {stacks.length === 0 ? (
          <EmptyState onCreate={handleNewPage} />
        ) : (
          <ul className="space-y-6">
            {stacks.map((entry) => (
              <li key={entry.stack?.id ?? '__private__'}>
                <StackBlock entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StackBlock({ entry }: { entry: StackTreeEntry }) {
  const stackName = entry.stack?.name ?? 'Private'
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span>{stackName}</span>
        <span className="text-[11px] text-muted-foreground">
          {countPages(entry.pages)}{' '}
          {countPages(entry.pages) === 1 ? 'page' : 'pages'}
        </span>
      </h3>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {entry.pages.map((p) => (
          <li key={p.id}>
            <Link
              href={`/p/${p.id}`}
              className="flex h-20 flex-col gap-1 rounded-md border bg-card p-3 transition-colors hover:border-foreground/30 hover:bg-accent/30"
            >
              <span className="text-sm">
                {p.icon ?? <FileTextIcon className="size-4 text-muted-foreground" />}
              </span>
              <span className="line-clamp-2 text-sm font-medium">
                {p.title || 'Untitled'}
              </span>
            </Link>
          </li>
        ))}
        {entry.pages.length === 0 ? (
          <li className="col-span-full rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            No pages here yet.
          </li>
        ) : null}
      </ul>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed bg-muted/20 px-4 py-12 text-center">
      <FileTextIcon className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">No pages yet</p>
        <p className="text-xs text-muted-foreground">
          Create your first page to get started.
        </p>
      </div>
      <Button size="sm" onClick={onCreate} className="gap-1">
        <PlusIcon className="size-3.5" />
        New page
      </Button>
    </div>
  )
}

function countPages(nodes: { children: { id: string; children: unknown[] }[] }[]): number {
  let n = 0
  for (const node of nodes) {
    n++
    if (Array.isArray(node.children)) {
      n += countPages(
        node.children as unknown as {
          children: { id: string; children: unknown[] }[]
        }[],
      )
    }
  }
  return n
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

void cn // silence import lint when cn is unused in this trim
