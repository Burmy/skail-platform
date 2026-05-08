'use client'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronsUpDown,
  Copy,
  Database,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'

import { signOut } from '@/app/auth/actions'
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
import { navItems } from '@/lib/data'
import { cn } from '@/lib/utils'

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Home,
  FileText,
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

function scopedHref(href: string, workspaceId?: string) {
  if (!workspaceId) {
    return href
  }

  if (href === '/') {
    return `/workspaces/${workspaceId}`
  }

  if (href === '/settings') {
    return `/workspaces/${workspaceId}/settings`
  }

  return `${href}?workspace_id=${workspaceId}`
}

function initialsFromEmail(email?: string | null) {
  if (!email) {
    return 'U'
  }

  return email.slice(0, 2).toUpperCase()
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
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = variant === 'mobile'
  const isCollapsed = collapsed && !isMobile
  const workspaceId = workspace?.id
  const homeHref = workspaceId ? `/workspaces/${workspaceId}` : '/'
  const displayName = workspace?.brand_name || workspace?.name || 'SKAIL'
  const userInitials = initialsFromEmail(userEmail)

  return (
    <aside
      className={cn(
        'flex h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
        isCollapsed ? 'w-16' : 'w-64',
        isMobile && 'h-full w-full border-r-0',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            isCollapsed && 'pointer-events-none mx-auto'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          {!isCollapsed && (
            <span
              className="truncate text-[15px] font-semibold tracking-normal text-sidebar-foreground"
              data-skail-brand
            >
              {displayName}
            </span>
          )}
        </Link>
        {!isMobile && !isCollapsed && (
          <Button
            aria-label="Collapse sidebar"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(true)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <div className="border-b border-sidebar-border/70 p-3">
          <button className="flex h-10 w-full items-center gap-2 rounded-md border border-sidebar-border bg-background/55 px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Search className="size-4" />
            <span>Search...</span>
            <kbd className="ml-auto rounded border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Ctrl K
            </kbd>
          </button>
        </div>
      )}

      {!isCollapsed && workspaces.length > 1 && (
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
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon]
            const href = scopedHref(item.href, workspaceId)
            const activePath = href.split('?')[0]
            const isActive =
              pathname === activePath ||
              (activePath !== '/' &&
                activePath !== '/settings' &&
                pathname.startsWith(activePath))

            return (
              <li key={item.href}>
                <Link
                  aria-label={isCollapsed ? item.label : undefined}
                  href={href}
                  onClick={onNavigate}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  {!isCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto border-primary/15 bg-primary/10 px-2 py-0 text-[10px] text-primary"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <Button asChild className="w-full gap-2" size="sm">
            <Link href={scopedHref('/pages', workspaceId)} onClick={onNavigate}>
              <Plus data-icon="inline-start" />
              New Page
            </Link>
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
            isCollapsed && 'justify-center'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
            {userInitials}
          </div>
          {!isCollapsed && (
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
          )}
        </div>
      </div>
    </aside>
  )
}
