'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/data'
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
  ChevronLeft,
  Search,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-lg font-semibold text-foreground">SKAIL</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <span className="text-sm font-bold text-primary-foreground">S</span>
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
          <Button className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        )}
        {collapsed && (
          <Button size="icon" className="w-full" onClick={() => setCollapsed(false)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
