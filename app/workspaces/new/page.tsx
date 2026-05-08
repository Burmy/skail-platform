import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { WorkspaceCreateForm } from '@/components/workspaces/workspace-create-form'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getUserWorkspaces } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

export default async function NewWorkspacePage() {
  const { user, workspaces } = await getUserWorkspaces()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-lg font-semibold text-primary-foreground">
              S
            </div>
            <div>
              <h1 className="text-left text-2xl font-semibold">SKAIL</h1>
              <p className="text-left text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-normal">
              Create your first workspace
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Workspaces keep client portals, pages, databases, and automation
              cleanly scoped.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {workspaces.length > 0 && (
            <Card className="order-2 lg:order-1">
              <CardHeader>
                <CardTitle>Your workspaces</CardTitle>
                <CardDescription>
                  Continue in an existing workspace or create another one.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {workspaces.map((workspace) => (
                  <Link
                    className="group flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/workspaces/${workspace.id}`}
                    key={workspace.id}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {workspace.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {workspace.role_key}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{workspace.role_key}</Badge>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <div className={workspaces.length > 0 ? 'order-1 lg:order-2' : 'lg:col-start-1 lg:mx-auto lg:w-[360px]'}>
            <WorkspaceCreateForm />
          </div>
        </div>
      </div>
    </main>
  )
}
