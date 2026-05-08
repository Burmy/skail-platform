'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import {
  DashboardLayout,
  type DashboardWorkspace,
} from '@/components/dashboard-layout'
import type { ThemeWithTokens } from '@/lib/theme/types'

type WorkspaceShellData = {
  userEmail: string | null
  workspace: DashboardWorkspace | null
  workspaces: DashboardWorkspace[]
  theme: ThemeWithTokens | null
}

type ShellState =
  | { status: 'loading'; data: WorkspaceShellData | null }
  | { status: 'ready'; data: WorkspaceShellData }
  | { status: 'passthrough'; data: null }
  | { status: 'error'; data: null; message: string }

const shellCache = new Map<string, WorkspaceShellData>()

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedWorkspaceId = useMemo(
    () => resolveWorkspaceId(pathname, searchParams),
    [pathname, searchParams],
  )
  const cacheKey = requestedWorkspaceId ?? '__first__'
  const [state, setState] = useState<ShellState>(() => {
    const cached = shellCache.get(cacheKey)
    return cached
      ? { status: 'ready', data: cached }
      : { status: 'loading', data: null }
  })

  useEffect(() => {
    let cancelled = false
    const cached = shellCache.get(cacheKey)
    if (cached) {
      setState({ status: 'ready', data: cached })
      return
    }

    setState((current) => ({
      status: 'loading',
      data: current.status === 'ready' ? current.data : null,
    }))

    const params = new URLSearchParams()
    if (requestedWorkspaceId) params.set('workspaceId', requestedWorkspaceId)

    fetch(`/api/workspaces/shell?${params.toString()}`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | (WorkspaceShellData & { error?: string })
          | null

        if (cancelled) return

        if (response.status === 403 && pathname.startsWith('/p/')) {
          setState({ status: 'passthrough', data: null })
          return
        }

        if (!response.ok || !json) {
          setState({
            status: 'error',
            data: null,
            message: json?.error ?? 'Could not load workspace shell.',
          })
          return
        }

        const data: WorkspaceShellData = {
          userEmail: json.userEmail,
          workspace: json.workspace,
          workspaces: json.workspaces ?? [],
          theme: json.theme ?? null,
        }
        shellCache.set(cacheKey, data)
        if (data.workspace?.id) {
          shellCache.set(data.workspace.id, data)
          window.localStorage.setItem('skail:lastWorkspaceId', data.workspace.id)
        }
        setState({ status: 'ready', data })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            message: error instanceof Error ? error.message : 'Shell failed.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, pathname, requestedWorkspaceId])

  if (state.status === 'passthrough') return <>{children}</>

  const data = state.data
  const title = getRouteTitle(pathname)
  const description = getRouteDescription(pathname, data?.workspace)

  if (state.status === 'error') {
    return (
      <DashboardLayout
        title="Workspace"
        description={state.message}
        workspace={null}
        workspaces={[]}
      >
        <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center p-6 text-sm text-muted-foreground">
          {state.message}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={title}
      description={description}
      userEmail={data?.userEmail ?? null}
      workspace={data?.workspace ?? null}
      workspaces={data?.workspaces ?? []}
      theme={data?.theme ?? null}
    >
      {state.status === 'loading' && !data ? (
        <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
          Loading workspace...
        </div>
      ) : (
        children
      )}
    </DashboardLayout>
  )
}

function resolveWorkspaceId(
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const fromQuery = searchParams.get('workspace_id')
  if (fromQuery) return fromQuery

  const workspaceMatch = pathname.match(/^\/workspaces\/([^/]+)/)
  if (workspaceMatch?.[1] && workspaceMatch[1] !== 'new') {
    return workspaceMatch[1]
  }

  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('skail:lastWorkspaceId')
  }

  return null
}

function getRouteTitle(pathname: string) {
  if (pathname.startsWith('/workspaces/') && pathname.endsWith('/settings')) {
    return 'Workspace settings'
  }
  if (pathname.startsWith('/workspaces/')) return 'Dashboard'
  if (pathname.startsWith('/pages/trash')) return 'Trash'
  if (pathname.startsWith('/pages')) return 'Pages'
  if (pathname.startsWith('/p/')) return 'Page'
  if (pathname.startsWith('/databases')) return 'Databases'
  if (pathname.startsWith('/templates')) return 'Templates'
  if (pathname.startsWith('/ai-builder')) return 'AI Builder'
  if (pathname.startsWith('/agents')) return 'Agent Library'
  if (pathname.startsWith('/automations')) return 'Automations'
  if (pathname.startsWith('/settings/theme')) return 'Theme + Styling'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/portal-preview')) return 'Portal Preview'
  return 'Workspace'
}

function getRouteDescription(
  pathname: string,
  workspace?: DashboardWorkspace | null,
) {
  if (pathname.startsWith('/workspaces/') && !pathname.endsWith('/settings')) {
    return workspace?.name ?? 'Workspace overview'
  }
  if (pathname.startsWith('/pages/trash')) return 'Pages archived in the last 30 days'
  if (pathname.startsWith('/pages')) return 'Your workspace pages, stacks, and recents'
  if (pathname.startsWith('/p/')) return 'Editable workspace page'
  if (pathname.startsWith('/databases')) return 'Collections, fields, and records'
  if (pathname.startsWith('/templates')) return 'Reusable workspace starting points'
  if (pathname.startsWith('/ai-builder')) return 'Preview and confirm AI-generated workspace changes'
  if (pathname.startsWith('/agents')) return 'Managed assistant placeholders'
  if (pathname.startsWith('/automations')) return 'n8n-backed workflow placeholders'
  if (pathname.startsWith('/settings/theme')) {
    return 'Workspace themes, page styles, widget styles, and view styling'
  }
  if (pathname.startsWith('/workspaces/') && pathname.endsWith('/settings')) {
    return 'Manage workspace identity, domains, and Level 2 branding'
  }
  return workspace?.name ?? 'Workspace'
}
