'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/data'
import { signOut } from '@/app/auth/actions'
import {
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
  ChevronLeft,
  ChevronsUpDown,
  LogOut,
  Search,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DashboardWorkspace } from '@/components/dashboard-layout'
import { useState } from 'react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  workspace,
  workspaces = [],
  userEmail,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const workspaceId = workspace?.id
  const homeHref = workspaceId ? `/workspaces/${workspaceId}` : '/'
  const displayName = workspace?.brand_name || workspace?.name || 'SKAIL'
  const userInitials = initialsFromEmail(userEmail)

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link href={homeHref} className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <span
              className="truncate text-lg font-semibold text-foreground"
              data-skail-brand
            >
              {displayName}
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <span className="text-sm font-bold text-primary-foreground">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 text-muted-foreground', collapsed && 'hidden')}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-3">
          <button className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary">
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {!collapsed && workspaces.length > 1 && (
        <div className="border-b border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-full justify-between"
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
                  <Link href={`/workspaces/${item.id}`}>{item.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon]
            const href = scopedHref(item.href, workspaceId)
            const activePath = href.split('?')[0]
            const isActive =
              pathname === activePath ||
              (activePath !== '/' && pathname.startsWith(activePath))
            
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary text-xs">
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

      {/* Bottom section */}
      <div className="border-t border-border p-3">
        {!collapsed && (
          <Button asChild className="w-full gap-2" size="sm">
            <Link href={scopedHref('/pages', workspaceId)}>
              <Plus data-icon="inline-start" />
              New Page
            </Link>
          </Button>
        )}
        {collapsed && (
          <Button size="icon" className="w-full" onClick={() => setCollapsed(false)}>
            <Plus />
          </Button>
        )}
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userEmail ?? 'Signed in'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {workspace?.role_key ?? workspace?.plan_key ?? 'Member'}
              </p>
            </div>
          )}
          {!collapsed && (
            <form action={signOut}>
              <Button
                aria-label="Sign out"
                className="text-muted-foreground"
                size="icon-sm"
                type="submit"
                variant="ghost"
              >
                <LogOut />
              </Button>
            </form>
          )}
        </div>
      </div>
    </aside>
  )
}
