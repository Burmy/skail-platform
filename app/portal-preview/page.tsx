'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { activityFeed, onboardingChecklist } from '@/lib/data'
import { 
  ArrowRight, 
  Bell, 
  BookOpen,
  Calendar,
  CheckCircle2, 
  Circle, 
  ExternalLink,
  FileText,
  HelpCircle,
  Home,
  MessageSquare,
  Settings,
  User,
  Sparkles,
  TrendingUp,
  Clock,
  Folder,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function PortalPreviewPage() {
  const completedTasks = onboardingChecklist.filter(item => item.completed).length
  const totalTasks = onboardingChecklist.length
  const progress = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div className="min-h-screen bg-background">
      {/* Portal Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-foreground">Acme Corp Portal</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Home', icon: Home, active: true },
              { label: 'Documents', icon: FileText },
              { label: 'Calendar', icon: Calendar },
              { label: 'Messages', icon: MessageSquare },
            ].map((item) => (
              <Button 
                key={item.label}
                variant={item.active ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-2', item.active && 'bg-primary/10 text-primary')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Welcome Kit */}
        <Card className="border-border bg-gradient-to-br from-primary/5 via-primary/10 to-transparent mb-6">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
                  Welcome Kit
                </Badge>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome to Acme Corp, John!
                </h1>
                <p className="text-muted-foreground max-w-lg mb-6">
                  {"We're excited to have you on board. Complete the onboarding checklist below to get started with your new portal."}
                </p>
                <div className="flex items-center gap-3">
                  <Button className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Start Onboarding
                  </Button>
                  <Button variant="outline" className="gap-2 border-border">
                    <ExternalLink className="h-4 w-4" />
                    View Resources
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Onboarding Checklist */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Onboarding Checklist</CardTitle>
                <Badge variant="secondary">{progress}%</Badge>
              </div>
              <CardDescription>Complete these steps to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2 mb-4" />
              <ul className="space-y-3">
                {onboardingChecklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <button className={cn(
                      'flex items-center justify-center',
                      item.completed && 'text-success'
                    )}>
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <span className={cn(
                      'text-sm',
                      item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}>
                      {item.label}
                    </span>
                    {!item.completed && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Dashboard Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Projects</p>
                      <p className="text-3xl font-bold text-foreground mt-1">12</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-sm">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">+2</span>
                    <span className="text-muted-foreground">this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Tasks</p>
                      <p className="text-3xl font-bold text-foreground mt-1">8</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-sm">
                    <span className="text-muted-foreground">3 due today</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Documents</p>
                      <p className="text-3xl font-bold text-foreground mt-1">24</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-chart-2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-sm">
                    <span className="text-muted-foreground">4 shared with you</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityFeed.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {activity.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{activity.user}</span>{' '}
                          <span className="text-muted-foreground">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4 text-muted-foreground">
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Help Center', icon: HelpCircle, color: 'text-chart-2' },
              { label: 'My Profile', icon: User, color: 'text-primary' },
              { label: 'Settings', icon: Settings, color: 'text-muted-foreground' },
              { label: 'Contact Support', icon: MessageSquare, color: 'text-chart-3' },
            ].map((link) => (
              <Button 
                key={link.label}
                variant="outline" 
                className="h-auto py-4 justify-start gap-3 border-border hover:bg-secondary"
              >
                <link.icon className={cn('h-5 w-5', link.color)} />
                <span className="text-foreground">{link.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Powered by SKAIL</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-foreground">Privacy</Link>
              <Link href="#" className="hover:text-foreground">Terms</Link>
              <Link href="#" className="hover:text-foreground">Help</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
