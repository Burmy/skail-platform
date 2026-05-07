'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { collections } from '@/lib/data'
import { ViewType } from '@/lib/types'
import { 
  Table, 
  Columns3, 
  Calendar, 
  LayoutDashboard, 
  Plus,
  Filter,
  SortAsc,
  ChevronDown,
  MoreHorizontal,
  GripVertical,
  Clock,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const projectsCollection = collections[0]

export default function ViewsPage() {
  const [activeView, setActiveView] = useState<ViewType>('table')

  return (
    <DashboardLayout 
      title="Views" 
      description="Different ways to visualize your data"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2 border-border">
            <SortAsc className="h-4 w-4" />
            Sort
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New View
          </Button>
        </div>
      }
    >
      <div className="p-6">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)}>
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-background">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2 data-[state=active]:bg-background">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-background">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-0">
            <TableView />
          </TabsContent>

          <TabsContent value="kanban" className="mt-0">
            <KanbanView />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarView />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <DashboardView />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function TableView() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {projectsCollection.properties.map((prop) => (
                  <th key={prop.id} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {prop.name}
                  </th>
                ))}
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {projectsCollection.records.map((record, idx) => (
                <tr 
                  key={record.id as string}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  {projectsCollection.properties.map((prop) => (
                    <td key={prop.id} className="px-4 py-3 text-sm text-foreground">
                      {prop.type === 'select' ? (
                        <StatusBadge value={record[prop.name] as string} />
                      ) : (
                        record[prop.name] as string
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function KanbanView() {
  const columns = ['Active', 'On Hold', 'Completed']
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const items = projectsCollection.records.filter(r => r.Status === status)
        
        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={cn(
                'h-3 w-3 rounded-full',
                status === 'Active' && 'bg-success',
                status === 'On Hold' && 'bg-warning',
                status === 'Completed' && 'bg-muted-foreground'
              )} />
              <h3 className="text-sm font-semibold text-foreground">{status}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {items.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id as string} className="border-border bg-card cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground mb-2">{item.Name as string}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item['Due Date'] as string}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.Assignee as string}
                          </div>
                        </div>
                        <div className="mt-3">
                          <PriorityBadge priority={item.Priority as string} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Button variant="ghost" className="w-full gap-2 border border-dashed border-border text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarView() {
  const today = new Date()
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' })
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const startOffset = firstDay.getDay()
  
  const calendarDays = []
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    calendarDays.push(i)
  }

  const getEventsForDay = (day: number | null) => {
    if (!day) return []
    const dateStr = `2024-02-${day.toString().padStart(2, '0')}`
    return projectsCollection.records.filter(r => r['Due Date'] === dateStr)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">{currentMonth}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border">Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {days.map((day) => (
            <div key={day} className="bg-secondary/50 p-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {calendarDays.map((day, idx) => {
            const events = getEventsForDay(day)
            const isToday = day === today.getDate()
            
            return (
              <div 
                key={idx} 
                className={cn(
                  'bg-card p-2 min-h-24 relative',
                  !day && 'bg-secondary/30'
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      'text-sm',
                      isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground' : 'text-foreground'
                    )}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div 
                          key={event.id as string}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                        >
                          {event.Name as string}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardView() {
  const statusCounts = {
    Active: projectsCollection.records.filter(r => r.Status === 'Active').length,
    'On Hold': projectsCollection.records.filter(r => r.Status === 'On Hold').length,
    Completed: projectsCollection.records.filter(r => r.Status === 'Completed').length,
  }
  
  const priorityCounts = {
    High: projectsCollection.records.filter(r => r.Priority === 'High').length,
    Medium: projectsCollection.records.filter(r => r.Priority === 'Medium').length,
    Low: projectsCollection.records.filter(r => r.Priority === 'Low').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{status}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{count}</p>
                </div>
                <div className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center',
                  status === 'Active' && 'bg-success/10',
                  status === 'On Hold' && 'bg-warning/10',
                  status === 'Completed' && 'bg-muted'
                )}>
                  <div className={cn(
                    'h-3 w-3 rounded-full',
                    status === 'Active' && 'bg-success',
                    status === 'On Hold' && 'bg-warning',
                    status === 'Completed' && 'bg-muted-foreground'
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Projects by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(priorityCounts).map(([priority, count]) => {
                const total = projectsCollection.records.length
                const percentage = Math.round((count / total) * 100)
                
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{priority}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div 
                        className={cn(
                          'h-2 rounded-full transition-all',
                          priority === 'High' && 'bg-destructive',
                          priority === 'Medium' && 'bg-warning',
                          priority === 'Low' && 'bg-muted-foreground'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectsCollection.records.slice(0, 4).map((record) => (
                <div key={record.id as string} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {(record.Assignee as string).split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{record.Name as string}</p>
                    <p className="text-xs text-muted-foreground">Due: {record['Due Date'] as string}</p>
                  </div>
                  <StatusBadge value={record.Status as string} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    'Active': 'bg-success/10 text-success',
    'On Hold': 'bg-warning/10 text-warning',
    'Completed': 'bg-muted text-muted-foreground',
    'In Progress': 'bg-primary/10 text-primary',
    'To Do': 'bg-secondary text-secondary-foreground',
    'Done': 'bg-success/10 text-success',
  }
  
  return (
    <Badge variant="secondary" className={cn('font-normal', colors[value] || 'bg-secondary')}>
      {value}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    'High': 'bg-destructive/10 text-destructive',
    'Medium': 'bg-warning/10 text-warning',
    'Low': 'bg-muted text-muted-foreground',
  }
  
  return (
    <Badge variant="secondary" className={cn('font-normal text-xs', colors[priority] || 'bg-secondary')}>
      {priority}
    </Badge>
  )
}
