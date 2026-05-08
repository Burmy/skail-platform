import Link from 'next/link'
import type { ReactNode } from 'react'
import { FileTextIcon, LogOutIcon, PlusIcon } from 'lucide-react'

import { signOut } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import type { StackTreeEntry, PageNode } from '@/lib/pages/queries'
import { cn } from '@/lib/utils'

function pageHref(pageId: string, workspaceId?: string, publicToken?: string) {
  if (publicToken) return `/share/${publicToken}?page=${pageId}`
  return `/p/${pageId}${workspaceId ? `?workspace_id=${workspaceId}` : ''}`
}

function PortalPageRows({
  pages,
  currentPageId,
  workspaceId,
  publicToken,
  depth = 0,
}: {
  pages: PageNode[]
  currentPageId: string
  workspaceId?: string
  publicToken?: string
  depth?: number
}) {
  return (
    <ul className="space-y-0.5">
      {pages.map((page) => (
        <li key={page.id}>
          <Link
            href={pageHref(page.id, workspaceId, publicToken)}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors',
              currentPageId === page.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            {page.icon ? (
              <span className="text-sm leading-none">{page.icon}</span>
            ) : (
              <FileTextIcon className="size-3.5" />
            )}
            <span className="truncate">{page.title}</span>
          </Link>
          {page.children.length > 0 ? (
            <PortalPageRows
              pages={page.children}
              currentPageId={currentPageId}
              workspaceId={workspaceId}
              publicToken={publicToken}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function PortalLayout({
  workspaceName,
  userEmail,
  tree,
  currentPageId,
  workspaceId,
  publicToken,
  children,
}: {
  workspaceName: string
  userEmail?: string | null
  tree: StackTreeEntry[]
  currentPageId: string
  workspaceId?: string
  publicToken?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {workspaceName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{workspaceName}</div>
            <div className="text-xs text-muted-foreground">Shared stack</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {tree.map((entry) => (
            <div key={entry.stack?.id ?? '__pages__'} className="mb-4">
              <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {entry.stack?.name ?? 'Pages'}
              </div>
              {entry.pages.length > 0 ? (
                <PortalPageRows
                  pages={entry.pages}
                  currentPageId={currentPageId}
                  workspaceId={workspaceId}
                  publicToken={publicToken}
                />
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">No pages.</p>
              )}
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {userEmail ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{userEmail}</div>
                <div className="text-xs text-muted-foreground">Shared access</div>
              </div>
              <form action={signOut}>
                <Button type="submit" size="icon-sm" variant="ghost" aria-label="Sign out">
                  <LogOutIcon className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild size="sm" variant="outline" className="w-full gap-2">
              <Link href="/signup">
                <PlusIcon className="size-4" />
                Create workspace
              </Link>
            </Button>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
