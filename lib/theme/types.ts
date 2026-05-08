import type {
  Json,
  PageStyleSetting,
  Theme,
  ViewStyleSetting,
  WidgetStyleSetting,
} from '@/lib/supabase/database.types'

export const THEME_MODES = ['light', 'dark', 'system'] as const
export const APPROVED_FONTS = ['inter', 'system', 'geist', 'serif', 'mono'] as const
export const DENSITY_OPTIONS = ['compact', 'comfortable'] as const
export const SPACING_OPTIONS = ['compact', 'standard', 'relaxed'] as const
export const ICON_TYPES = ['emoji', 'icon', 'image'] as const
export const BORDER_OPTIONS = ['none', 'subtle', 'solid', 'accent'] as const
export const RADIUS_OPTIONS = ['none', 'sm', 'md', 'lg'] as const
export const SHADOW_OPTIONS = ['none', 'sm', 'md', 'lg'] as const
export const GALLERY_CARD_STYLES = ['flat', 'outlined', 'elevated'] as const
export const STATUS_COLOR_PALETTES = [
  'default',
  'soft',
  'vivid',
  'mono',
] as const

export type ThemeMode = (typeof THEME_MODES)[number]
export type ApprovedFont = (typeof APPROVED_FONTS)[number]
export type DensityOption = (typeof DENSITY_OPTIONS)[number]
export type SpacingOption = (typeof SPACING_OPTIONS)[number]
export type IconType = (typeof ICON_TYPES)[number]
export type BorderOption = (typeof BORDER_OPTIONS)[number]
export type RadiusOption = (typeof RADIUS_OPTIONS)[number]
export type ShadowOption = (typeof SHADOW_OPTIONS)[number]
export type GalleryCardStyle = (typeof GALLERY_CARD_STYLES)[number]
export type StatusColorPalette = (typeof STATUS_COLOR_PALETTES)[number]

export type ThemeTokens = {
  schemaVersion: 1
  scope: 'shared' | 'personal'
  userId?: string
  brandFont: ApprovedFont
  headingFont: ApprovedFont
  bodyFont: ApprovedFont
  accentColor: string
  backgroundColor: string
  cardColor: string
  buttonColor: string
  linkColor: string
  highlightColor: string
}

export type ThemeWithTokens = Theme & {
  mode: ThemeMode
  tokens: ThemeTokens
}

export type PageStyle = {
  pageBackgroundColor: string
  sectionBackgroundColor: string
  spacingDensity: SpacingOption
  logoImageUrl: string
}

export type PageStyleWithConfig = PageStyleSetting & {
  icon_type: IconType | null
  background: Pick<PageStyle, 'pageBackgroundColor' | 'sectionBackgroundColor'>
  typography: Pick<PageStyle, 'logoImageUrl'>
  layoutStyle: Pick<PageStyle, 'spacingDensity'>
}

export type WidgetStyle = {
  backgroundColor: string
  textColor: string
  border: BorderOption
  roundedCorners: RadiusOption
  shadow: ShadowOption
  headerColor: string
  density: DensityOption
}

export type WidgetStyleWithConfig = WidgetStyleSetting & {
  style: WidgetStyle
}

export type ViewStyle = {
  tableHeaderColor: string
  kanbanColumnColor: string
  calendarEventColor: string
  galleryCardStyle: GalleryCardStyle
  statusColorPalette: StatusColorPalette
  density: DensityOption
}

export type ViewStyleWithConfig = ViewStyleSetting & {
  style: ViewStyle
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  schemaVersion: 1,
  scope: 'shared',
  brandFont: 'inter',
  headingFont: 'inter',
  bodyFont: 'inter',
  accentColor: '#7c6ee6',
  backgroundColor: '#fbfaf8',
  cardColor: '#ffffff',
  buttonColor: '#5645d4',
  linkColor: '#4f46c7',
  highlightColor: '#fff2a8',
}

export const DEFAULT_PAGE_STYLE: PageStyle = {
  pageBackgroundColor: '#fbfaf8',
  sectionBackgroundColor: '#ffffff',
  spacingDensity: 'standard',
  logoImageUrl: '',
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  border: 'subtle',
  roundedCorners: 'md',
  shadow: 'none',
  headerColor: '#f4f2ee',
  density: 'comfortable',
}

