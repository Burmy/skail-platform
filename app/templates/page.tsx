'use client'

import {
  Copy,
  FileText,
  Folder,
  LayoutDashboard,
  Plus,
  Table,
} from 'lucide-react'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const templates = [
  {
    id: '1',
    name: 'Client Portal',
    description: 'A client-facing portal with a dashboard, documents, and updates.',
    icon: LayoutDashboard,
    category: 'Portal',
    pages: 5,
  },
  {
    id: '2',
    name: 'Project Tracker',
    description: 'Track work with statuses, timelines, owners, and views.',
    icon: Folder,
    category: 'Management',
    pages: 3,
  },
  {
    id: '3',
    name: 'CRM Database',
    description: 'A structured base for contacts, companies, and opportunities.',
    icon: Table,
    category: 'Database',
    pages: 4,
  },
  {
    id: '4',
    name: 'Knowledge Base',
    description: 'A simple documentation hub with organized resource pages.',
    icon: FileText,
    category: 'Content',
    pages: 6,
  },
]

export default function TemplatesPage() {
  return (
    <DashboardLayout
      actions={
        <Button disabled>
          <Plus data-icon="inline-start" />
          Create Template
        </Button>
      }
      description="Reusable workspace starting points"
      title="Templates"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="rounded-lg border border-dashed bg-surface-soft p-5">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold">Template installer</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              These templates are placeholders for the installer module. They
              show the intended structure without changing workspace data yet.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {templates.map((template) => {
            const Icon = template.icon

            return (
              <Card className="bg-card/90" key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <Badge variant="secondary">{template.category}</Badge>
                  </div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {template.pages} pages
                  </span>
                  <Button disabled size="sm" variant="outline">
                    <Copy data-icon="inline-start" />
                    Use
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
