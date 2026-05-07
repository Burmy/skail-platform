import Link from 'next/link'

import { WorkspaceCreateForm } from '@/components/workspaces/workspace-create-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col justify-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg text-lg font-bold">
              S
            </div>
            <div>
              <h1 className="text-2xl font-semibold">SKAIL</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>

          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="text-4xl font-semibold tracking-normal">
              Start by creating a tenant workspace.
            </h2>
            <p className="text-muted-foreground text-lg">
              Every client portal, dashboard, collection, and automation will
              be scoped through a workspace ID.
            </p>
          </div>

          {workspaces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your workspaces</CardTitle>
                <CardDescription>
                  Continue in an existing workspace or create another tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {workspaces.map((workspace) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    key={workspace.id}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {workspace.name}
                      </div>
                      <div className="text-muted-foreground truncate text-xs font-mono">
                        {workspace.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{workspace.role_key}</Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/workspaces/${workspace.id}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <WorkspaceCreateForm />
      </div>
    </main>
  )
}
