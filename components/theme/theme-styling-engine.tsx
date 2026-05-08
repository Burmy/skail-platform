'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Code,
  Eye,
  FileText,
  LayoutTemplate,
  Monitor,
  Paintbrush,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Type,
} from 'lucide-react'

import {
  resetThemeSettings,
  updatePageStyleSettings,
  updateThemeSettings,
  updateViewStyleSettings,
  updateWidgetStyleSettings,
  type ThemeActionState,
} from '@/app/settings/theme/actions'
import type { PageWithWidgets } from '@/lib/layout/types'
import {
  APPROVED_FONTS,
  APPROVED_THEME_STYLE_SCHEMA,
  BORDER_OPTIONS,
  DEFAULT_PAGE_STYLE,
  DEFAULT_THEME_TOKENS,
  DEFAULT_VIEW_STYLE,
  DEFAULT_WIDGET_STYLE,
  DENSITY_OPTIONS,
  GALLERY_CARD_STYLES,
  ICON_TYPES,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  SPACING_OPTIONS,
  STATUS_COLOR_PALETTES,
  THEME_MODES,
  type PageStyleWithConfig,
  type ThemeMode,
  type ThemeTokens,
  type ThemeWithTokens,
  type ViewStyleWithConfig,
  type WidgetStyleWithConfig,
} from '@/lib/theme/types'
import type { ThemePermissions } from '@/lib/theme/permissions'
import type { SavedViewWithConfig } from '@/lib/views/types'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialActionState: ThemeActionState = {
  status: 'idle',
}

const fontLabels: Record<(typeof APPROVED_FONTS)[number], string> = {
  inter: 'Inter',
  system: 'System',
  geist: 'Geist',
  serif: 'Serif',
  mono: 'Mono',
}

const modeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

type ThemeStylingEngineProps = {
  workspaceId: string
  initialSection: ThemeSection
  sharedTheme: ThemeWithTokens | null
  personalTheme: ThemeWithTokens | null
  fallbackThemeTokens: ThemeTokens
  pages: PageWithWidgets[]
  views: SavedViewWithConfig[]
  pageStyles: PageStyleWithConfig[]
  widgetStyles: WidgetStyleWithConfig[]
  viewStyles: ViewStyleWithConfig[]
  permissions: ThemePermissions
}