export const DEFAULT_VIEW_STYLE: ViewStyle = {
  tableHeaderColor: '#f4f2ee',
  kanbanColumnColor: '#ffffff',
  calendarEventColor: '#5645d4',
  galleryCardStyle: 'outlined',
  statusColorPalette: 'default',
  density: 'comfortable',
}

export const APPROVED_THEME_STYLE_SCHEMA = {
  schemaVersion: 1,
  destructiveChangesRequirePreview: true,
  arbitraryCssAllowed: false,
  customJavaScriptAllowed: false,
  workspaceTheme: {
    mode: THEME_MODES,
    fonts: APPROVED_FONTS,
    colors: [
      'accentColor',
      'backgroundColor',
      'cardColor',
      'buttonColor',
      'linkColor',
      'highlightColor',
    ],
  },
  pageStyle: {
    iconTypes: ICON_TYPES,
    spacingDensity: SPACING_OPTIONS,
    safeUrlFields: ['coverImageUrl', 'logoImageUrl'],
  },
  widgetStyle: {
    border: BORDER_OPTIONS,
    roundedCorners: RADIUS_OPTIONS,
    shadow: SHADOW_OPTIONS,
    density: DENSITY_OPTIONS,
  },
  viewStyle: {
    galleryCardStyle: GALLERY_CARD_STYLES,
    statusColorPalette: STATUS_COLOR_PALETTES,
    density: DENSITY_OPTIONS,
  },
} as const

const hexPattern = /^#[0-9a-f]{6}$/i

function isEnumValue<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

export function isHexColor(value: string) {
  return hexPattern.test(value)
}

export function safeHexColor(value: unknown, fallback: string) {
  return typeof value === 'string' && isHexColor(value) ? value.toLowerCase() : fallback
}

