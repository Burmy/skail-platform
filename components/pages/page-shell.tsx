'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'

import { useIsMobile } from '@/hooks/use-mobile'
import { recordPageVisit } from '@/app/pages/actions'
import type { PageAccessLevel } from '@/lib/pages/access'
import { PageHeader } from './page-header'
import { PageRuntimeProvider, type PageRuntimeMode } from './page-runtime-context'

// BlockNote touches `window` at module load — keep it out of the SSR pass.
const PageEditor = dynamic(
  () => import('./page-editor').then((mod) => mod.PageEditor),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 py-4 text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
)

export type PageShellProps = {
  workspaceId: string
  pageId: string
  title: string
  icon: string | null
  cover: string | null
  initialContent: unknown
  initialVersion: number
  accessLevel?: PageAccessLevel
  mode?: PageRuntimeMode
  publicToken?: string
  canManageStructure?: boolean
  recordVisit?: boolean
}

export function PageShell({
  workspaceId,
  pageId,
  title,
  icon,
  cover,
  initialContent,
  initialVersion,
  accessLevel = 'manage',
  mode = 'workspace',
  publicToken,
  canManageStructure = true,
  recordVisit = true,
}: PageShellProps) {
  const isMobile = useIsMobile()
  const canEditContent = accessLevel === 'edit' || accessLevel === 'manage'
  const readOnly = isMobile || !canEditContent

  useEffect(() => {
    if (!recordVisit) return
    void recordPageVisit({ workspaceId, pageId })
  }, [recordVisit, workspaceId, pageId])

  return (
    <PageRuntimeProvider
      value={{
        workspaceId,
        pageId,
        mode,
        accessLevel,
        publicToken,
        canEditContent,
        canManageStructure,
      }}
    >
      <div className="flex flex-col">
        <PageHeader
          workspaceId={workspaceId}
          pageId={pageId}
          initialTitle={title}
          initialIcon={icon}
          initialCover={cover}
          readOnly={readOnly}
          canShare={canManageStructure && mode !== 'public'}
        />

        {isMobile && canEditContent ? (
          <div className="mx-auto my-3 max-w-3xl rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Editing requires desktop.
          </div>
        ) : null}

        <div className="w-full px-6 pb-24">
          <PageEditor
            workspaceId={workspaceId}
            pageId={pageId}
            initialContent={initialContent}
            initialVersion={initialVersion}
            readOnly={readOnly}
          />
        </div>
      </div>
    </PageRuntimeProvider>
  )
}
