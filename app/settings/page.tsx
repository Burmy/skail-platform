'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building, 
  Globe, 
  Palette, 
  Upload,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [hideSkailBranding, setHideSkailBranding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [accentColor, setAccentColor] = useState('#7c3aed')

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const colors = [
    '#7c3aed', // Purple
    '#2563eb', // Blue
    '#0891b2', // Cyan
    '#059669', // Green
    '#d97706', // Amber
    '#dc2626', // Red
    '#db2777', // Pink
    '#4f46e5', // Indigo
  ]

  return (
    <DashboardLayout 
      title="Settings" 
      description="Manage your workspace settings"
    >
      <div className="p-6 max-w-4xl">
        <Tabs defaultValue="white-label" className="space-y-6">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="white-label" className="gap-2 data-[state=active]:bg-background">
              <Building className="h-4 w-4" />
              White Label
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-2 data-[state=active]:bg-background">
              <Globe className="h-4 w-4" />
              Domain
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2 data-[state=active]:bg-background">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="white-label" className="space-y-6">
            {/* Brand Name */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Brand Name</CardTitle>
                <CardDescription>
                  This name will appear throughout your portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name" className="text-foreground">Company Name</Label>
                  <Input 
                    id="brand-name"
                    defaultValue="Acme Corp"
                    className="bg-secondary border-border max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-foreground">Tagline (Optional)</Label>
                  <Input 
                    id="tagline"
                    placeholder="Your company tagline"
                    className="bg-secondary border-border max-w-md"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Logo</CardTitle>
                <CardDescription>
                  Upload your company logo (PNG, SVG, or JPG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border bg-secondary flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Main Logo</span>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border bg-secondary flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">Favicon</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Recommended: 200x50px for main logo, 32x32px for favicon
                </p>
              </CardContent>
            </Card>

            {/* Hide SKAIL Branding */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Hide SKAIL Branding</CardTitle>
                    <CardDescription>
                      Remove all SKAIL branding from your portal
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">Pro</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    {hideSkailBranding ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {hideSkailBranding ? 'Branding Hidden' : 'Branding Visible'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hideSkailBranding 
                          ? 'SKAIL branding is hidden from your portal'
                          : '"Powered by SKAIL" appears in your portal footer'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={hideSkailBranding}
                    onCheckedChange={setHideSkailBranding}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain" className="space-y-6">
            {/* Subdomain */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Portal Subdomain</CardTitle>
                <CardDescription>
                  Your portal will be accessible at this URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input 
                    defaultValue="acme"
                    className="bg-secondary border-border max-w-xs"
                  />
                  <span className="text-muted-foreground">.skail.app</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground flex-1">https://acme.skail.app</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleCopy('https://acme.skail.app')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Domain */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Custom Domain</CardTitle>
                    <CardDescription>
                      Use your own domain for the portal
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">Pro</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Domain</Label>
                  <Input 
                    placeholder="portal.yourdomain.com"
                    className="bg-secondary border-border max-w-md"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add a CNAME record pointing to <code className="px-1.5 py-0.5 rounded bg-secondary text-foreground">portal.skail.app</code>
                </p>
                <Button variant="outline" className="border-border">
                  Verify Domain
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            {/* Accent Color */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Accent Color</CardTitle>
                <CardDescription>
                  Choose your brand&apos;s primary accent color
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          'h-10 w-10 rounded-full transition-all',
                          accentColor === color && 'ring-2 ring-offset-2 ring-offset-background'
                        )}
                        style={{ 
                          backgroundColor: color,
                          ringColor: color,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-foreground">Custom:</Label>
                    <Input 
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 p-1 bg-secondary border-border cursor-pointer"
                    />
                    <Input 
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-28 bg-secondary border-border font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Preview</CardTitle>
                <CardDescription>
                  See how your branding looks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-secondary/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: accentColor }}
                    >
                      A
                    </div>
                    <span className="text-lg font-semibold text-foreground">Acme Corp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button style={{ backgroundColor: accentColor }} className="text-white">
                      Primary Button
                    </Button>
                    <Button 
                      variant="outline" 
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      Secondary Button
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                      Badge
                    </Badge>
                    <span className="text-sm" style={{ color: accentColor }}>
                      Accent text
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
          <Button variant="outline" className="border-border">Cancel</Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
