'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { widgets } from '@/lib/data'
import { 
  Plus, 
  GripVertical,
  Type,
  Heading,
  Image,
  Minus,
  Square,
  FormInput,
  Table,
  BarChart,
  CreditCard,
  List,
  Code,
  Calendar,
  Eye,
  Settings,
  Trash2,
  Copy,
  ChevronDown,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const widgetIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  Heading,
  Image,
  Minus,
  Square,
  FormInput,
  Table,
  BarChart,
  CreditCard,
  List,
  Code,
  Calendar,
}

interface PageSection {
  id: string
  type: string
  content: string
}

export default function PagesPage() {
  const [activeTab, setActiveTab] = useState('edit')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [sections, setSections] = useState<PageSection[]>([
    { id: '1', type: 'heading', content: 'Welcome to Your Portal' },
    { id: '2', type: 'text', content: 'This is a sample text block. Click to edit the content and customize your page.' },
    { id: '3', type: 'divider', content: '' },
    { id: '4', type: 'card', content: 'Feature Card' },
  ])

  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: Date.now().toString(),
      type,
      content: `New ${type} section`,
    }
    setSections([...sections, newSection])
  }

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id))
  }

  return (
    <DashboardLayout 
      title="Page Builder" 
      description="Create and customize your pages"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button className="gap-2">
            Publish
          </Button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Widgets Panel */}
        <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-4">Widgets</h3>
          <div className="space-y-2">
            {widgets.map((widget) => {
              const Icon = widgetIconMap[widget.icon] || Square
              return (
                <button
                  key={widget.id}
                  onClick={() => addSection(widget.type)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm transition-colors hover:bg-secondary hover:border-primary/50 group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <span className="text-foreground">{widget.label}</span>
                  <Plus className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-card">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-secondary border border-border">
                <TabsTrigger value="edit" className="data-[state=active]:bg-background">
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-background">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-background">
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-secondary">
              <Button 
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setViewport('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewport === 'tablet' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setViewport('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setViewport('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto p-6 flex justify-center">
            <div className={cn(
              'bg-card border border-border rounded-xl shadow-lg transition-all duration-300',
              viewport === 'desktop' && 'w-full max-w-4xl',
              viewport === 'tablet' && 'w-[768px]',
              viewport === 'mobile' && 'w-[375px]'
            )}>
              {/* Page Header */}
              <div className="border-b border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <button className="text-3xl hover:scale-110 transition-transform">
                    📄
                  </button>
                  <Input 
                    defaultValue="My New Page"
                    className="text-2xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-foreground"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Last edited 2 hours ago</span>
                  <Badge variant="secondary">Draft</Badge>
                </div>
              </div>

              {/* Page Content */}
              <div className="p-6 space-y-4 min-h-96">
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Start building your page</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag widgets from the panel or click to add sections
                    </p>
                    <Button variant="outline" className="border-border">
                      Add Section
                    </Button>
                  </div>
                ) : (
                  sections.map((section) => (
                    <SectionRenderer 
                      key={section.id} 
                      section={section} 
                      onRemove={() => removeSection(section.id)}
                    />
                  ))
                )}

                {sections.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-dashed border-border mt-6"
                    onClick={() => addSection('text')}
                  >
                    <Plus className="h-4 w-4" />
                    Add Section
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-72 border-l border-border bg-card p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-4">Properties</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Page Title</label>
              <Input defaultValue="My New Page" className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">URL Slug</label>
              <Input defaultValue="my-new-page" className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Page Icon</label>
              <Button variant="outline" className="w-full justify-start gap-2 border-border">
                <span className="text-xl">📄</span>
                Change Icon
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Cover Image</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3">Visibility</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-between border-border">
                  <span>Status</span>
                  <Badge variant="secondary">Draft</Badge>
                </Button>
                <Button variant="outline" className="w-full justify-between border-border">
                  <span>Access</span>
                  <span className="text-muted-foreground">Public</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SectionRenderer({ section, onRemove }: { section: PageSection; onRemove: () => void }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="group relative rounded-lg border border-transparent hover:border-primary/50 transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button className="p-1 text-muted-foreground hover:text-foreground cursor-grab">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      )}

      {isHovered && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="p-4">
        {section.type === 'heading' && (
          <h2 className="text-2xl font-bold text-foreground">{section.content}</h2>
        )}
        {section.type === 'text' && (
          <p className="text-muted-foreground">{section.content}</p>
        )}
        {section.type === 'divider' && (
          <hr className="border-border" />
        )}
        {section.type === 'card' && (
          <Card className="border-border bg-secondary/30">
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground">{section.content}</h3>
              <p className="text-sm text-muted-foreground mt-1">Card description goes here</p>
            </CardContent>
          </Card>
        )}
        {section.type === 'button' && (
          <Button>{section.content}</Button>
        )}
        {section.type === 'image' && (
          <div className="aspect-video rounded-lg bg-secondary flex items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {section.type === 'form' && (
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Name" className="bg-secondary border-border" />
              <Input placeholder="Email" className="bg-secondary border-border" />
              <Button className="w-full">Submit</Button>
            </CardContent>
          </Card>
        )}
        {section.type === 'table' && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm text-muted-foreground">Column 1</th>
                  <th className="px-4 py-2 text-left text-sm text-muted-foreground">Column 2</th>
                  <th className="px-4 py-2 text-left text-sm text-muted-foreground">Column 3</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2 text-sm text-foreground">Data 1</td>
                  <td className="px-4 py-2 text-sm text-foreground">Data 2</td>
                  <td className="px-4 py-2 text-sm text-foreground">Data 3</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {section.type === 'chart' && (
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="h-48 bg-secondary/30 rounded-lg flex items-center justify-center">
                <BarChart className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
        {section.type === 'list' && (
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              List item 1
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              List item 2
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              List item 3
            </li>
          </ul>
        )}
        {section.type === 'embed' && (
          <div className="aspect-video rounded-lg bg-secondary border-2 border-dashed border-border flex items-center justify-center">
            <div className="text-center">
              <Code className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Embed content here</p>
            </div>
          </div>
        )}
        {section.type === 'calendar' && (
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="h-48 bg-secondary/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
