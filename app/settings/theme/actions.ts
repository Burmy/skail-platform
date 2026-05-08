'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getThemePermissions } from '@/lib/theme/permissions'
import {
  APPROVED_FONTS,
  BORDER_OPTIONS,
  DENSITY_OPTIONS,
  GALLERY_CARD_STYLES,
  ICON_TYPES,
  objectValue,
  RADIUS_OPTIONS,
  safeUrl,
  serializePageBackground,
  serializePageLayout,
  serializePageTypography,
  serializeThemeTokens,
  serializeViewStyle,
  serializeWidgetStyle,
  SHADOW_OPTIONS,
  SPACING_OPTIONS,
  STATUS_COLOR_PALETTES,
  THEME_MODES,
  type PageStyle,
  type ThemeTokens,
  type ViewStyle,
  type WidgetStyle,
} from '@/lib/theme/types'

export type ThemeActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

type AdminClient = ReturnType<typeof createAdminClient>

const initialActionState: ThemeActionState = {
  status: 'idle',
}

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a 6-digit hex color.')
  .transform((value) => value.toLowerCase())

const formString = z.preprocess(
  (value) => (typeof value === 'string' ? value : ''),
  z.string(),
)

const optionalUrl = formString.transform((value) => safeUrl(value))

const workspaceScopedSchema = z.object({
  workspaceId: z.string().uuid(),
})

const updateThemeSchema = workspaceScopedSchema.extend({
  themeId: formString,
  scope: z.enum(['shared', 'personal']),
  mode: z.enum(THEME_MODES),
  brandFont: z.enum(APPROVED_FONTS),
  headingFont: z.enum(APPROVED_FONTS),
  bodyFont: z.enum(APPROVED_FONTS),
  accentColor: hexColor,
  backgroundColor: hexColor,
  cardColor: hexColor,
  buttonColor: hexColor,
  linkColor: hexColor,
  highlightColor: hexColor,
})

const resetThemeSchema = workspaceScopedSchema

const updatePageStyleSchema = workspaceScopedSchema.extend({
  pageId: z.string().uuid(),
  title: formString.pipe(z.string().trim().min(1).max(80)),
  iconType: z.enum(ICON_TYPES),
  iconValue: formString.pipe(z.string().trim().max(80)),
  coverImageUrl: optionalUrl,
  logoImageUrl: optionalUrl,
  pageBackgroundColor: hexColor,
  sectionBackgroundColor: hexColor,
  spacingDensity: z.enum(SPACING_OPTIONS),
})

const updateWidgetStyleSchema = workspaceScopedSchema.extend({
  widgetId: z.string().uuid(),
  backgroundColor: hexColor,
  textColor: hexColor,
  border: z.enum(BORDER_OPTIONS),
  roundedCorners: z.enum(RADIUS_OPTIONS),
  shadow: z.enum(SHADOW_OPTIONS),
  headerColor: hexColor,
  density: z.enum(DENSITY_OPTIONS),
})

const updateViewStyleSchema = workspaceScopedSchema.extend({
  viewId: z.string().uuid(),
  tableHeaderColor: hexColor,
  kanbanColumnColor: hexColor,
  calendarEventColor: hexColor,
  galleryCardStyle: z.enum(GALLERY_CARD_STYLES),
  statusColorPalette: z.enum(STATUS_COLOR_PALETTES),
  density: z.enum(DENSITY_OPTIONS),
})

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the form and try again.'
}

function success(message: string): ThemeActionState {
  return {
    status: 'success',
    message,
  }
}

function error(message: string): ThemeActionState {
  return {
    status: 'error',
    message,
  }
}

function revalidateTheme(workspaceId: string) {
  revalidatePath('/', 'layout')
  revalidatePath(`/settings/theme?workspace_id=${workspaceId}`)
  revalidatePath('/settings/theme')
  revalidatePath(`/workspaces/${workspaceId}`)
  revalidatePath(`/pages?workspace_id=${workspaceId}`)
  revalidatePath(`/databases?workspace_id=${workspaceId}`)
  revalidatePath(`/views?workspace_id=${workspaceId}`)
}

