import Link from 'next/link'
import {
  Bot,
  Database,
  FileText,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { Workspace } from '@/lib/supabase/database.types'
import type { WorkspaceOverview } from '@/lib/workspaces/queries'

type WorkspaceDashboardProps = {
  workspace: Workspace
  overview: WorkspaceOverview
  roleKey: string
}

const stats = [
  {
    key: 'pages',
    label: 'Pages',
    icon: FileText,
  },
  {
    key: 'collections',
    label: 'Collections',
    icon: Database,
  },
  {
    key: 'views',
    label: 'Views',
    icon: LayoutGrid,
  },
  {
    key: 'agents',
    label: 'Agents',
    icon: Bot,
  },
] as const

function formatDate(value: string | null) {
  if (!value) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function WorkspaceDashboard({
  workspace,
  overview,
  roleKey,
}: WorkspaceDashboardProps) {
  const brandName = workspace.brand_name ?? workspace.name

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{workspace.name}</h2>
            <Badge variant="secondary">{roleKey}</Badge>
          </div>
          <p className="text-muted-foreground">
            Tenant workspace ID{' '}
            <span className="font-mono text-xs">{workspace.id}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/workspaces/${workspace.id}/settings`}>
            <Settings data-icon="inline-start" />
            Settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {overview[stat.key]}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent collections</CardTitle>
            <CardDescription>
              Database collections scoped to this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentCollections.length > 0 ? (
              <div className="flex flex-col gap-3">
                {overview.recentCollections.map((collection) => (
                  <div
                    className="flex items-center gap-4 rounded-lg border p-4"
                    key={collection.id}
                  >
                    <div className="bg-secondary flex size-10 items-center justify-center rounded-md text-lg">
                      {collection.icon ?? 'DB'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {collection.name}
                      </div>
                      <div className="text-muted-foreground truncate text-sm">
                        {collection.description ?? 'No description'}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-right text-xs">
                      {formatDate(collection.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Database />
                  </EmptyMedia>
                  <EmptyTitle>No collections yet</EmptyTitle>
                  <EmptyDescription>
                    Create a collection to define fields and start adding
                    records.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link href={`/databases?workspace_id=${workspace.id}`}>
                      <Database data-icon="inline-start" />
                      Open databases
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace members</CardTitle>
              <CardDescription>
                Active members with access to this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="bg-secondary flex size-12 items-center justify-center rounded-lg">
                <Users />
              </div>
              <div>
                <div className="text-3xl font-semibold">
                  {overview.members}
                </div>
                <p className="text-muted-foreground text-sm">Active members</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>White-label status</CardTitle>
              <CardDescription>
                Level {workspace.white_label_level ?? 0} portal settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {brandName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{brandName}</div>
                  <div className="text-muted-foreground truncate text-sm">
                    {workspace.portal_subdomain
                      ? `${workspace.portal_subdomain}.skail.app`
                      : 'No subdomain set'}
                  </div>
                </div>
              </div>
              <Button asChild>
                <Link href={`/workspaces/${workspace.id}/settings`}>
                  <Settings data-icon="inline-start" />
                  Edit white label
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
