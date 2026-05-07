'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Copy, 
  FileText, 
  Folder,
  LayoutDashboard,
  Plus,
  Table,
} from 'lucide-react'

const templates = [
  {
    id: '1',
    name: 'Client Portal',
    description: 'Complete client portal with dashboard, documents, and messaging',
    icon: LayoutDashboard,
    category: 'Portal',
    pages: 5,
  },
  {
    id: '2',
    name: 'Project Tracker',
    description: 'Track projects with status, timelines, and team assignments',
    icon: Folder,
    category: 'Management',
    pages: 3,
  },
  {
    id: '3',
    name: 'CRM Database',
    description: 'Customer relationship management with contacts and deals',
    icon: Table,
    category: 'Database',
    pages: 4,
  },
  {
    id: '4',
    name: 'Knowledge Base',
    description: 'Documentation hub with categories and search',
    icon: FileText,
    category: 'Content',
    pages: 6,
  },
]

export default function TemplatesPage() {
  return (
    <DashboardLayout 
      title="Templates" 
      description="Start with pre-built templates"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      }
    >
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="border-border bg-card hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <template.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <CardTitle className="text-foreground mt-4">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {template.pages} pages
                  </span>
                  <Button size="sm" className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="h-3 w-3" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
