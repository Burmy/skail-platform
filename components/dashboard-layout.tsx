'use client'

import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { Bell, HelpCircle, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { workspaceThemeToStyle } from '@/lib/theme/css'
import type { ThemeWithTokens } from '@/lib/theme/types'

export type DashboardWorkspace = {
  id: string
  name: string
  brand_name?: string | null
  plan_key?: string | null
  role_key?: string
}

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
  workspace?: DashboardWorkspace | null
  workspaces?: DashboardWorkspace[]
  userEmail?: string | null
  theme?: ThemeWithTokens | null
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
  workspace,
  workspaces = [],
  userEmail,
  theme = null,
}: DashboardLayoutProps) {
  const themeStyle = workspaceThemeToStyle(theme)

  return (
    <div
      className="skail-themed-workspace flex h-screen bg-background text-foreground"
      data-workspace-theme-mode={theme?.mode ?? 'system'}
      style={themeStyle}
    >
      <AppSidebar
        userEmail={userEmail}
        workspace={workspace}
        workspaces={workspaces}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            {title && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
