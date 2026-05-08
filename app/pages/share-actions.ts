'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  acceptInviteToken,
  generateShareToken,
  getCurrentUserPageAccess,
  getCurrentUserStackAccess,
  hashShareToken,
  isPageAccessLevel,
  normalizePageAccessLevel,
  type PageAccessLevel,
  type PageShareLinkType,
  type PageShareScopeType,
} from '@/lib/pages/access'

export type ShareActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const scopeSchema = z.object({
  workspaceId: z.string().uuid(),
  scopeType: z.enum(['page', 'stack']),
  scopeId: z.string().uuid(),
})

const createLinkSchema = scopeSchema.extend({
  linkType: z.enum(['invite', 'public']),
  accessLevel: z.enum(['view', 'edit', 'manage']).default('edit'),
})

const revokeLinkSchema = scopeSchema.extend({
  linkId: z.string().uuid(),
})

const grantSchema = scopeSchema.extend({
  grantId: z.string().uuid(),
})

const updateGrantSchema = grantSchema.extend({
  accessLevel: z.enum(['view', 'edit', 'manage']),
})

async function originFromHeaders() {
  const headerStore = await headers()
  return (
    headerStore.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  )
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Validation failed.'
}

async function requireManageAccess(input: {
  workspaceId: string
  scopeType: PageShareScopeType
  scopeId: string
}) {
  if (input.scopeType === 'page') {
    const access = await getCurrentUserPageAccess({
      workspaceId: input.workspaceId,
      pageId: input.scopeId,
      minimum: 'manage',
    })
    if (!access) return null
    return { userId: access.userId, roleKey: access.roleKey }
  }

  const access = await getCurrentUserStackAccess({
    workspaceId: input.workspaceId,
    stackId: input.scopeId,
    minimum: 'manage',
  })
  if (!access) return null
  return { userId: access.user.id, roleKey: access.roleKey }
}

export async function getShareState(
  input: z.input<typeof scopeSchema>,
): Promise<
  ShareActionResult<{
    links: Array<{
      id: string
      link_type: string
      access_level: string
      created_at: string
      last_used_at: string | null
      revoked_at: string | null
    }>
    grants: Array<{
      id: string
      user_id: string
      access_level: string
      accepted_at: string
      revoked_at: string | null
    }>
    events: Array<{
      id: string
      event_type: string
      access_level: string | null
      created_at: string
      actor_user_id: string | null
      target_user_id: string | null
    }>
  }>