export function safeUrl(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return ''
  }

  try {
    const url = new URL(value.trim())

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function objectValue(value: Json | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function parseThemeTokens(tokensJson: Json | null, userId?: string) {
  const tokens = objectValue(tokensJson)
  const scope = tokens.scope === 'personal' ? 'personal' : 'shared'
  const personalUserId =
    typeof tokens.userId === 'string' && tokens.userId.trim() !== ''
      ? tokens.userId
      : userId

  return {
    ...DEFAULT_THEME_TOKENS,
    schemaVersion: 1,
    scope,
    userId: scope === 'personal' ? personalUserId : undefined,
    brandFont: isEnumValue(APPROVED_FONTS, tokens.brandFont)
      ? tokens.brandFont
      : DEFAULT_THEME_TOKENS.brandFont,
    headingFont: isEnumValue(APPROVED_FONTS, tokens.headingFont)
      ? tokens.headingFont
      : DEFAULT_THEME_TOKENS.headingFont,
    bodyFont: isEnumValue(APPROVED_FONTS, tokens.bodyFont)
      ? tokens.bodyFont
      : DEFAULT_THEME_TOKENS.bodyFont,
    accentColor: safeHexColor(tokens.accentColor, DEFAULT_THEME_TOKENS.accentColor),
    backgroundColor: safeHexColor(
      tokens.backgroundColor,
      DEFAULT_THEME_TOKENS.backgroundColor,
    ),
    cardColor: safeHexColor(tokens.cardColor, DEFAULT_THEME_TOKENS.cardColor),
    buttonColor: safeHexColor(tokens.buttonColor, DEFAULT_THEME_TOKENS.buttonColor),
    linkColor: safeHexColor(tokens.linkColor, DEFAULT_THEME_TOKENS.linkColor),
    highlightColor: safeHexColor(
      tokens.highlightColor,
      DEFAULT_THEME_TOKENS.highlightColor,
    ),
  } satisfies ThemeTokens
}

export function parseTheme(theme: Theme, userId?: string): ThemeWithTokens {
  return {
    ...theme,
    mode: isEnumValue(THEME_MODES, theme.mode) ? theme.mode : 'light',
    tokens: parseThemeTokens(theme.tokens_json, userId),
  }
}

export function serializeThemeTokens(tokens: ThemeTokens): Json {
  return tokens
}

export function parsePageStyle(row: PageStyleSetting): PageStyleWithConfig {
  const background = objectValue(row.background_json)
  const typography = objectValue(row.typography_json)
  const layout = objectValue(row.layout_style_json)

  return {
    ...row,
    icon_type: isEnumValue(ICON_TYPES, row.icon_type) ? row.icon_type : null,
    background: {
      pageBackgroundColor: safeHexColor(
        background.pageBackgroundColor,
        DEFAULT_PAGE_STYLE.pageBackgroundColor,
      ),
      sectionBackgroundColor: safeHexColor(
        background.sectionBackgroundColor,
        DEFAULT_PAGE_STYLE.sectionBackgroundColor,
      ),
    },
    typography: {
      logoImageUrl: safeUrl(typography.logoImageUrl),
    },
    layoutStyle: {
      spacingDensity: isEnumValue(SPACING_OPTIONS, layout.spacingDensity)
        ? layout.spacingDensity
        : DEFAULT_PAGE_STYLE.spacingDensity,
    },
  }
}

export function parseWidgetStyle(row: WidgetStyleSetting): WidgetStyleWithConfig {
  const style = objectValue(row.style_json)

  return {
    ...row,
    style: {
      backgroundColor: safeHexColor(
        style.backgroundColor,
        DEFAULT_WIDGET_STYLE.backgroundColor,
      ),
      textColor: safeHexColor(style.textColor, DEFAULT_WIDGET_STYLE.textColor),
      border: isEnumValue(BORDER_OPTIONS, style.border)
        ? style.border
        : DEFAULT_WIDGET_STYLE.border,
      roundedCorners: isEnumValue(RADIUS_OPTIONS, style.roundedCorners)
        ? style.roundedCorners
        : DEFAULT_WIDGET_STYLE.roundedCorners,
      shadow: isEnumValue(SHADOW_OPTIONS, style.shadow)
        ? style.shadow
        : DEFAULT_WIDGET_STYLE.shadow,
      headerColor: safeHexColor(style.headerColor, DEFAULT_WIDGET_STYLE.headerColor),
      density: isEnumValue(DENSITY_OPTIONS, style.density)
        ? style.density
        : DEFAULT_WIDGET_STYLE.density,
    },
  }
}

export function parseViewStyle(row: ViewStyleSetting): ViewStyleWithConfig {
  const style = objectValue(row.style_json)

  return {
    ...row,
    style: {
      tableHeaderColor: safeHexColor(
        style.tableHeaderColor,
        DEFAULT_VIEW_STYLE.tableHeaderColor,
      ),
      kanbanColumnColor: safeHexColor(
        style.kanbanColumnColor,
        DEFAULT_VIEW_STYLE.kanbanColumnColor,
      ),
      calendarEventColor: safeHexColor(
        style.calendarEventColor,
        DEFAULT_VIEW_STYLE.calendarEventColor,
      ),
      galleryCardStyle: isEnumValue(GALLERY_CARD_STYLES, style.galleryCardStyle)
        ? style.galleryCardStyle
        : DEFAULT_VIEW_STYLE.galleryCardStyle,
      statusColorPalette: isEnumValue(
        STATUS_COLOR_PALETTES,
        style.statusColorPalette,
      )
        ? style.statusColorPalette
        : DEFAULT_VIEW_STYLE.statusColorPalette,
      density: isEnumValue(DENSITY_OPTIONS, style.density)
        ? style.density
        : DEFAULT_VIEW_STYLE.density,
    },
  }
}

export function serializePageBackground(style: PageStyle): Json {
  return {
    pageBackgroundColor: style.pageBackgroundColor,
    sectionBackgroundColor: style.sectionBackgroundColor,
  }
}

export function serializePageTypography(style: PageStyle): Json {
  return {
    logoImageUrl: style.logoImageUrl,
  }
}

export function serializePageLayout(style: PageStyle): Json {
  return {
    spacingDensity: style.spacingDensity,
  }
}

export function serializeWidgetStyle(style: WidgetStyle): Json {
  return style
}

export function serializeViewStyle(style: ViewStyle): Json {
  return style
}
