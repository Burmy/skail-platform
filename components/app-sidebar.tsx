'use client'

import { useState, useTransition, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Database,
  Home,
  LayoutGrid,
  LogOut,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'

import { signOut } from '@/app/auth/actions'
import { createPage } from '@/app/pages/actions'
import type { DashboardWorkspace } from '@/components/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { homeNav, skailApps } from '@/lib/data'
import { cn } from '@/lib/utils'

import { SidebarPagesSection } from './pages/sidebar-pages-section'

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Home,
  Database,
  LayoutGrid,
  Copy,
  Sparkles,
  Bot,
  Zap,
  Settings,
  Palette,
}

type AppSidebarProps = {
  className?: string
  onNavigate?: () => void
  variant?: 'desktop' | 'mobile'
  workspace?: DashboardWorkspace | null
  workspaces?: DashboardWorkspace[]
  userEmail?: string | null
}

function initialsFromEmail(email?: string | null) {
  if (!email) return 'U'
  return email.slice(0, 2).toUpperCase()
}

function appHref(href: string, workspaceId?: string) {
  if (!workspaceId) return href
  if (href === '/settings') return `/workspaces/${workspaceId}/settings`
  return `${href}?workspace_id=${workspaceId}`
}

export function AppSidebar({
  className,
  onNavigate,
  variant = 'desktop',
  workspace,
  workspaces = [],
  userEmail,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [appsExpanded, setAppsExpanded] = useState(false)
  const [, startTransition] = useTransition()
  const isMobile = variant === 'mobile'
  const isCollapsed = collapsed && !isMobile
  const workspaceId = workspace?.id
  const homeHref = workspaceId ? `/workspaces/${workspaceId}` : '/'
  const displayName = workspace?.brand_name || workspace?.name || 'SKAIL'
  const userInitials = initialsFromEmail(userEmail)

  function handleNewPage() {
    if (!workspaceId) return
    startTransition(async () => {
      const result = await createPage({ workspaceId })
      if (result.ok && result.data) {
        window.dispatchEvent(new CustomEvent('skail:pages-nav-refresh'))
        router.push(`/p/${result.data.id}`)
        onNavigate?.()
      }
    })
  }

  return (
    <aside
      className={cn(
        'flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
        isCollapsed ? 'w-16' : 'w-64',
        isMobile ? 'h-full w-full border-r-0' : 'sticky top-0 h-dvh',
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            isCollapsed && 'pointer-events-none mx-auto',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          {!isCollapsed ? (
            <span
              className="truncate text-[15px] font-semibold tracking-normal text-sidebar-foreground"
              data-skail-brand
            >
              {displayName}
            </span>
          ) : null}
        </Link>
        {!isMobile && !isCollapsed ? (
          <Button
            aria-label="Collapse sidebar"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(true)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
        ) : null}
      </div>

      {!isCollapsed && workspaces.length > 1 ? (
        <div className="border-b border-sidebar-border/70 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-full justify-between bg-background/55"
                size="sm"
                variant="outline"
              >
                <span className="truncate">{workspace?.name}</span>
                <ChevronsUpDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((item) => (
                <DropdownMenuItem asChild key={item.id}>
                  <Link href={`/workspaces/${item.id}`} onClick={onNavigate}>
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!isCollapsed ? (
          <>
            <Link
              href={homeHref}
              onClick={onNavigate}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors',
                pathname === homeNav.href || pathname.startsWith('/workspaces/')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
              )}
            >
              <Home className="size-4" />
              <span>Home</span>
            </Link>

            {workspaceId ? (
              <div className="mt-2">
                <SidebarPagesSection workspaceId={workspaceId} />
              </div>
            ) : null}

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setAppsExpanded((value) => !value)}
                className="flex w-full items-center justify-between gap-1 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                aria-expanded={appsExpanded}
              >
                <span>SKAIL Apps</span>
                {appsExpanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </button>
              {appsExpanded ? (
                <ul className="mt-0.5 space-y-0.5">
                  {skailApps.map((item) => {
                    const Icon = iconMap[item.icon] ?? Home
                    const href = appHref(item.href, workspaceId)
                    const activePath = href.split('?')[0]
                    const isActive =
                      pathname === activePath ||
                      (activePath !== '/settings' &&
                        pathname.startsWith(activePath))
                    return (
                      <li key={item.href}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          className={cn(
                            'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                          )}
                        >
                          <Icon className="size-4" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge ? (
                            <Badge
                              variant="secondary"
                              className="ml-auto border-primary/15 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                            >
                              {item.badge}
                            </Badge>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          </>
        ) : (
          <ul className="space-y-1">
            <li>
              <Link
                href={homeHref}
                onClick={onNavigate}
                className="flex h-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                title="Home"
              >
                <Home className="size-4" />
              </Link>
            </li>
            {skailApps.slice(0, 4).map((item) => {
              const Icon = iconMap[item.icon] ?? Home
              return (
                <li key={item.href}>
                  <Link
                    href={appHref(item.href, workspaceId)}
                    onClick={onNavigate}
                    className="flex h-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                    title={item.label}
                  >
                    <Icon className="size-4" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={handleNewPage}
            disabled={!workspaceId}
          >
            <Plus data-icon="inline-start" />
            New Page
          </Button>
        ) : (
          <Button
            aria-label="Expand sidebar"
            className="w-full"
            onClick={() => setCollapsed(false)}
            size="icon"
          >
            <Plus />
          </Button>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-2.5',
            isCollapsed && 'justify-center',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
            {userInitials}
          </div>
          {!isCollapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {userEmail ?? 'Signed in'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {workspace?.role_key ?? workspace?.plan_key ?? 'Member'}
                </p>
              </div>
              <Button
                aria-label="Notifications"
                className="hidden text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground sm:inline-flex"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Bell />
              </Button>
              <form action={signOut}>
                <Button
                  aria-label="Sign out"
                  className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  size="icon-sm"
                  type="submit"
                  variant="ghost"
                >
                  <LogOut />
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
