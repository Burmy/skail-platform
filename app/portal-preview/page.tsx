'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Folder,
  HelpCircle,
  Home,
  MessageSquare,
  Settings,
  User,
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
import { Progress } from '@/components/ui/progress'
import { activityFeed, onboardingChecklist } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function PortalPreviewPage() {
  const completedTasks = onboardingChecklist.filter((item) => item.completed).length
  const totalTasks = onboardingChecklist.length
  const progress = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              A
            </div>
            <span className="truncate font-semibold">Acme Corp Portal</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Home', icon: Home, active: true },
              { label: 'Documents', icon: FileText },
              { label: 'Calendar', icon: Calendar },
              { label: 'Messages', icon: MessageSquare },
            ].map((item) => (
              <Button
                key={item.label}
                size="sm"
                variant={item.active ? 'secondary' : 'ghost'}
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Button aria-label="Notifications" className="relative" size="icon" variant="ghost">
              <Bell />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <Button aria-label="Help" className="hidden sm:inline-flex" size="icon" variant="ghost">
              <HelpCircle />
            </Button>
            <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <section className="mb-6 rounded-lg border bg-card p-5 lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3" variant="secondary">
                Welcome Kit
              </Badge>
              <h1 className="text-2xl font-semibold tracking-normal lg:text-3xl">
                Welcome to Acme Corp, John
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground lg:text-base">
                Complete the onboarding checklist, review shared documents, and
                keep project updates in one quiet portal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>
                <BookOpen data-icon="inline-start" />
                Start Onboarding
              </Button>
              <Button variant="outline">
                <FileText data-icon="inline-start" />
                View Resources
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Onboarding Checklist</CardTitle>
                <Badge variant="secondary">{progress}%</Badge>
              </div>
              <CardDescription>Complete these steps to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress className="mb-4 h-2" value={progress} />
              <ul className="space-y-2">
                {onboardingChecklist.map((item) => (
                  <li
                    className="flex items-center gap-3 rounded-md px-2 py-1.5"
                    key={item.id}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center',
                        item.completed && 'text-success',
                      )}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm',
                        item.completed
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground',
                      )}
                    >
                      {item.label}
                    </span>
                    {!item.completed && (
                      <ArrowRight className="size-4 text-muted-foreground" />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Active Projects', value: '12', icon: Folder },
                { label: 'Pending Tasks', value: '8', icon: Calendar },
                { label: 'Documents', value: '24', icon: FileText },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {item.value}
                        </p>
                      </div>
                      <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
                        <item.icon className="size-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityFeed.map((activity) => (
                    <div className="flex items-start gap-3" key={activity.id}>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {activity.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>{' '}
                          <span className="text-muted-foreground">
                            {activity.action}
                          </span>{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" variant="ghost">
                  View All Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Help Center', icon: HelpCircle },
              { label: 'My Profile', icon: User },
              { label: 'Settings', icon: Settings },
              { label: 'Contact Support', icon: MessageSquare },
            ].map((link) => (
              <Button
                className="h-auto justify-start gap-3 py-3"
                key={link.label}
                variant="outline"
              >
                <link.icon className="size-5 text-muted-foreground" />
                {link.label}
              </Button>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t pt-5">
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Powered by SKAIL</p>
            <div className="flex items-center gap-4">
              <Link className="hover:text-foreground" href="#">
                Privacy
              </Link>
              <Link className="hover:text-foreground" href="#">
                Terms
              </Link>
              <Link className="hover:text-foreground" href="#">
                Help
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
