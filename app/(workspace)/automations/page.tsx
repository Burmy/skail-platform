'use client'

import {
  ArrowRight,
  Bell,
  Clock,
  Database,
  Mail,
  Settings,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const automations = [
  {
    id: '1',
    name: 'Welcome Email',
    description: 'Send a welcome email when a new client record is added.',
    trigger: 'New record in Clients',
    action: 'Send email',
    enabled: true,
  },
  {
    id: '2',
    name: 'Task Reminder',
    description: 'Send a reminder before a task reaches its due date.',
    trigger: 'Task due date',
    action: 'Send notification',
    enabled: true,
  },
  {
    id: '3',
    name: 'Weekly Report',
    description: 'Prepare a weekly project report for review.',
    trigger: 'Every Monday',
    action: 'Generate report',
    enabled: false,
  },
  {
    id: '4',
    name: 'Status Update',
    description: 'Notify the workspace when a project status changes.',
    trigger: 'Status field updated',
    action: 'Send notification',
    enabled: true,
  },
]

function ActionIcon({ action }: { action: string }) {
  if (action.toLowerCase().includes('email')) {
    return <Mail className="size-4 text-muted-foreground" />
  }

  if (action.toLowerCase().includes('report')) {
    return <Clock className="size-4 text-muted-foreground" />
  }

  return <Bell className="size-4 text-muted-foreground" />
}

export default function AutomationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div className="rounded-lg border border-dashed bg-surface-soft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold">Automation library</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              These are static setup examples. Production automation will run
              through signed n8n webhooks after that module is connected.
            </p>
          </div>
          <Badge variant="outline">Placeholder</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {automations.map((automation) => (
          <Card key={automation.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Zap className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{automation.name}</h3>
                      <Badge
                        variant={automation.enabled ? 'secondary' : 'outline'}
                      >
                        {automation.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {automation.description}
                    </p>

                    <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                      <span className="flex items-center gap-2">
                        <Database className="size-4" />
                        {automation.trigger}
                      </span>
                      <ArrowRight className="hidden size-4 sm:block" />
                      <span className="flex items-center gap-2">
                        <ActionIcon action={automation.action} />
                        {automation.action}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 lg:justify-end">
                  <Switch
                    aria-label={`${automation.name} enabled status`}
                    defaultChecked={automation.enabled}
                    disabled
                  />
                  <Button
                    aria-label={`Configure ${automation.name}`}
                    disabled
                    size="icon"
                    variant="ghost"
                  >
                    <Settings />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