async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      state: error('Sign in before editing theme settings.'),
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return {
      ok: false as const,
      state: error(membershipError.message),
    }
  }

  if (!membership) {
    return {
      ok: false as const,
      state: error('You do not have access to this workspace.'),
    }
  }

  try {
    return {
      ok: true as const,
      admin: createAdminClient(),
      permissions: getThemePermissions(membership.role_key),
      roleKey: membership.role_key,
      user,
    }
  } catch (adminError) {
    return {
      ok: false as const,
      state: error(
        adminError instanceof Error
          ? adminError.message
          : 'Supabase admin writes are not configured.',
      ),
    }
  }
}

async function pageBelongsToWorkspace(
  admin: AdminClient,
  workspaceId: string,
  pageId: string,
) {
  const { data, error: pageError } = await admin
    .from('pages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .maybeSingle()

  if (pageError) {
    throw new Error(pageError.message)
  }

  return Boolean(data)
}

async function widgetBelongsToWorkspace(
  admin: AdminClient,
  workspaceId: string,
  widgetId: string,
) {
  const { data, error: widgetError } = await admin
    .from('widgets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('id', widgetId)
    .maybeSingle()

  if (widgetError) {
    throw new Error(widgetError.message)
  }

  return Boolean(data)
}

async function viewBelongsToWorkspace(
  admin: AdminClient,
  workspaceId: string,
  viewId: string,
) {
  const { data, error: viewError } = await admin
    .from('views')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)
    .maybeSingle()

  if (viewError) {
    throw new Error(viewError.message)
  }

  return Boolean(data)
}

export async function updateThemeSettings(
  _state: ThemeActionState = initialActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const parsed = updateThemeSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    themeId: formData.get('themeId'),
    scope: formData.get('scope'),
    mode: formData.get('mode'),
    brandFont: formData.get('brandFont'),
    headingFont: formData.get('headingFont'),
    bodyFont: formData.get('bodyFont'),
    accentColor: formData.get('accentColor'),
    backgroundColor: formData.get('backgroundColor'),
    cardColor: formData.get('cardColor'),
    buttonColor: formData.get('buttonColor'),
    linkColor: formData.get('linkColor'),
    highlightColor: formData.get('highlightColor'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  if (parsed.data.scope === 'shared' && !access.permissions.canEditSharedTheme) {
    return error('You need layout or workspace management permission to edit shared theme settings.')
  }

  if (
    parsed.data.scope === 'personal' &&
    !access.permissions.canCreatePersonalOverrides
  ) {
    return error('You do not have permission to create personal style overrides.')
  }

  const tokens: ThemeTokens = {
    schemaVersion: 1,
    scope: parsed.data.scope,
    userId: parsed.data.scope === 'personal' ? access.user.id : undefined,
    brandFont: parsed.data.brandFont,
    headingFont: parsed.data.headingFont,
    bodyFont: parsed.data.bodyFont,
    accentColor: parsed.data.accentColor,
    backgroundColor: parsed.data.backgroundColor,
    cardColor: parsed.data.cardColor,
    buttonColor: parsed.data.buttonColor,
    linkColor: parsed.data.linkColor,
    highlightColor: parsed.data.highlightColor,
  }
  const themeId = parsed.data.themeId || null

  if (themeId) {
    const { error: updateError } = await access.admin
      .from('themes')
      .update({
        name:
          parsed.data.scope === 'shared'
            ? 'Workspace default'
            : `Personal theme ${access.user.id}`,
        mode: parsed.data.mode,
        is_default: parsed.data.scope === 'shared',
        tokens_json: serializeThemeTokens(tokens),
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('id', themeId)

    if (updateError) {
      return error(updateError.message)
    }
  } else {
    const { error: insertError } = await access.admin.from('themes').insert({
      workspace_id: parsed.data.workspaceId,
      name:
        parsed.data.scope === 'shared'
          ? 'Workspace default'
          : `Personal theme ${access.user.id}`,
      mode: parsed.data.mode,
      is_default: parsed.data.scope === 'shared',
      tokens_json: serializeThemeTokens(tokens),
    })

    if (insertError) {
      return error(insertError.message)
    }
  }

  revalidateTheme(parsed.data.workspaceId)
  return success(
    parsed.data.scope === 'shared'
      ? 'Workspace theme saved.'
      : 'Personal theme override saved.',
  )
}

export async function resetThemeSettings(
  _state: ThemeActionState = initialActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const parsed = resetThemeSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  if (!access.permissions.canEditSharedTheme) {
    return error(
      'You need layout or workspace management permission to reset the workspace theme.',
    )
  }

  const { data: themes, error: themesError } = await access.admin
    .from('themes')
    .select('id,is_default,tokens_json')
    .eq('workspace_id', parsed.data.workspaceId)

  if (themesError) {
    return error(themesError.message)
  }

  const themeIdsToDelete =
    themes
      ?.filter((theme) => {
        const tokens = objectValue(theme.tokens_json)

        return (
          theme.is_default ||
          (tokens.scope === 'personal' && tokens.userId === access.user.id)
        )
      })
      .map((theme) => theme.id) ?? []

  if (themeIdsToDelete.length > 0) {
    const { error: deleteError } = await access.admin
      .from('themes')
      .delete()
      .eq('workspace_id', parsed.data.workspaceId)
      .in('id', themeIdsToDelete)

    if (deleteError) {
      return error(deleteError.message)
    }
  }

  const [pageStylesDelete, widgetStylesDelete, viewStylesDelete] =
    await Promise.all([
      access.admin
        .from('page_style_settings')
        .delete()
        .eq('workspace_id', parsed.data.workspaceId),
      access.admin
        .from('widget_style_settings')
        .delete()
        .eq('workspace_id', parsed.data.workspaceId),
      access.admin
        .from('view_style_settings')
        .delete()
        .eq('workspace_id', parsed.data.workspaceId),
    ])

  if (pageStylesDelete.error) {
    return error(pageStylesDelete.error.message)
  }

  if (widgetStylesDelete.error) {
    return error(widgetStylesDelete.error.message)
  }

  if (viewStylesDelete.error) {
    return error(viewStylesDelete.error.message)
  }

  revalidateTheme(parsed.data.workspaceId)
  return success('Theme and style overrides reset to default tokens.')
}

export async function updatePageStyleSettings(
  _state: ThemeActionState = initialActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const parsed = updatePageStyleSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    pageId: formData.get('pageId'),
    title: formData.get('title'),
    iconType: formData.get('iconType'),
    iconValue: formData.get('iconValue'),
    coverImageUrl: formData.get('coverImageUrl'),
    logoImageUrl: formData.get('logoImageUrl'),
    pageBackgroundColor: formData.get('pageBackgroundColor'),
    sectionBackgroundColor: formData.get('sectionBackgroundColor'),
    spacingDensity: formData.get('spacingDensity'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  if (!access.permissions.canManageLayouts) {
    return error('You need layout management permission to edit page styling.')
  }

  try {
    const pageExists = await pageBelongsToWorkspace(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.pageId,
    )

    if (!pageExists) {
      return error('Page not found.')
    }

    const pageStyle: PageStyle = {
      pageBackgroundColor: parsed.data.pageBackgroundColor,
      sectionBackgroundColor: parsed.data.sectionBackgroundColor,
      spacingDensity: parsed.data.spacingDensity,
      logoImageUrl: parsed.data.logoImageUrl,
    }
    const [pageUpdate, styleUpdate] = await Promise.all([
      access.admin
        .from('pages')
        .update({
          title: parsed.data.title,
          icon: parsed.data.iconValue || null,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', parsed.data.workspaceId)
        .eq('id', parsed.data.pageId)
        .eq('is_locked', false),
      access.admin.from('page_style_settings').upsert(
        {
          workspace_id: parsed.data.workspaceId,
          page_id: parsed.data.pageId,
          cover_image_url: parsed.data.coverImageUrl || null,
          icon_type: parsed.data.iconType,
          icon_value: parsed.data.iconValue || null,
          background_json: serializePageBackground(pageStyle),
          typography_json: serializePageTypography(pageStyle),
          layout_style_json: serializePageLayout(pageStyle),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'page_id',
        },
      ),
    ])

    if (pageUpdate.error) {
      return error(pageUpdate.error.message)
    }

    if (styleUpdate.error) {
      return error(styleUpdate.error.message)
    }
  } catch (pageError) {
    return error(
      pageError instanceof Error ? pageError.message : 'Page style not saved.',
    )
  }

  revalidateTheme(parsed.data.workspaceId)
  return success('Page style saved.')
}

export async function updateWidgetStyleSettings(
  _state: ThemeActionState = initialActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const parsed = updateWidgetStyleSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    widgetId: formData.get('widgetId'),
    backgroundColor: formData.get('backgroundColor'),
    textColor: formData.get('textColor'),
    border: formData.get('border'),
    roundedCorners: formData.get('roundedCorners'),
    shadow: formData.get('shadow'),
    headerColor: formData.get('headerColor'),
    density: formData.get('density'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  if (!access.permissions.canManageLayouts) {
    return error('You need layout management permission to edit widget styling.')
  }

  try {
    const widgetExists = await widgetBelongsToWorkspace(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.widgetId,
    )

    if (!widgetExists) {
      return error('Widget not found.')
    }

    const style: WidgetStyle = {
      backgroundColor: parsed.data.backgroundColor,
      textColor: parsed.data.textColor,
      border: parsed.data.border,
      roundedCorners: parsed.data.roundedCorners,
      shadow: parsed.data.shadow,
      headerColor: parsed.data.headerColor,
      density: parsed.data.density,
    }
    const { error: upsertError } = await access.admin
      .from('widget_style_settings')
      .upsert(
        {
          workspace_id: parsed.data.workspaceId,
          widget_id: parsed.data.widgetId,
          style_json: serializeWidgetStyle(style),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'widget_id',
        },
      )

    if (upsertError) {
      return error(upsertError.message)
    }
  } catch (widgetError) {
    return error(
      widgetError instanceof Error ? widgetError.message : 'Widget style not saved.',
    )
  }

  revalidateTheme(parsed.data.workspaceId)
  return success('Widget style saved.')
}

export async function updateViewStyleSettings(
  _state: ThemeActionState = initialActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const parsed = updateViewStyleSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    viewId: formData.get('viewId'),
    tableHeaderColor: formData.get('tableHeaderColor'),
    kanbanColumnColor: formData.get('kanbanColumnColor'),
    calendarEventColor: formData.get('calendarEventColor'),
    galleryCardStyle: formData.get('galleryCardStyle'),
    statusColorPalette: formData.get('statusColorPalette'),
    density: formData.get('density'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  if (!access.permissions.canManageLayouts) {
    return error('You need layout management permission to edit view styling.')
  }

  try {
    const viewExists = await viewBelongsToWorkspace(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.viewId,
    )

    if (!viewExists) {
      return error('View not found.')
    }

    const style: ViewStyle = {
      tableHeaderColor: parsed.data.tableHeaderColor,
      kanbanColumnColor: parsed.data.kanbanColumnColor,
      calendarEventColor: parsed.data.calendarEventColor,
      galleryCardStyle: parsed.data.galleryCardStyle,
      statusColorPalette: parsed.data.statusColorPalette,
      density: parsed.data.density,
    }
    const { error: upsertError } = await access.admin
      .from('view_style_settings')
      .upsert(
        {
          workspace_id: parsed.data.workspaceId,
          view_id: parsed.data.viewId,
          style_json: serializeViewStyle(style),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'view_id',
        },
      )

    if (upsertError) {
      return error(upsertError.message)
    }
  } catch (viewError) {
    return error(
      viewError instanceof Error ? viewError.message : 'View style not saved.',
    )
  }

  revalidateTheme(parsed.data.workspaceId)
  return success('View style saved.')
}