type ThemeSection = 'theme' | 'pages' | 'widgets' | 'views' | 'ai'

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function ActionMessage({ state }: { state: ThemeActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}

function ColorInput({
  label,
  name,
  defaultValue,
  onValueChange,
}: {
  label: string
  name: string
  defaultValue: string
  onValueChange?: (value: string) => void
}) {
  const [swatchValue, setSwatchValue] = useState(defaultValue)
  const [textValue, setTextValue] = useState(defaultValue)

  useEffect(() => {
    setSwatchValue(defaultValue)
    setTextValue(defaultValue)
  }, [defaultValue])

  function updateSwatch(nextValue: string) {
    setSwatchValue(nextValue)
    setTextValue(nextValue)
    onValueChange?.(nextValue.toLowerCase())
  }

  function updateText(nextValue: string) {
    setTextValue(nextValue)
  
    if (/^#[0-9a-f]{6}$/i.test(nextValue)) {
      setSwatchValue(nextValue)
      onValueChange?.(nextValue.toLowerCase())
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="grid grid-cols-[44px_1fr] gap-2">
        <Input
          className="h-10 w-11 p-1"
          id={name}
          name={name}
          onChange={(event) => updateSwatch(event.target.value)}
          type="color"
          value={swatchValue}
        />
        <Input
          onChange={(event) => updateText(event.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          required
          value={textValue}
        />
      </div>
    </div>
  )
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map((channel) => {
    const scaled = channel / 255

    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function readableForeground(background: string) {
  return luminance(background) > 0.45 ? '#1a1a1a' : '#fbfaf8'
}

function ContrastWarning({
  foreground,
  background,
  label,
}: {
  foreground: string
  background: string
  label: string
}) {
  const ratio = contrastRatio(foreground, background)

  if (ratio >= 4.5) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" />
        {label}: {ratio.toFixed(1)} contrast
      </div>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertDescription>
        {label} contrast is {ratio.toFixed(1)}. Aim for 4.5 or higher.
      </AlertDescription>
    </Alert>
  )
}

function themeTokensForScope(
  scope: 'shared' | 'personal',
  sharedTheme: ThemeWithTokens | null,
  personalTheme: ThemeWithTokens | null,
  fallback: ThemeTokens,
) {
  if (scope === 'personal') {
    return personalTheme?.tokens ?? sharedTheme?.tokens ?? fallback
  }

  return sharedTheme?.tokens ?? fallback
}

function themeModeForScope(
  scope: 'shared' | 'personal',
  sharedTheme: ThemeWithTokens | null,
  personalTheme: ThemeWithTokens | null,
) {
  if (scope === 'personal') {
    return personalTheme?.mode ?? sharedTheme?.mode ?? 'system'
  }

  return sharedTheme?.mode ?? 'system'
}

export function ThemeStylingEngine({
  workspaceId,
  initialSection,
  sharedTheme,
  personalTheme,
  fallbackThemeTokens,
  pages,
  views,
  pageStyles,
  widgetStyles,
  viewStyles,
  permissions,
}: ThemeStylingEngineProps) {
  const [section, setSection] = useState<ThemeSection>(initialSection)
  const allWidgets = useMemo(
    () =>
      pages.flatMap((page) =>
        page.widgets.map((widget) => ({
          ...widget,
          pageTitle: page.title,
        })),
      ),
    [pages],
  )

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b bg-card p-4 lg:w-72 lg:border-b-0 lg:border-r">
        <div>
          <h2 className="text-sm font-semibold">Theme + Styling</h2>
          <p className="text-xs text-muted-foreground">
            Safe tokens, no CSS or JavaScript injection.
          </p>
        </div>
        <div className="mt-4 grid gap-1">
          {[
            { id: 'theme', label: 'Workspace theme', icon: Paintbrush },
            { id: 'pages', label: 'Page styles', icon: FileText },
            { id: 'widgets', label: 'Widget styles', icon: LayoutTemplate },
            { id: 'views', label: 'View styles', icon: TableProperties },
            { id: 'ai', label: 'AI schema', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon
            const itemSection = item.id as ThemeSection

            return (
              <a
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  section === itemSection
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                )}
                key={item.id}
                href={`/settings/theme?workspace_id=${workspaceId}&section=${item.id}`}
                onClick={() => setSection(itemSection)}
              >
                <Icon className="size-4" />
                {item.label}
              </a>
            )
          })}
        </div>
        <div className="mt-auto rounded-md border bg-background p-3 text-xs text-muted-foreground">
          Shared edits require layout or workspace management permission. Personal
          overrides do not change the workspace default.
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
        {section === 'theme' && (
          <WorkspaceThemeSection
            fallbackThemeTokens={fallbackThemeTokens}
            permissions={permissions}
            personalTheme={personalTheme}
            sharedTheme={sharedTheme}
            workspaceId={workspaceId}
          />
        )}
        {section === 'pages' && (
          <PageStyleSection
            pageStyles={pageStyles}
            pages={pages}
            permissions={permissions}
            workspaceId={workspaceId}
          />
        )}
        {section === 'widgets' && (
          <WidgetStyleSection
            permissions={permissions}
            widgetStyles={widgetStyles}
            widgets={allWidgets}
            workspaceId={workspaceId}
          />
        )}
        {section === 'views' && (
          <ViewStyleSection
            permissions={permissions}
            viewStyles={viewStyles}
            views={views}
            workspaceId={workspaceId}
          />
        )}
        {section === 'ai' && <AiSchemaSection />}
      </section>
    </div>
  )
}

function WorkspaceThemeSection({
  workspaceId,
  sharedTheme,
  personalTheme,
  fallbackThemeTokens,
  permissions,
}: {
  workspaceId: string
  sharedTheme: ThemeWithTokens | null
  personalTheme: ThemeWithTokens | null
  fallbackThemeTokens: ThemeTokens
  permissions: ThemePermissions
}) {
  const [scope, setScope] = useState<'shared' | 'personal'>('shared')
  const router = useRouter()
  const [state, action, isPending] = useActionState(
    updateThemeSettings,
    initialActionState,
  )
  const [resetState, resetAction, isResetting] = useActionState(
    resetThemeSettings,
    initialActionState,
  )
  const tokens = themeTokensForScope(
    scope,
    sharedTheme,
    personalTheme,
    fallbackThemeTokens,
  )
  const mode = themeModeForScope(scope, sharedTheme, personalTheme)
  const themeId = scope === 'shared' ? sharedTheme?.id ?? '' : personalTheme?.id ?? ''
  const sharedDisabled = scope === 'shared' && !permissions.canEditSharedTheme
  const personalDisabled =
    scope === 'personal' && !permissions.canCreatePersonalOverrides
  const [previewTokens, setPreviewTokens] = useState(tokens)

  useEffect(() => {
    setPreviewTokens(tokens)
  }, [tokens])

  useEffect(() => {
    if (resetState.status === 'success') {
      setScope('shared')
      setPreviewTokens(fallbackThemeTokens)
      router.refresh()
    }
  }, [fallbackThemeTokens, resetState.status, router])

  const buttonForeground = readableForeground(previewTokens.buttonColor)

  function updatePreviewToken(key: keyof ThemeTokens, value: string) {
    setPreviewTokens((currentTokens) => ({
      ...currentTokens,
      [key]: value,
    }))
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={action} className="space-y-6" key={scope}>
        <input name="workspaceId" type="hidden" value={workspaceId} />
        <input name="themeId" type="hidden" value={themeId} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="size-5" />
              Workspace Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>Save target</Label>
              <NativeSelect
                name="scope"
                onChange={(event) => setScope(event.target.value as typeof scope)}
                value={scope}
              >
                <option value="shared">Shared workspace theme</option>
                <option value="personal">Personal override</option>
              </NativeSelect>
              {sharedDisabled && (
                <Alert variant="destructive">
                  <AlertDescription>
                    You need layout or workspace management permission to edit the
                    shared theme.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Mode</Label>
                <NativeSelect defaultValue={mode} name="mode">
                  {THEME_MODES.map((item) => (
                    <option key={item} value={item}>
                      {modeLabels[item]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <FontSelect defaultValue={tokens.brandFont} label="Brand font" name="brandFont" />
              <FontSelect defaultValue={tokens.headingFont} label="Heading font" name="headingFont" />
              <FontSelect defaultValue={tokens.bodyFont} label="Body font" name="bodyFont" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ColorInput
                defaultValue={tokens.accentColor}
                label="Accent color"
                name="accentColor"
                onValueChange={(value) => updatePreviewToken('accentColor', value)}
              />
              <ColorInput
                defaultValue={tokens.backgroundColor}
                label="Background color"
                name="backgroundColor"
                onValueChange={(value) =>
                  updatePreviewToken('backgroundColor', value)
                }
              />
              <ColorInput
                defaultValue={tokens.cardColor}
                label="Card color"
                name="cardColor"
                onValueChange={(value) => updatePreviewToken('cardColor', value)}
              />
              <ColorInput
                defaultValue={tokens.buttonColor}
                label="Button color"
                name="buttonColor"
                onValueChange={(value) => updatePreviewToken('buttonColor', value)}
              />
              <ColorInput
                defaultValue={tokens.linkColor}
                label="Link color"
                name="linkColor"
                onValueChange={(value) => updatePreviewToken('linkColor', value)}
              />
              <ColorInput
                defaultValue={tokens.highlightColor}
                label="Highlight color"
                name="highlightColor"
                onValueChange={(value) =>
                  updatePreviewToken('highlightColor', value)
                }
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                disabled={isPending || sharedDisabled || personalDisabled}
                type="submit"
              >
                <Save data-icon="inline-start" />
                Save theme
              </Button>
              <Button
                disabled={isResetting || !permissions.canEditSharedTheme}
                formAction={resetAction}
                formNoValidate
                type="submit"
                variant="outline"
              >
                <RotateCcw data-icon="inline-start" />
                Reset to defaults
              </Button>
            </div>
            <ActionMessage state={state} />
            <ActionMessage state={resetState} />
            <p className="text-xs leading-5 text-muted-foreground">
              Reset clears workspace theme, page style, widget style, view
              style, and your personal theme override so default tokens apply.
            </p>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-4">
        <ThemePreview tokens={previewTokens} />
        <ContrastWarning
          background={previewTokens.buttonColor}
          foreground={buttonForeground}
          label="Button text"
        />
        <ContrastWarning
          background={previewTokens.backgroundColor}
          foreground={previewTokens.linkColor}
          label="Link on background"
        />
      </div>
    </div>
  )
}

function FontSelect({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: (typeof APPROVED_FONTS)[number]
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <NativeSelect defaultValue={defaultValue} name={name}>
        {APPROVED_FONTS.map((font) => (
          <option key={font} value={font}>
            {fontLabels[font]}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

function ThemePreview({ tokens }: { tokens: ThemeTokens }) {
  const backgroundForeground = readableForeground(tokens.backgroundColor)
  const cardForeground = readableForeground(tokens.cardColor)
  const accentForeground = readableForeground(tokens.accentColor)
  const buttonForeground = readableForeground(tokens.buttonColor)
  const highlightForeground = readableForeground(tokens.highlightColor)

  return (
    <Card
      style={{
        backgroundColor: tokens.backgroundColor,
        color: backgroundForeground,
      }}
    >
      <CardContent className="p-4">
        <div
          className="rounded-md border p-4"
          style={{
            backgroundColor: tokens.cardColor,
            borderColor: tokens.accentColor,
            color: cardForeground,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-md text-sm font-semibold"
              style={{
                backgroundColor: tokens.accentColor,
                color: accentForeground,
              }}
            >
              S
            </div>
            <div>
              <div className="font-semibold">Portal preview</div>
              <a className="text-sm" style={{ color: tokens.linkColor }}>
                Workspace link
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm">
            This preview uses sanitized color tokens.{' '}
            <span
              className="rounded px-1"
              style={{
                backgroundColor: tokens.highlightColor,
                color: highlightForeground,
              }}
            >
              Highlight
            </span>
          </p>
          <Button
            className="mt-4"
            style={{
              backgroundColor: tokens.buttonColor,
              color: buttonForeground,
            }}
          >
            Preview action
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PageStyleSection({
  workspaceId,
  pages,
  pageStyles,
  permissions,
}: {
  workspaceId: string
  pages: PageWithWidgets[]
  pageStyles: PageStyleWithConfig[]
  permissions: ThemePermissions
}) {
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id ?? '')
  const [state, action, isPending] = useActionState(
    updatePageStyleSettings,
    initialActionState,
  )
  const page = pages.find((item) => item.id === selectedPageId) ?? pages[0] ?? null
  const style = pageStyles.find((item) => item.page_id === page?.id)

  if (!page) {
    return <EmptyState title="No pages yet" description="Create a page before styling tabs." />
  }

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          Page and Tab Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5" key={page.id}>
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <input name="pageId" type="hidden" value={page.id} />

          <div className="grid gap-2">
            <Label>Page</Label>
            <NativeSelect
              onChange={(event) => setSelectedPageId(event.target.value)}
              value={selectedPageId}
            >
              {pages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Rename page/tab</Label>
              <Input defaultValue={page.title} name="title" required />
            </div>
            <div className="grid gap-2">
              <Label>Icon type</Label>
              <NativeSelect defaultValue={style?.icon_type ?? 'emoji'} name="iconType">
                {ICON_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Emoji/icon value</Label>
              <Input defaultValue={style?.icon_value ?? page.icon ?? ''} name="iconValue" />
            </div>
            <div className="grid gap-2">
              <Label>Cover image URL</Label>
              <Input
                defaultValue={style?.cover_image_url ?? ''}
                name="coverImageUrl"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Logo/avatar image URL</Label>
              <Input
                defaultValue={style?.typography.logoImageUrl ?? ''}
                name="logoImageUrl"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Spacing density</Label>
              <NativeSelect
                defaultValue={
                  style?.layoutStyle.spacingDensity ?? DEFAULT_PAGE_STYLE.spacingDensity
                }
                name="spacingDensity"
              >
                {SPACING_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <ColorInput
              defaultValue={
                style?.background.pageBackgroundColor ??
                DEFAULT_PAGE_STYLE.pageBackgroundColor
              }
              label="Page background"
              name="pageBackgroundColor"
            />
            <ColorInput
              defaultValue={
                style?.background.sectionBackgroundColor ??
                DEFAULT_PAGE_STYLE.sectionBackgroundColor
              }
              label="Section background"
              name="sectionBackgroundColor"
            />
          </div>

          <Button disabled={isPending || !permissions.canManageLayouts} type="submit">
            <Save data-icon="inline-start" />
            Save page style
          </Button>
          {!permissions.canManageLayouts && (
            <Alert variant="destructive">
              <AlertDescription>
                You need layout management permission to edit page styling.
              </AlertDescription>
            </Alert>
          )}
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  )
}

function WidgetStyleSection({
  workspaceId,
  widgets,
  widgetStyles,
  permissions,
}: {
  workspaceId: string
  widgets: Array<PageWithWidgets['widgets'][number] & { pageTitle: string }>
  widgetStyles: WidgetStyleWithConfig[]
  permissions: ThemePermissions
}) {
  const [selectedWidgetId, setSelectedWidgetId] = useState(widgets[0]?.id ?? '')
  const [state, action, isPending] = useActionState(
    updateWidgetStyleSettings,
    initialActionState,
  )
  const widget =
    widgets.find((item) => item.id === selectedWidgetId) ?? widgets[0] ?? null
  const style = widgetStyles.find((item) => item.widget_id === widget?.id)?.style

  if (!widget) {
    return <EmptyState title="No widgets yet" description="Add widgets before styling them." />
  }

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="size-5" />
          Widget Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5" key={widget.id}>
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <input name="widgetId" type="hidden" value={widget.id} />

          <div className="grid gap-2">
            <Label>Widget</Label>
            <NativeSelect
              onChange={(event) => setSelectedWidgetId(event.target.value)}
              value={selectedWidgetId}
            >
              {widgets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.pageTitle} / {item.title ?? item.widget_type}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ColorInput
              defaultValue={style?.backgroundColor ?? DEFAULT_WIDGET_STYLE.backgroundColor}
              label="Background color"
              name="backgroundColor"
            />
            <ColorInput
              defaultValue={style?.textColor ?? DEFAULT_WIDGET_STYLE.textColor}
              label="Text color"
              name="textColor"
            />
            <ColorInput
              defaultValue={style?.headerColor ?? DEFAULT_WIDGET_STYLE.headerColor}
              label="Header color"
              name="headerColor"
            />
            <TokenSelect
              defaultValue={style?.border ?? DEFAULT_WIDGET_STYLE.border}
              label="Border"
              name="border"
              options={BORDER_OPTIONS}
            />
            <TokenSelect
              defaultValue={style?.roundedCorners ?? DEFAULT_WIDGET_STYLE.roundedCorners}
              label="Rounded corners"
              name="roundedCorners"
              options={RADIUS_OPTIONS}
            />
            <TokenSelect
              defaultValue={style?.shadow ?? DEFAULT_WIDGET_STYLE.shadow}
              label="Shadow"
              name="shadow"
              options={SHADOW_OPTIONS}
            />
            <TokenSelect
              defaultValue={style?.density ?? DEFAULT_WIDGET_STYLE.density}
              label="Display density"
              name="density"
              options={DENSITY_OPTIONS}
            />
          </div>

          <WidgetStylePreview style={style ?? DEFAULT_WIDGET_STYLE} />
          <Button disabled={isPending || !permissions.canManageLayouts} type="submit">
            <Save data-icon="inline-start" />
            Save widget style
          </Button>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  )
}

function ViewStyleSection({
  workspaceId,
  views,
  viewStyles,
  permissions,
}: {
  workspaceId: string
  views: SavedViewWithConfig[]
  viewStyles: ViewStyleWithConfig[]
  permissions: ThemePermissions
}) {
  const [selectedViewId, setSelectedViewId] = useState(views[0]?.id ?? '')
  const [state, action, isPending] = useActionState(
    updateViewStyleSettings,
    initialActionState,
  )
  const view = views.find((item) => item.id === selectedViewId) ?? views[0] ?? null
  const style = viewStyles.find((item) => item.view_id === view?.id)?.style

  if (!view) {
    return <EmptyState title="No views yet" description="Create saved views before styling them." />
  }

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableProperties className="size-5" />
          Database View Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5" key={view.id}>
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <input name="viewId" type="hidden" value={view.id} />
          <div className="grid gap-2">
            <Label>Saved view</Label>
            <NativeSelect
              onChange={(event) => setSelectedViewId(event.target.value)}
              value={selectedViewId}
            >
              {views.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.view_type})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ColorInput
              defaultValue={style?.tableHeaderColor ?? DEFAULT_VIEW_STYLE.tableHeaderColor}
              label="Table header color"
              name="tableHeaderColor"
            />
            <ColorInput
              defaultValue={style?.kanbanColumnColor ?? DEFAULT_VIEW_STYLE.kanbanColumnColor}
              label="Kanban column color"
              name="kanbanColumnColor"
            />
            <ColorInput
              defaultValue={style?.calendarEventColor ?? DEFAULT_VIEW_STYLE.calendarEventColor}
              label="Calendar event color"
              name="calendarEventColor"
            />
            <TokenSelect
              defaultValue={style?.galleryCardStyle ?? DEFAULT_VIEW_STYLE.galleryCardStyle}
              label="Gallery card styling"
              name="galleryCardStyle"
              options={GALLERY_CARD_STYLES}
            />
            <TokenSelect
              defaultValue={style?.statusColorPalette ?? DEFAULT_VIEW_STYLE.statusColorPalette}
              label="Status/select color mapping"
              name="statusColorPalette"
              options={STATUS_COLOR_PALETTES}
            />
            <TokenSelect
              defaultValue={style?.density ?? DEFAULT_VIEW_STYLE.density}
              label="Row/card density"
              name="density"
              options={DENSITY_OPTIONS}
            />
          </div>

          <ViewStylePreview style={style ?? DEFAULT_VIEW_STYLE} />
          <Button disabled={isPending || !permissions.canManageLayouts} type="submit">
            <Save data-icon="inline-start" />
            Save view style
          </Button>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  )
}

function TokenSelect<T extends readonly string[]>({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: T[number]
  options: T
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <NativeSelect defaultValue={defaultValue} name={name}>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

const borderClass = {
  none: 'border-transparent',
  subtle: 'border-border',
  solid: 'border-foreground/40',
  accent: 'border-primary',
}

const radiusClass = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
}

const shadowClass = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

function WidgetStylePreview({ style }: { style: typeof DEFAULT_WIDGET_STYLE }) {
  return (
    <div
      className={cn(
        'border p-4',
        borderClass[style.border],
        radiusClass[style.roundedCorners],
        shadowClass[style.shadow],
        style.density === 'compact' ? 'space-y-2' : 'space-y-4',
      )}
      style={{ backgroundColor: style.backgroundColor, color: style.textColor }}
    >
      <div className="rounded px-3 py-2 text-sm font-medium" style={{ backgroundColor: style.headerColor }}>
        Widget header
      </div>
      <p className="text-sm">Widget body preview with safe style tokens.</p>
    </div>
  )
}

function ViewStylePreview({ style }: { style: typeof DEFAULT_VIEW_STYLE }) {
  const headerForeground = readableForeground(style.tableHeaderColor)
  const eventForeground = readableForeground(style.calendarEventColor)

  return (
    <div className="overflow-hidden rounded-md border">
      <div
        className="grid grid-cols-3 text-sm font-medium"
        style={{
          backgroundColor: style.tableHeaderColor,
          color: headerForeground,
        }}
      >
        <div className="p-2">Name</div>
        <div className="p-2">Status</div>
        <div className="p-2">Date</div>
      </div>
      <div className={cn('grid grid-cols-3 text-sm', style.density === 'compact' ? 'p-2' : 'p-4')}>
        <div>Example record</div>
        <div>
          <Badge
            style={{
              backgroundColor: style.calendarEventColor,
              color: eventForeground,
            }}
          >
            {style.statusColorPalette}
          </Badge>
        </div>
        <div className="text-muted-foreground">Today</div>
      </div>
    </div>
  )
}

function AiSchemaSection() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            AI-Ready Style Schema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertDescription>
              AI Builder can preview these structured design changes later, but
              destructive changes require preview and confirmation before apply.
            </AlertDescription>
          </Alert>
          <pre className="max-h-[520px] overflow-auto rounded-md border bg-background p-4 text-xs">
            <code>{JSON.stringify(APPROVED_THEME_STYLE_SCHEMA, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Code className="mt-0.5 size-4" />
          The schema exposes tokens and enum values only. It excludes arbitrary CSS
          strings, script fields, and raw style blocks.
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-96 items-center justify-center rounded-md border border-dashed p-8 text-center">
      <div>
        <Monitor className="mx-auto mb-3 size-9 text-muted-foreground" />
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