> {
  const parsed = scopeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const manage = await requireManageAccess(parsed.data)
  if (!manage) return { ok: false, error: 'You need manage access to share this.' }

  const admin = createAdminClient()
  const [linksResult, grantsResult, eventsResult] = await Promise.all([
    admin
      .from('page_share_links')
      .select('id, link_type, access_level, created_at, last_used_at, revoked_at')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('scope_type', parsed.data.scopeType)
      .eq('scope_id', parsed.data.scopeId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('page_access_grants')
      .select('id, user_id, access_level, accepted_at, revoked_at')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('scope_type', parsed.data.scopeType)
      .eq('scope_id', parsed.data.scopeId)
      .order('accepted_at', { ascending: false })
      .limit(50),
    admin
      .from('page_share_events')
      .select('id, event_type, access_level, created_at, actor_user_id, target_user_id')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('scope_type', parsed.data.scopeType)
      .eq('scope_id', parsed.data.scopeId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (linksResult.error) return { ok: false, error: linksResult.error.message }
  if (grantsResult.error) return { ok: false, error: grantsResult.error.message }
  if (eventsResult.error) return { ok: false, error: eventsResult.error.message }

  return {
    ok: true,
    data: {
      links: linksResult.data ?? [],
      grants: grantsResult.data ?? [],
      events: eventsResult.data ?? [],
    },
  }
}

export async function createShareLink(
  input: z.input<typeof createLinkSchema>,
): Promise<ShareActionResult<{ url: string; id: string }>> {
  const parsed = createLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const manage = await requireManageAccess(parsed.data)
  if (!manage) return { ok: false, error: 'You need manage access to share this.' }

  const linkType = parsed.data.linkType as PageShareLinkType
  const accessLevel: PageAccessLevel =
    linkType === 'public'
      ? 'view'
      : normalizePageAccessLevel(parsed.data.accessLevel)
  const token = generateShareToken()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('page_share_links')
    .insert({
      workspace_id: parsed.data.workspaceId,
      scope_type: parsed.data.scopeType,
      scope_id: parsed.data.scopeId,
      link_type: linkType,
      access_level: accessLevel,
      token_hash: hashShareToken(token),
      created_by: manage.userId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  await admin.from('page_share_events').insert({
    workspace_id: parsed.data.workspaceId,
    scope_type: parsed.data.scopeType,
    scope_id: parsed.data.scopeId,
    event_type: linkType === 'public' ? 'public_link_created' : 'invite_link_created',
    access_level: accessLevel,
    actor_user_id: manage.userId,
    link_id: data.id,
    metadata_json: {},
  })

  const origin = await originFromHeaders()
  const path = linkType === 'public' ? `/share/${token}` : `/invite/${token}`
  return { ok: true, data: { id: data.id, url: `${origin}${path}` } }
}

export async function revokeShareLink(
  input: z.input<typeof revokeLinkSchema>,
): Promise<ShareActionResult> {
  const parsed = revokeLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const manage = await requireManageAccess(parsed.data)
  if (!manage) return { ok: false, error: 'You need manage access to revoke links.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('page_share_links')
    .update({ revoked_at: now, updated_at: now })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('scope_type', parsed.data.scopeType)
    .eq('scope_id', parsed.data.scopeId)
    .eq('id', parsed.data.linkId)

  if (error) return { ok: false, error: error.message }

  await admin.from('page_share_events').insert({
    workspace_id: parsed.data.workspaceId,
    scope_type: parsed.data.scopeType,
    scope_id: parsed.data.scopeId,
    event_type: 'link_revoked',
    actor_user_id: manage.userId,
    link_id: parsed.data.linkId,
    metadata_json: {},
  })

  return { ok: true }
}

export async function updateAccessGrant(
  input: z.input<typeof updateGrantSchema>,
): Promise<ShareActionResult> {
  const parsed = updateGrantSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  if (!isPageAccessLevel(parsed.data.accessLevel)) {
    return { ok: false, error: 'Invalid access level.' }
  }

  const manage = await requireManageAccess(parsed.data)
  if (!manage) return { ok: false, error: 'You need manage access to change sharing.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('page_access_grants')
    .update({
      access_level: parsed.data.accessLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('scope_type', parsed.data.scopeType)
    .eq('scope_id', parsed.data.scopeId)
    .eq('id', parsed.data.grantId)

  if (error) return { ok: false, error: error.message }

  await admin.from('page_share_events').insert({
    workspace_id: parsed.data.workspaceId,
    scope_type: parsed.data.scopeType,
    scope_id: parsed.data.scopeId,
    event_type: 'grant_updated',
    access_level: parsed.data.accessLevel,
    actor_user_id: manage.userId,
    grant_id: parsed.data.grantId,
    metadata_json: {},
  })

  return { ok: true }
}

export async function revokeAccessGrant(
  input: z.input<typeof grantSchema>,
): Promise<ShareActionResult> {
  const parsed = grantSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const manage = await requireManageAccess(parsed.data)
  if (!manage) return { ok: false, error: 'You need manage access to revoke sharing.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('page_access_grants')
    .update({ revoked_at: now, updated_at: now })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('scope_type', parsed.data.scopeType)
    .eq('scope_id', parsed.data.scopeId)
    .eq('id', parsed.data.grantId)

  if (error) return { ok: false, error: error.message }

  await admin.from('page_share_events').insert({
    workspace_id: parsed.data.workspaceId,
    scope_type: parsed.data.scopeType,
    scope_id: parsed.data.scopeId,
    event_type: 'grant_revoked',
    actor_user_id: manage.userId,
    grant_id: parsed.data.grantId,
    metadata_json: {},
  })

  return { ok: true }
}

export async function acceptInviteAndRedirect(token: string) {
  const result = await acceptInviteToken(token)
  if (!result.ok) {
    redirect(`/login?message=${encodeURIComponent(result.error)}`)
  }

  if (result.pageId) {
    redirect(`/p/${result.pageId}?workspace_id=${result.workspaceId}`)
  }

  redirect(`/pages?workspace_id=${result.workspaceId}`)
}
