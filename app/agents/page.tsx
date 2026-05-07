'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { agents } from '@/lib/data'
import { Agent } from '@/lib/types'
import { 
  Bot, 
  Lock, 
  Pencil, 
  Search,
  Plus,
  Save,
  X,
  Shield,
  Sparkles,
  MessageSquare,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editedInstructions, setEditedInstructions] = useState('')

  const categories = [...new Set(agents.map(a => a.category))]
  
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setEditedInstructions(agent.instructions)
  }

  return (
    <DashboardLayout 
      title="Agent Library" 
      description="Pre-built AI agents for your workspace"
      actions={
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Create Agent
          <Badge variant="secondary" className="bg-warning/10 text-warning ml-1">Pro</Badge>
        </Button>
      }
    >
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Agents List */}
        <div className="w-96 border-r border-border bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {categories.map((category) => {
              const categoryAgents = filteredAgents.filter(a => a.category === category)
              if (categoryAgents.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className={cn(
                          'w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                          selectedAgent?.id === agent.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-secondary/30 hover:bg-secondary hover:border-primary/50'
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xl">
                          {agent.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{agent.name}</span>
                            {agent.locked && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {agent.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedAgent ? (
            <div className="p-6 max-w-3xl">
              {/* Header */}
              <div className="flex items-start gap-4 mb-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-3xl">
                  {selectedAgent.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-foreground">{selectedAgent.name}</h2>
                    {selectedAgent.locked && (
                      <Badge variant="secondary" className="gap-1 bg-muted">
                        <Lock className="h-3 w-3" />
                        Locked Rules
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">{selectedAgent.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary">{selectedAgent.category}</Badge>
                    <Badge variant="outline" className="border-success/50 text-success">
                      Approved
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">1.2k</p>
                    <p className="text-sm text-muted-foreground">Conversations</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">98%</p>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4 text-center">
                    <Bot className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">2.3s</p>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                  </CardContent>
                </Card>
              </div>

              {/* Instructions */}
              <Card className="border-border bg-card mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Instructions
                      </CardTitle>
                      <CardDescription>
                        {selectedAgent.locked 
                          ? 'Core instructions are locked for this agent'
                          : 'Customize how this agent behaves'
                        }
                      </CardDescription>
                    </div>
                    {selectedAgent.locked && (
                      <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning">
                        <Shield className="h-3 w-3" />
                        Protected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedInstructions}
                    onChange={(e) => setEditedInstructions(e.target.value)}
                    disabled={selectedAgent.locked}
                    className={cn(
                      'min-h-32 bg-secondary border-border',
                      selectedAgent.locked && 'opacity-60 cursor-not-allowed'
                    )}
                  />
                  {!selectedAgent.locked && (
                    <div className="flex items-center gap-2 mt-4">
                      <Button className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-border"
                        onClick={() => setEditedInstructions(selectedAgent.instructions)}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Capabilities */}
              <Card className="border-border bg-card mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Capabilities
                  </CardTitle>
                  <CardDescription>What this agent can do</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {['Read databases', 'Write content', 'Send notifications', 'Create records'].map((cap) => (
                      <div key={cap} className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-foreground">{cap}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button className="gap-2">
                  <Bot className="h-4 w-4" />
                  Test Agent
                </Button>
                <Button variant="outline" className="gap-2 border-border">
                  Deploy to Portal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bot className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Select an Agent</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose an agent from the library to view details and customize its behavior
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
