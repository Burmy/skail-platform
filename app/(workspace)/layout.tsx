import { Suspense, type ReactNode } from 'react'

import { WorkspaceShell } from '@/components/workspace-shell'

export default function WorkspaceRouteGroupLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  )
}
