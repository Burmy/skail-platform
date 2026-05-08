'use client'

import { useMemo, useState } from 'react'
import {
  Bot,
  ClipboardList,
  FileText,
  Headphones,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Shield,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { agents } from '@/lib/data'
import type { Agent } from '@/lib/types'
import { cn } from '@/lib/utils'

function iconForAgent(agent: Agent) {
  const label = `${agent.name} ${agent.category}`.toLowerCase()

  if (label.includes('support')) {
    return Headphones
  }

  if (label.includes('content') || label.includes('copy')) {
    return FileText
  }

  if (label.includes('task') || label.includes('project')) {
    return ClipboardList
  }

  if (label.includes('chat') || label.includes('message')) {
    return MessageSquare
  }

  return Bot
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(
    agents[0] ?? null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [editedInstructions, setEditedInstructions] = useState(
    agents[0]?.instructions ?? '',
  )

  const categories = useMemo(
    () => Array.from(new Set(agents.map((agent) => agent.category))),
    [],
  )

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  function handleSelectAgent(agent: Agent) {
    setSelectedAgent(agent)
    setEditedInstructions(agent.instructions)
  }

  return (
    <>
      <div className="border-b bg-background px-4 py-3 lg:px-6">
        <Button disabled>
          <Plus data-icon="inline-start" />
          Create Agent
          <Badge variant="secondary">Future</Badge>
        </Button>
      </div>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b bg-card lg:w-96 lg:border-b-0 lg:border-r">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search agents..."
                value={searchQuery}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryAgents = filteredAgents.filter(
                  (agent) => agent.category === category,
                )

                if (categoryAgents.length === 0) {
                  return null
                }

                return (
                  <section key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryAgents.map((agent) => {
                        const Icon = iconForAgent(agent)

                        return (
                          <button
                            className={cn(
                              'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                              selectedAgent?.id === agent.id
                                ? 'border-primary/30 bg-primary/10'
                                : 'border-transparent hover:border-border hover:bg-accent',
                            )}
                            key={agent.id}
                            onClick={() => handleSelectAgent(agent)}
                            type="button"
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                              <Icon className="size-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {agent.name}
                                </span>
                                {agent.locked && (
                                  <Lock className="size-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                {agent.description}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {selectedAgent ? (
            <div className="mx-auto grid max-w-4xl gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary">
                  {(() => {
                    const Icon = iconForAgent(selectedAgent)

                    return <Icon className="size-5 text-muted-foreground" />
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">
                      {selectedAgent.name}
                    </h2>
                    {selectedAgent.locked && (
                      <Badge variant="secondary">
                        <Lock className="size-3" />
                        Protected
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {selectedAgent.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{selectedAgent.category}</Badge>
                    <Badge variant="outline">Placeholder</Badge>
                    <Badge variant="outline">Managed area hidden from clients</Badge>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Pencil className="size-4" />
                        Instructions
                      </CardTitle>
                      <CardDescription>
                        {selectedAgent.locked
                          ? 'Core instructions are locked for this managed placeholder.'
                          : 'Local editing is a placeholder until agent persistence is added.'}
                      </CardDescription>
                    </div>
                    {selectedAgent.locked && (
                      <Badge variant="outline">
                        <Shield className="size-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    className={cn(
                      'min-h-40',
                      selectedAgent.locked && 'cursor-not-allowed opacity-70',
                    )}
                    disabled={selectedAgent.locked}
                    onChange={(event) => setEditedInstructions(event.target.value)}
                    value={editedInstructions}
                  />
                  {!selectedAgent.locked && (
                    <div className="flex flex-wrap gap-2">
                      <Button disabled>
                        <Save data-icon="inline-start" />
                        Save Changes
                      </Button>
                      <Button
                        onClick={() =>
                          setEditedInstructions(selectedAgent.instructions)
                        }
                        type="button"
                        variant="outline"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="size-4" />
                    Capabilities
                  </CardTitle>
                  <CardDescription>
                    Display-only capability placeholders for the future agent
                    library.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {[
                    'Read workspace context',
                    'Draft structured actions',
                    'Request confirmation',
                    'Stay hidden from client-facing users',
                  ].map((capability) => (
                    <div
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      key={capability}
                    >
                      <span className="size-2 rounded-full bg-success" />
                      {capability}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-md border border-dashed p-8 text-center">
              <div>
                <Bot className="mx-auto mb-3 size-9 text-muted-foreground" />
                <h3 className="font-semibold">Select an agent</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Choose an agent from the library to inspect its placeholder
                  configuration.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
