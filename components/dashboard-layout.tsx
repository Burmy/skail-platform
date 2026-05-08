'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { Bell, HelpCircle, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ThemeModeToggle } from '@/components/theme-mode-toggle'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const themeStyle = theme ? workspaceThemeToStyle(theme) : undefined

  return (
    <div
      className="skail-themed-workspace flex min-h-dvh bg-background text-foreground"
      data-workspace-theme-mode={theme?.mode}
      style={themeStyle}
    >
      <AppSidebar
        className="hidden lg:flex"
        userEmail={userEmail}
        workspace={workspace}
        workspaces={workspaces}
      />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent className="w-72 gap-0 p-0 sm:max-w-72" side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
            <SheetDescription>
              Navigate SKAIL workspace sections.
            </SheetDescription>
          </SheetHeader>
          <AppSidebar
            onNavigate={() => setMobileNavOpen(false)}
            userEmail={userEmail}
            variant="mobile"
            workspace={workspace}
            workspaces={workspaces}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Open navigation"
              className="text-muted-foreground lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Menu />
            </Button>
            {title && (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-foreground">
                  {title}
                </h1>
                {description && (
                  <p className="hidden truncate text-sm text-muted-foreground sm:block">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeModeToggle />
            <Button
              aria-label="Help"
              className="text-muted-foreground"
              size="icon"
              variant="ghost"
            >
              <HelpCircle />
            </Button>
            <Button
              aria-label="Notifications"
              className="relative text-muted-foreground"
              size="icon"
              variant="ghost"
            >
              <Bell />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
