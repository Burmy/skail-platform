'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { suggestedPrompts } from '@/lib/data'
import { 
  Sparkles, 
  Send, 
  Copy, 
  RefreshCw, 
  Check,
  ChevronRight,
  Eye,
  Code,
  Lightbulb,
  Wand2,
  FileText,
  Database,
  Layout,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  preview?: {
    type: string
    title: string
    description: string
  }
}

export default function AIBuilderPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI building assistant. I can help you create pages, databases, views, and automations. What would you like to build today?",
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'll create a project tracker with status and deadline tracking for you. Here's what I'm building:",
        preview: {
          type: 'database',
          title: 'Project Tracker',
          description: 'A database with Name, Status, Priority, Due Date, and Assignee properties',
        },
      }
      setMessages(prev => [...prev, aiResponse])
      setIsGenerating(false)
    }, 1500)
  }

  return (
    <DashboardLayout 
      title="AI Builder" 
      description="Build with AI assistance"
    >
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 1 && (
              <div className="max-w-2xl mx-auto">
                {/* Welcome Card */}
                <Card className="border-border bg-gradient-to-br from-primary/5 to-primary/10 mb-8">
                  <CardContent className="p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">AI Builder</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Describe what you want to build and I&apos;ll help you create it. From pages to databases to automations.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        Pages
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Database className="h-3 w-3" />
                        Databases
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Layout className="h-3 w-3" />
                        Views
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Automations
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Prompts */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Try these prompts
                  </div>
                  <div className="grid gap-2">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputValue(prompt)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary hover:border-primary/50 group"
                      >
                        <Wand2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <span className="text-sm text-foreground flex-1">{prompt}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-2xl',
                  message.role === 'user' ? 'ml-auto' : 'mr-auto'
                )}
              >
                <div className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' && 'flex-row-reverse'
                )}>
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    message.role === 'assistant' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary text-foreground'
                  )}>
                    {message.role === 'assistant' ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      'JD'
                    )}
                  </div>
                  <div className={cn(
                    'rounded-2xl px-4 py-3',
                    message.role === 'assistant' 
                      ? 'bg-card border border-border' 
                      : 'bg-primary text-primary-foreground'
                  )}>
                    <p className="text-sm">{message.content}</p>
                    
                    {message.preview && (
                      <Card className="mt-3 border-border bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{message.preview.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{message.preview.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <Button size="sm" className="gap-1">
                              <Check className="h-3 w-3" />
                              Apply Changes
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 border-border">
                              <Eye className="h-3 w-3" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 border-border">
                              <Code className="h-3 w-3" />
                              View Code
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2 ml-11">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="max-w-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="rounded-2xl bg-card border border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 bg-card">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Textarea 
                  placeholder="Describe what you want to build..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="min-h-[80px] resize-none bg-secondary border-border pr-12"
                />
                <Button 
                  size="icon" 
                  className="absolute right-2 bottom-2"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isGenerating}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI can make mistakes. Review generated content before applying.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-96 border-l border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Preview</h3>
            <Badge variant="secondary">Live</Badge>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <Card className="border-border bg-secondary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Project Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Properties</span>
                    <span className="text-foreground">5 fields</span>
                  </div>
                  <div className="space-y-2">
                    {['Name', 'Status', 'Priority', 'Due Date', 'Assignee'].map((field) => (
                      <div key={field} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-foreground">{field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 p-4 rounded-lg border border-dashed border-border text-center">
              <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Build something to see a live preview
              </p>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <Button className="w-full gap-2" disabled>
              <Check className="h-4 w-4" />
              Apply All Changes
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
