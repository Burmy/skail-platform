import { Agent, Collection, ActivityItem, ChecklistItem, Widget } from './types'

export const navItems = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Pages', href: '/pages', icon: 'FileText' },
  { label: 'Databases', href: '/databases', icon: 'Database' },
  { label: 'Views', href: '/views', icon: 'LayoutGrid' },
  { label: 'Templates', href: '/templates', icon: 'Copy' },
  { label: 'AI Builder', href: '/ai-builder', icon: 'Sparkles', badge: 'AI' },
  { label: 'Agents', href: '/agents', icon: 'Bot' },
  { label: 'Automations', href: '/automations', icon: 'Zap' },
  { label: 'Theme', href: '/settings/theme', icon: 'Palette' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
]

export const collections: Collection[] = [
  {
    id: '1',
    name: 'Projects',
    icon: '📁',
    properties: [
      { id: 'p1', name: 'Name', type: 'text' },
      { id: 'p2', name: 'Status', type: 'select', options: ['Active', 'On Hold', 'Completed'] },
      { id: 'p3', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
      { id: 'p4', name: 'Due Date', type: 'date' },
      { id: 'p5', name: 'Assignee', type: 'text' },
    ],
    records: [
      { id: '1', Name: 'Website Redesign', Status: 'Active', Priority: 'High', 'Due Date': '2024-02-15', Assignee: 'Sarah Chen' },
      { id: '2', Name: 'Mobile App MVP', Status: 'Active', Priority: 'High', 'Due Date': '2024-03-01', Assignee: 'Alex Kim' },
      { id: '3', Name: 'API Integration', Status: 'On Hold', Priority: 'Medium', 'Due Date': '2024-02-28', Assignee: 'Jordan Lee' },
      { id: '4', Name: 'Documentation Update', Status: 'Completed', Priority: 'Low', 'Due Date': '2024-01-30', Assignee: 'Sam Taylor' },
      { id: '5', Name: 'Security Audit', Status: 'Active', Priority: 'High', 'Due Date': '2024-02-10', Assignee: 'Chris Morgan' },
    ],
  },
  {
    id: '2',
    name: 'Clients',
    icon: '👥',
    properties: [
      { id: 'c1', name: 'Company', type: 'text' },
      { id: 'c2', name: 'Contact', type: 'text' },
      { id: 'c3', name: 'Email', type: 'email' },
      { id: 'c4', name: 'Status', type: 'select', options: ['Active', 'Prospect', 'Inactive'] },
    ],
    records: [
      { id: '1', Company: 'Acme Corp', Contact: 'John Smith', Email: 'john@acme.com', Status: 'Active' },
      { id: '2', Company: 'TechStart Inc', Contact: 'Emily Brown', Email: 'emily@techstart.io', Status: 'Prospect' },
      { id: '3', Company: 'Global Solutions', Contact: 'Michael Chen', Email: 'm.chen@global.com', Status: 'Active' },
    ],
  },
  {
    id: '3',
    name: 'Tasks',
    icon: '✅',
    properties: [
      { id: 't1', name: 'Task', type: 'text' },
      { id: 't2', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
      { id: 't3', name: 'Due', type: 'date' },
    ],
    records: [
      { id: '1', Task: 'Review designs', Status: 'In Progress', Due: '2024-02-05' },
      { id: '2', Task: 'Send proposal', Status: 'To Do', Due: '2024-02-06' },
      { id: '3', Task: 'Client meeting', Status: 'Done', Due: '2024-02-01' },
    ],
  },
]

export const agents: Agent[] = [
  {
    id: '1',
    name: 'Content Writer',
    description: 'Generates professional content for pages, emails, and documentation.',
    icon: '✍️',
    instructions: 'Write clear, concise content that matches the brand voice. Focus on being helpful and professional.',
    locked: false,
    category: 'Content',
  },
  {
    id: '2',
    name: 'Data Analyst',
    description: 'Analyzes database records and provides insights and summaries.',
    icon: '📊',
    instructions: 'Analyze data patterns, identify trends, and present findings in easy-to-understand formats.',
    locked: true,
    category: 'Analytics',
  },
  {
    id: '3',
    name: 'Customer Support',
    description: 'Handles client inquiries and provides helpful responses.',
    icon: '💬',
    instructions: 'Be empathetic and solution-oriented. Always aim to resolve issues efficiently.',
    locked: true,
    category: 'Support',
  },
  {
    id: '4',
    name: 'Project Manager',
    description: 'Helps organize tasks, track progress, and manage timelines.',
    icon: '📋',
    instructions: 'Keep projects on track by monitoring deadlines and flagging blockers early.',
    locked: false,
    category: 'Productivity',
  },
  {
    id: '5',
    name: 'Meeting Assistant',
    description: 'Summarizes meetings, creates action items, and schedules follow-ups.',
    icon: '🎯',
    instructions: 'Extract key decisions and action items from meetings. Create clear summaries.',
    locked: true,
    category: 'Productivity',
  },
  {
    id: '6',
    name: 'Onboarding Guide',
    description: 'Helps new users and clients get started with the platform.',
    icon: '🚀',
    instructions: 'Guide users through setup processes step by step. Be patient and thorough.',
    locked: true,
    category: 'Support',
  },
]

export const widgets: Widget[] = [
  { id: '1', type: 'text', label: 'Text Block', icon: 'Type' },
  { id: '2', type: 'heading', label: 'Heading', icon: 'Heading' },
  { id: '3', type: 'image', label: 'Image', icon: 'Image' },
  { id: '4', type: 'divider', label: 'Divider', icon: 'Minus' },
  { id: '5', type: 'button', label: 'Button', icon: 'Square' },
  { id: '6', type: 'form', label: 'Form', icon: 'FormInput' },
  { id: '7', type: 'table', label: 'Data Table', icon: 'Table' },
  { id: '8', type: 'chart', label: 'Chart', icon: 'BarChart' },
  { id: '9', type: 'card', label: 'Card', icon: 'CreditCard' },
  { id: '10', type: 'list', label: 'List', icon: 'List' },
  { id: '11', type: 'embed', label: 'Embed', icon: 'Code' },
  { id: '12', type: 'calendar', label: 'Calendar', icon: 'Calendar' },
]

export const activityFeed: ActivityItem[] = [
  { id: '1', user: 'Sarah Chen', avatar: 'SC', action: 'updated', target: 'Website Redesign', time: '2 min ago' },
  { id: '2', user: 'Alex Kim', avatar: 'AK', action: 'completed', target: 'API Documentation', time: '15 min ago' },
  { id: '3', user: 'Jordan Lee', avatar: 'JL', action: 'created', target: 'New Client Proposal', time: '1 hour ago' },
  { id: '4', user: 'Sam Taylor', avatar: 'ST', action: 'commented on', target: 'Q1 Planning', time: '2 hours ago' },
  { id: '5', user: 'Chris Morgan', avatar: 'CM', action: 'uploaded', target: 'Brand Assets', time: '3 hours ago' },
]

export const onboardingChecklist: ChecklistItem[] = [
  { id: '1', label: 'Complete your profile', completed: true },
  { id: '2', label: 'Set up your workspace', completed: true },
  { id: '3', label: 'Create your first database', completed: true },
  { id: '4', label: 'Invite team members', completed: false },
  { id: '5', label: 'Connect integrations', completed: false },
  { id: '6', label: 'Customize your portal', completed: false },
]

export const suggestedPrompts = [
  'Create a project tracker with status and deadlines',
  'Build a client onboarding checklist',
  'Design a dashboard with key metrics',
  'Set up an automated email sequence',
  'Generate a weekly report template',
]

export const propertyTypes = [
  { value: 'text', label: 'Text', icon: 'Type' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'select', label: 'Select', icon: 'ChevronDown' },
  { value: 'multi-select', label: 'Multi-Select', icon: 'Tags' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'checkbox', label: 'Checkbox', icon: 'CheckSquare' },
  { value: 'url', label: 'URL', icon: 'Link' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' },
  { value: 'relation', label: 'Relation', icon: 'GitBranch' },
  { value: 'formula', label: 'Formula', icon: 'Function' },
  { value: 'file', label: 'File', icon: 'Paperclip' },
]
