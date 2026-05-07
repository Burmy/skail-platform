'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { activityFeed, collections, onboardingChecklist } from '@/lib/data'
import { 
  ArrowRight, 
  BarChart3, 
  Database, 
  FileText, 
  Plus, 
  Sparkles, 
  TrendingUp,
  Users,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const completedTasks = onboardingChecklist.filter(item => item.completed).length
  const totalTasks = onboardingChecklist.length
  const progress = Math.round((completedTasks / totalTasks) * 100)

  return (
    <DashboardLayout title="Dashboard" description="Welcome back, John">
      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pages</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">24</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Databases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{collections.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {collections.reduce((acc, c) => acc + c.records.length, 0)} total records
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground mt-1">
                3 online now
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Queries</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">142</div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/pages">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 border-border hover:bg-secondary">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">Create Page</div>
                      <div className="text-sm text-muted-foreground">Build a new page or layout</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/databases">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 border-border hover:bg-secondary">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                      <Database className="h-5 w-5 text-chart-2" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">New Database</div>
                      <div className="text-sm text-muted-foreground">Create a collection</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/ai-builder">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 border-border hover:bg-secondary">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                      <Sparkles className="h-5 w-5 text-chart-3" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">AI Builder</div>
                      <div className="text-sm text-muted-foreground">Build with AI assistance</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/views">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 border-border hover:bg-secondary">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                      <BarChart3 className="h-5 w-5 text-chart-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">Create View</div>
                      <div className="text-sm text-muted-foreground">Table, Kanban, Calendar</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Progress */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Getting Started</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {progress}%
                </Badge>
              </div>
              <CardDescription>Complete your workspace setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 h-2 w-full rounded-full bg-secondary">
                <div 
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="space-y-3">
                {onboardingChecklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Collections */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Recent Databases</CardTitle>
                <CardDescription>Your latest collections</CardDescription>
              </div>
              <Link href="/databases">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {collections.map((collection) => (
                  <Link 
                    key={collection.id} 
                    href="/databases"
                    className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg">
                      {collection.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{collection.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {collection.records.length} records · {collection.properties.length} fields
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                <Button variant="outline" className="w-full gap-2 border-dashed border-border">
                  <Plus className="h-4 w-4" />
                  Add Database
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {activity.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.user}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
