'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Zap,
  Mail,
  Bell,
  Clock,
  Database,
  ArrowRight,
  Play,
  Pause,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const automations = [
  {
    id: '1',
    name: 'Welcome Email',
    description: 'Send welcome email when new client is added',
    trigger: 'New record in Clients',
    action: 'Send email',
    enabled: true,
    runs: 142,
  },
  {
    id: '2',
    name: 'Task Reminder',
    description: 'Send reminder 24h before task due date',
    trigger: 'Task due date',
    action: 'Send notification',
    enabled: true,
    runs: 89,
  },
  {
    id: '3',
    name: 'Weekly Report',
    description: 'Generate and send weekly project report',
    trigger: 'Every Monday 9am',
    action: 'Generate report',
    enabled: false,
    runs: 12,
  },
  {
    id: '4',
    name: 'Status Update',
    description: 'Notify team when project status changes',
    trigger: 'Status field updated',
    action: 'Send Slack message',
    enabled: true,
    runs: 256,
  },
]

export default function AutomationsPage() {
  return (
    <DashboardLayout 
      title="Automations" 
      description="Automate repetitive tasks"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Automation
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {automations.filter(a => a.enabled).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Automations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Play className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {automations.reduce((acc, a) => acc + a.runs, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Runs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">24.5h</p>
                  <p className="text-sm text-muted-foreground">Time Saved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automations List */}
        <div className="space-y-4">
          {automations.map((automation) => (
            <Card key={automation.id} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      automation.enabled ? 'bg-primary/10' : 'bg-secondary'
                    )}>
                      <Zap className={cn(
                        'h-5 w-5',
                        automation.enabled ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{automation.name}</h3>
                        {automation.enabled ? (
                          <Badge variant="secondary" className="bg-success/10 text-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>
                      
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{automation.trigger}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2 text-sm">
                          {automation.action.includes('email') && <Mail className="h-4 w-4 text-muted-foreground" />}
                          {automation.action.includes('notification') && <Bell className="h-4 w-4 text-muted-foreground" />}
                          {automation.action.includes('report') && <Clock className="h-4 w-4 text-muted-foreground" />}
                          {automation.action.includes('Slack') && <Bell className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-muted-foreground">{automation.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{automation.runs} runs</p>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </div>
                    <Switch checked={automation.enabled} />
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
