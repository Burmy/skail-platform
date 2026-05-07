'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { collections, propertyTypes } from '@/lib/data'
import { Collection, Property, PropertyType } from '@/lib/types'
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  GripVertical,
  Type,
  Hash,
  ChevronDown,
  Tags,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
  GitBranch,
  Pencil,
  Search,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const propertyIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  Hash,
  ChevronDown,
  Tags,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
  GitBranch,
  Function: Hash,
  Paperclip: Link,
}

export default function DatabasesPage() {
  const [selectedCollection, setSelectedCollection] = useState<Collection>(collections[0])
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRecords = selectedCollection.records.filter(record => 
    Object.values(record).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <DashboardLayout 
      title="Databases" 
      description="Manage your collections and data"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Database
        </Button>
      }
    >
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Collections Sidebar */}
        <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Collections</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setSelectedCollection(collection)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                  selectedCollection.id === collection.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <span className="text-lg">{collection.icon}</span>
                <span className="flex-1 truncate">{collection.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {collection.records.length}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-card">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCollection.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedCollection.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCollection.records.length} records · {selectedCollection.properties.length} properties
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 bg-secondary border-border"
                />
              </div>
              <Button variant="outline" size="icon" className="border-border">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Data Table */}
            <div className="flex-1 overflow-auto p-6">
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      {selectedCollection.properties.map((prop) => (
                        <th key={prop.id} className="px-4 py-3 text-left">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <PropertyIcon type={prop.type} />
                            {prop.name}
                          </div>
                        </th>
                      ))}
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, idx) => (
                      <tr 
                        key={record.id as string} 
                        className={cn(
                          'border-b border-border transition-colors hover:bg-secondary/30',
                          idx % 2 === 0 ? 'bg-card' : 'bg-card'
                        )}
                      >
                        {selectedCollection.properties.map((prop) => (
                          <td key={prop.id} className="px-4 py-3">
                            <CellValue 
                              value={record[prop.name]} 
                              type={prop.type}
                              options={prop.options}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" className="mt-4 gap-2 border-dashed border-border">
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            </div>

            {/* Properties Panel */}
            <div className="w-72 border-l border-border bg-card p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Properties</h3>
                <AddPropertyButton />
              </div>

              <div className="space-y-2">
                {selectedCollection.properties.map((prop) => (
                  <div 
                    key={prop.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                    <PropertyIcon type={prop.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{prop.type.replace('-', ' ')}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function PropertyIcon({ type }: { type: PropertyType }) {
  const iconData = propertyTypes.find(p => p.value === type)
  if (!iconData) return <Type className="h-4 w-4 text-muted-foreground" />
  
  const Icon = propertyIconMap[iconData.icon] || Type
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

function CellValue({ value, type, options }: { value: unknown; type: PropertyType; options?: string[] }) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  if (type === 'select' && options) {
    const statusColors: Record<string, string> = {
      'Active': 'bg-success/10 text-success',
      'On Hold': 'bg-warning/10 text-warning',
      'Completed': 'bg-muted text-muted-foreground',
      'In Progress': 'bg-primary/10 text-primary',
      'To Do': 'bg-secondary text-secondary-foreground',
      'Done': 'bg-success/10 text-success',
      'High': 'bg-destructive/10 text-destructive',
      'Medium': 'bg-warning/10 text-warning',
      'Low': 'bg-muted text-muted-foreground',
      'Prospect': 'bg-chart-2/10 text-chart-2',
      'Inactive': 'bg-muted text-muted-foreground',
    }
    
    return (
      <Badge 
        variant="secondary" 
        className={cn('font-normal', statusColors[value as string] || 'bg-secondary')}
      >
        {value as string}
      </Badge>
    )
  }

  if (type === 'checkbox') {
    return (
      <div className={cn(
        'h-5 w-5 rounded border flex items-center justify-center',
        value ? 'bg-primary border-primary' : 'border-border'
      )}>
        {value && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
      </div>
    )
  }

  if (type === 'email') {
    return (
      <a href={`mailto:${value}`} className="text-sm text-primary hover:underline">
        {value as string}
      </a>
    )
  }

  return <span className="text-sm text-foreground">{value as string}</span>
}

function AddPropertyButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Property Type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {propertyTypes.map((type) => {
          const Icon = propertyIconMap[type.icon] || Type
          return (
            <DropdownMenuItem key={type.value}>
              <Icon className="mr-2 h-4 w-4" />
              {type.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
