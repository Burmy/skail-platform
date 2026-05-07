'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Sun,
  Moon,
  Monitor,
  Type,
  Palette,
  Image,
  Smile,
  Upload,
  ChevronDown,
  Save,
  Eye,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fonts = [
  { name: 'Inter', value: 'inter' },
  { name: 'System', value: 'system' },
  { name: 'SF Pro', value: 'sf-pro' },
  { name: 'Roboto', value: 'roboto' },
  { name: 'Open Sans', value: 'open-sans' },
]

const textSizes = [
  { name: 'Small', value: 'sm' },
  { name: 'Default', value: 'base' },
  { name: 'Large', value: 'lg' },
]

const brandColors = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#4f46e5',
]

const highlightColors = [
  '#fef08a', '#bbf7d0', '#a5f3fc', '#e9d5ff', '#fecaca', '#fed7aa',
]

const tabColors = [
  { name: 'Default', bg: 'bg-secondary', text: 'text-foreground' },
  { name: 'Primary', bg: 'bg-primary/10', text: 'text-primary' },
  { name: 'Success', bg: 'bg-success/10', text: 'text-success' },
  { name: 'Warning', bg: 'bg-warning/10', text: 'text-warning' },
]

const viewColors = [
  { name: 'Neutral', value: 'neutral', color: '#71717a' },
  { name: 'Blue', value: 'blue', color: '#3b82f6' },
  { name: 'Green', value: 'green', color: '#22c55e' },
  { name: 'Orange', value: 'orange', color: '#f97316' },
]

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark')
  const [selectedFont, setSelectedFont] = useState('inter')
  const [textSize, setTextSize] = useState('base')
  const [brandColor, setBrandColor] = useState('#7c3aed')
  const [highlightColor, setHighlightColor] = useState('#fef08a')
  const [tabColor, setTabColor] = useState('Default')
  const [viewColor, setViewColor] = useState('neutral')

  return (
    <DashboardLayout 
      title="Theme & Styling" 
      description="Customize the look and feel"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Theme
          </Button>
        </div>
      }
    >
      <div className="p-6 max-w-4xl space-y-6">
        {/* Theme Mode */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance Mode
            </CardTitle>
            <CardDescription>
              Choose between light, dark, or system theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as typeof theme)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors flex-1',
                    theme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/30 hover:bg-secondary'
                  )}
                >
                  <option.icon className={cn(
                    'h-6 w-6',
                    theme === option.value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    theme === option.value ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Type className="h-5 w-5" />
              Typography
            </CardTitle>
            <CardDescription>
              Choose fonts and text sizes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Font Family</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between border-border bg-secondary">
                      {fonts.find(f => f.value === selectedFont)?.name || 'Select font'}
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {fonts.map((font) => (
                      <DropdownMenuItem 
                        key={font.value}
                        onClick={() => setSelectedFont(font.value)}
                      >
                        <span style={{ fontFamily: font.value === 'inter' ? 'Inter' : font.name }}>
                          {font.name}
                        </span>
                        {selectedFont === font.value && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Text Size</Label>
                <div className="flex items-center gap-2">
                  {textSizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setTextSize(size.value)}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-2 text-center transition-colors',
                        textSize === size.value
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary'
                      )}
                    >
                      <span className={cn(
                        size.value === 'sm' && 'text-sm',
                        size.value === 'base' && 'text-base',
                        size.value === 'lg' && 'text-lg'
                      )}>
                        {size.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Brand Colors</CardTitle>
            <CardDescription>
              Primary accent color used throughout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-foreground mb-3 block">Accent Color</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {brandColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrandColor(color)}
                    className={cn(
                      'h-10 w-10 rounded-full transition-all',
                      brandColor === color && 'ring-2 ring-offset-2 ring-offset-background'
                    )}
                    style={{ 
                      backgroundColor: color,
                      ringColor: color,
                    }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-4">
                  <Input 
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-10 p-1 bg-secondary border-border cursor-pointer"
                  />
                  <Input 
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-28 bg-secondary border-border font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-foreground mb-3 block">Highlight Color</Label>
              <div className="flex items-center gap-3">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setHighlightColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-lg transition-all border',
                      highlightColor === color 
                        ? 'ring-2 ring-offset-1 ring-offset-background ring-foreground/20' 
                        : 'border-border'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab & View Colors */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Tab Colors</CardTitle>
              <CardDescription>
                Active tab indicator style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tabColors.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setTabColor(tab.name)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      tabColor === tab.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-secondary'
                    )}
                  >
                    <div className={cn('px-3 py-1 rounded-md text-sm font-medium', tab.bg, tab.text)}>
                      Tab
                    </div>
                    <span className="text-sm text-foreground">{tab.name}</span>
                    {tabColor === tab.name && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Database View Colors</CardTitle>
              <CardDescription>
                Default color for data views
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {viewColors.map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setViewColor(view.value)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      viewColor === view.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-secondary'
                    )}
                  >
                    <div 
                      className="h-6 w-6 rounded-md"
                      style={{ backgroundColor: view.color }}
                    />
                    <span className="text-sm text-foreground">{view.name}</span>
                    {viewColor === view.value && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Page Customization */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Image className="h-5 w-5" />
              Page Customization
            </CardTitle>
            <CardDescription>
              Cover images and icons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-foreground mb-3 block">Default Cover Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-foreground font-medium">Upload cover image</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-foreground mb-3 block">Page Icon Style</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="flex-1 gap-2 border-border">
                    <Smile className="h-4 w-4" />
                    Emoji
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 border-border">
                    <Image className="h-4 w-4" />
                    Image
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-foreground mb-3 block">Logo/Avatar</Label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border bg-secondary flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm">
                    <p className="text-foreground font-medium">Upload Logo</p>
                    <p className="text-muted-foreground">200x200px recommended</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Preview</CardTitle>
            <CardDescription>
              See how your theme looks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-background p-6">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  A
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Acme Corp Portal</h3>
                  <p className="text-sm text-muted-foreground">Your workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {['Home', 'Projects', 'Settings'].map((tab, idx) => (
                  <div
                    key={tab}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm',
                      idx === 0 
                        ? tabColors.find(t => t.name === tabColor)?.bg + ' ' + tabColors.find(t => t.name === tabColor)?.text
                        : 'text-muted-foreground'
                    )}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-foreground mb-2">Sample content with your selected theme</p>
                <p className="text-sm text-muted-foreground mb-4">
                  This is how text will appear in your portal.{' '}
                  <span 
                    className="px-1 rounded"
                    style={{ backgroundColor: highlightColor }}
                  >
                    Highlighted text
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" style={{ backgroundColor: brandColor }} className="text-white">
                    Primary
                  </Button>
                  <Button size="sm" variant="outline" style={{ borderColor: brandColor, color: brandColor }}>
                    Secondary
                  </Button>
                  <Badge style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>
                    Badge
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
