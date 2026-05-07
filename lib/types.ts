export type ViewType = 'table' | 'kanban' | 'calendar' | 'dashboard'

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: string
}

export interface Collection {
  id: string
  name: string
  icon: string
  properties: Property[]
  records: Record<string, unknown>[]
}

export interface Property {
  id: string
  name: string
  type: PropertyType
  options?: string[]
}

export type PropertyType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multi-select' 
  | 'date' 
  | 'checkbox' 
  | 'url' 
  | 'email' 
  | 'phone'
  | 'relation'
  | 'formula'
  | 'file'

export interface Agent {
  id: string
  name: string
  description: string
  icon: string
  instructions: string
  locked: boolean
  category: string
}

export interface Widget {
  id: string
  type: string
  label: string
  icon: string
}

export interface ActivityItem {
  id: string
  user: string
  avatar: string
  action: string
  target: string
  time: string
}

export interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}
