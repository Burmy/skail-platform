'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { PageAccessLevel } from '@/lib/pages/access'

export type PageRuntimeMode = 'workspace' | 'shared' | 'public'

export type PageRuntimeContextValue = {
  workspaceId: string
  pageId: string
  mode: PageRuntimeMode
  accessLevel: PageAccessLevel
  publicToken?: string
  canEditContent: boolean
  canManageStructure: boolean
}

const PageRuntimeContext = createContext<PageRuntimeContextValue | null>(null)

export function PageRuntimeProvider({
  value,
  children,
}: {
  value: PageRuntimeContextValue
  children: ReactNode
}) {
  return (
    <PageRuntimeContext.Provider value={value}>
      {children}
    </PageRuntimeContext.Provider>
  )
}

export function usePageRuntime() {
  const value = useContext(PageRuntimeContext)
  if (value) return value

  return {
    workspaceId: '',
    pageId: '',
    mode: 'workspace' as const,
    accessLevel: 'manage' as const,
    canEditContent: true,
    canManageStructure: true,
  }
}
