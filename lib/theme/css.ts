import type { CSSProperties } from 'react'

import {
  DEFAULT_THEME_TOKENS,
  type ApprovedFont,
  type ThemeMode,
  type ThemeTokens,
  type ThemeWithTokens,
} from '@/lib/theme/types'

export type WorkspaceThemeStyle = CSSProperties & Record<`--${string}`, string>

const fontFamilyByToken: Record<ApprovedFont, string> = {
  geist: 'var(--font-inter), "Geist", "Geist Fallback", system-ui, sans-serif',
  inter: 'var(--font-inter), "Inter", "Inter Fallback", system-ui, sans-serif',
  mono: 'var(--font-geist-mono), "Geist Mono", ui-monospace, monospace',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function mixHex(first: string, second: string, firstAmount: number) {
  const firstRgb = hexToRgb(first)
  const secondRgb = hexToRgb(second)
  const secondAmount = 1 - firstAmount

  return rgbToHex({
    r: firstRgb.r * firstAmount + secondRgb.r * secondAmount,
    g: firstRgb.g * firstAmount + secondRgb.g * secondAmount,
    b: firstRgb.b * firstAmount + secondRgb.b * secondAmount,
  })
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

function readableForeground(background: string) {
  return luminance(background) > 0.45 ? '#09090b' : '#fafafa'
}

function colorSchemeForMode(mode: ThemeMode | undefined, tokens: ThemeTokens) {
  if (mode === 'light') {
    return 'light'
  }

  if (mode === 'dark') {
    return 'dark'
  }

  return luminance(tokens.backgroundColor) > 0.45 ? 'light' : 'dark'
}

export function workspaceThemeToStyle(
  theme: ThemeWithTokens | null,
): WorkspaceThemeStyle {
  const tokens = theme?.tokens ?? DEFAULT_THEME_TOKENS
  const mode = theme?.mode ?? 'system'
  const foreground = readableForeground(tokens.backgroundColor)
  const cardForeground = readableForeground(tokens.cardColor)
  const buttonForeground = readableForeground(tokens.buttonColor)
  const muted = mixHex(cardForeground, tokens.cardColor, 0.08)
  const secondary = mixHex(cardForeground, tokens.cardColor, 0.12)
  const border = mixHex(cardForeground, tokens.cardColor, 0.18)
  const mutedForeground = mixHex(cardForeground, tokens.backgroundColor, 0.62)
  const accentSurface = mixHex(tokens.accentColor, tokens.cardColor, 0.14)
  const accentSurfaceForeground = readableForeground(accentSurface)
  const surfaceSoft = mixHex(cardForeground, tokens.backgroundColor, 0.04)
  const surfaceRaised = mixHex(tokens.cardColor, tokens.backgroundColor, 0.92)

  return {
    colorScheme: colorSchemeForMode(mode, tokens),
    fontFamily: fontFamilyByToken[tokens.bodyFont],
    '--skail-brand-font': fontFamilyByToken[tokens.brandFont],
    '--skail-heading-font': fontFamilyByToken[tokens.headingFont],
    '--skail-body-font': fontFamilyByToken[tokens.bodyFont],
    '--background': tokens.backgroundColor,
    '--foreground': foreground,
    '--card': tokens.cardColor,
    '--card-foreground': cardForeground,
    '--popover': tokens.cardColor,
    '--popover-foreground': cardForeground,
    '--primary': tokens.buttonColor,
    '--primary-foreground': buttonForeground,
    '--secondary': secondary,
    '--secondary-foreground': cardForeground,
    '--muted': muted,
    '--muted-foreground': mutedForeground,
    '--accent': accentSurface,
    '--accent-foreground': accentSurfaceForeground,
    '--border': border,
    '--input': border,
    '--ring': tokens.accentColor,
    '--surface-soft': surfaceSoft,
    '--surface-raised': surfaceRaised,
    '--text-subtle': mutedForeground,
    '--hairline-soft': border,
    '--chart-1': tokens.buttonColor,
    '--chart-2': tokens.accentColor,
    '--chart-3': tokens.linkColor,
    '--chart-4': tokens.highlightColor,
    '--chart-5': mixHex(tokens.accentColor, tokens.buttonColor, 0.5),
    '--sidebar': tokens.cardColor,
    '--sidebar-foreground': cardForeground,
    '--sidebar-primary': tokens.buttonColor,
    '--sidebar-primary-foreground': buttonForeground,
    '--sidebar-accent': accentSurface,
    '--sidebar-accent-foreground': accentSurfaceForeground,
    '--sidebar-border': border,
    '--sidebar-ring': tokens.accentColor,
  }
}
