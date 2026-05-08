import 'server-only'

import crypto from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type {
  PageAccessGrant,
  PageShareLink,
  SitePage,
  Workspace,
} from '@/lib/supabase/database.types'

export const PAGE_ACCESS_LEVELS = ['view', 'edit', 'manage'] as const
export type PageAccessLevel = (typeof PAGE_ACCESS_LEVELS)[number]
export type PageShareScopeType = 'page' | 'stack'
export type PageShareLinkType = 'invite' | 'public'

const ACCESS_RANK: Record<PageAccessLevel, number> = {
  view: 1,
  edit: 2,
  manage: 3,
}

export type PageAccessContext = {
  workspaceId: string
  page: SitePage
  userId: string
  userEmail: string | null
  roleKey: string | null
  level: PageAccessLevel
  source: 'workspace' | 'grant'
  grant: PageAccessGrant | null
  canView: boolean
  canEditContent: boolean
  canManageStructure: boolean
}

export type ShareTokenResolution = {
  link: PageShareLink
  workspace: Workspace
  scopeLabel: string
  landingPage: SitePage | null
}

type AdminClient = ReturnType<typeof createAdminClient>

export function isPageAccessLevel(value: unknown): value is PageAccessLevel {
  return (
    typeof value === 'string' &&
    PAGE_ACCESS_LEVELS.includes(value as PageAccessLevel)
  )
}

export function normalizePageAccessLevel(value: unknown): PageAccessLevel {
  return isPageAccessLevel(value) ? value : 'view'
}

export function hasMinimumPageAccess(
  actual: PageAccessLevel,
  minimum: PageAccessLevel,
) {
  return ACCESS_RANK[actual] >= ACCESS_RANK[minimum]
}

export function generateShareToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashShareToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function accessContext(input: {
  workspaceId: string
  page: SitePage
  userId: string
  userEmail: string | null
  roleKey: string | null
  level: PageAccessLevel
  source: 'workspace' | 'grant'
  grant: PageAccessGrant | null
}): PageAccessContext {
  return {
    ...input,
    canView: hasMinimumPageAccess(input.level, 'view'),
    canEditContent: hasMinimumPageAccess(input.level, 'edit'),
    canManageStructure: hasMinimumPageAccess(input.level, 'manage'),
  }
}

async function getActiveMembership(
  admin: AdminClient,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await admin
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getWorkspaceById(
  admin: AdminClient,
  workspaceId: string,
) {
  const { data, error } = await admin
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getPageForAccess(
  admin: AdminClient,
  workspaceId: string,
  pageId: string,
) {
  const { data, error } = await admin
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .is('archived_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getPageDocumentForAccess(
  admin: AdminClient,
  workspaceId: string,
  pageId: string,
) {
  const { data, error } = await admin
    .from('page_documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('page_id', pageId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function getPageAncestorIds(
  admin: AdminClient,
  workspaceId: string,
  page: SitePage,
) {
  const ancestorIds: string[] = []
  let current = page.parent_page_id

  for (let i = 0; i < 20 && current; i++) {
    const { data, error } = await admin
      .from('pages')
      .select('id, parent_page_id')
      .eq('workspace_id', workspaceId)
      .eq('id', current)
      .is('archived_at', null)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) break
    ancestorIds.push(data.id)
    current = data.parent_page_id
  }

  return ancestorIds
}

function grantAppliesToPage(
  grant: PageAccessGrant,
  page: SitePage,
  ancestorIds: string[],
) {
  if (grant.scope_type === 'stack') {
    return page.stack_id === grant.scope_id
  }

  return page.id === grant.scope_id || ancestorIds.includes(grant.scope_id)
}

function pickHighestGrant(
  grants: PageAccessGrant[],
  page: SitePage,
  ancestorIds: string[],
) {
  let best: PageAccessGrant | null = null
  for (const grant of grants) {
    if (!isPageAccessLevel(grant.access_level)) continue
    if (!grantAppliesToPage(grant, page, ancestorIds)) continue
    if (!best) {
      best = grant
      continue
    }
    if (
      ACCESS_RANK[normalizePageAccessLevel(grant.access_level)] >
      ACCESS_RANK[normalizePageAccessLevel(best.access_level)]
    ) {
      best = grant
    }
  }
  return best
}

export async function getCurrentUserPageAccess(input: {
  workspaceId: string
  pageId: string
  minimum?: PageAccessLevel
}): Promise<PageAccessContext | null> {
  const minimum = input.minimum ?? 'view'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const page = await getPageForAccess(admin, input.workspaceId, input.pageId)
  if (!page) return null

  const membership = await getActiveMembership(admin, input.workspaceId, user.id)
  if (membership) {
    const level: PageAccessLevel = 'manage'
    if (!hasMinimumPageAccess(level, minimum)) return null
    return accessContext({
      workspaceId: input.workspaceId,
      page,
      userId: user.id,
      userEmail: user.email ?? null,
      roleKey: membership.role_key,
      level,
      source: 'workspace',
      grant: null,
    })
  }

  const { data: grants, error } = await admin
    .from('page_access_grants')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (error) throw new Error(error.message)

  const ancestorIds = await getPageAncestorIds(admin, input.workspaceId, page)
  const grant = pickHighestGrant(grants ?? [], page, ancestorIds)
  if (!grant) return null

  const level = normalizePageAccessLevel(grant.access_level)
  if (!hasMinimumPageAccess(level, minimum)) return null

  return accessContext({
    workspaceId: input.workspaceId,
    page,
    userId: user.id,
    userEmail: user.email ?? null,
    roleKey: null,
    level,
    source: 'grant',
    grant,
  })
}

export async function getCurrentUserStackAccess(input: {
  workspaceId: string
  stackId: string
  minimum?: PageAccessLevel
}) {
  const minimum = input.minimum ?? 'view'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const membership = await getActiveMembership(admin, input.workspaceId, user.id)
  if (membership) {
    return {
      user,
      roleKey: membership.role_key,
      level: 'manage' as PageAccessLevel,
      source: 'workspace' as const,
      canManageStructure: true,
    }
  }

  const { data: grants, error } = await admin
    .from('page_access_grants')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', user.id)
    .eq('scope_type', 'stack')
    .eq('scope_id', input.stackId)
    .is('revoked_at', null)

  if (error) throw new Error(error.message)

  const best = (grants ?? [])
    .filter((grant) => isPageAccessLevel(grant.access_level))
    .sort(
      (a, b) =>
        ACCESS_RANK[normalizePageAccessLevel(b.access_level)] -
        ACCESS_RANK[normalizePageAccessLevel(a.access_level)],
    )[0]

  if (!best) return null
  const level = normalizePageAccessLevel(best.access_level)
  if (!hasMinimumPageAccess(level, minimum)) return null

  return {
    user,
    roleKey: null,
    level,
    source: 'grant' as const,
    canManageStructure: hasMinimumPageAccess(level, 'manage'),
  }
}

async function getScopeLabel(
  admin: AdminClient,
  workspaceId: string,
  scopeType: PageShareScopeType,
  scopeId: string,
) {
  if (scopeType === 'stack') {
    const { data } = await admin
      .from('page_stacks')
      .select('name')
      .eq('workspace_id', workspaceId)
      .eq('id', scopeId)
      .maybeSingle()
    return data?.name ?? 'Shared stack'
  }

  const page = await getPageForAccess(admin, workspaceId, scopeId)
  return page?.title ?? 'Shared page'
}

async function getLandingPageForScope(
  admin: AdminClient,
  workspaceId: string,
  scopeType: PageShareScopeType,
  scopeId: string,
) {
  if (scopeType === 'page') {
    return getPageForAccess(admin, workspaceId, scopeId)
  }

  const { data, error } = await admin
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('stack_id', scopeId)
    .is('parent_page_id', null)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function resolveShareToken(
  token: string,
): Promise<ShareTokenResolution | null> {
  const admin = createAdminClient()
  const { data: link, error } = await admin
    .from('page_share_links')
    .select('*')
    .eq('token_hash', hashShareToken(token))
    .is('revoked_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!link) return null

  const workspace = await getWorkspaceById(admin, link.workspace_id)
  if (!workspace) return null

  const scopeType =
    link.scope_type === 'stack' ? 'stack' : ('page' as PageShareScopeType)
  const scopeLabel = await getScopeLabel(
    admin,
    link.workspace_id,
    scopeType,
    link.scope_id,
  )
  const landingPage = await getLandingPageForScope(
    admin,
    link.workspace_id,
    scopeType,
    link.scope_id,
  )

  return { link, workspace, scopeLabel, landingPage }
}

export async function pageIsInsideShareScope(input: {
  workspaceId: string
  pageId: string
  scopeType: PageShareScopeType
  scopeId: string
}) {
  const admin = createAdminClient()
  const page = await getPageForAccess(admin, input.workspaceId, input.pageId)
  if (!page) return false

  if (input.scopeType === 'stack') {
    return page.stack_id === input.scopeId
  }

  const ancestors = await getPageAncestorIds(admin, input.workspaceId, page)
  return page.id === input.scopeId || ancestors.includes(input.scopeId)
}

export async function acceptInviteToken(token: string) {
  const resolution = await resolveShareToken(token)
  if (!resolution || resolution.link.link_type !== 'invite') {
    return { ok: false as const, error: 'Invite link is invalid or expired.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, error: 'Sign in to accept this invite.' }
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const level = normalizePageAccessLevel(resolution.link.access_level)

  const { data: existing, error: existingError } = await admin
    .from('page_access_grants')
    .select('*')
    .eq('workspace_id', resolution.link.workspace_id)
    .eq('user_id', user.id)
    .eq('scope_type', resolution.link.scope_type)
    .eq('scope_id', resolution.link.scope_id)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return { ok: false as const, error: existingError.message }
  }

  let grantId = existing?.id ?? null
  if (existing) {
    const existingLevel = normalizePageAccessLevel(existing.access_level)
    const nextLevel = hasMinimumPageAccess(existingLevel, level)
      ? existingLevel
      : level
    const { error } = await admin
      .from('page_access_grants')
      .update({
        access_level: nextLevel,
        source_link_id: resolution.link.id,
        updated_at: now,
      })
      .eq('id', existing.id)
    if (error) return { ok: false as const, error: error.message }
  } else {
    const { data, error } = await admin
      .from('page_access_grants')
      .insert({
        workspace_id: resolution.link.workspace_id,
        user_id: user.id,
        scope_type: resolution.link.scope_type,
        scope_id: resolution.link.scope_id,
        access_level: level,
        source_link_id: resolution.link.id,
        granted_by: resolution.link.created_by,
        accepted_at: now,
      })
      .select('id')
      .single()

    if (error) return { ok: false as const, error: error.message }
    grantId = data.id
  }

  await Promise.all([
    admin
      .from('page_share_links')
      .update({ last_used_at: now, updated_at: now })
      .eq('id', resolution.link.id),
    admin.from('page_share_events').insert({
      workspace_id: resolution.link.workspace_id,
      scope_type: resolution.link.scope_type,
      scope_id: resolution.link.scope_id,
      event_type: 'invite_accepted',
      access_level: level,
      actor_user_id: user.id,
      target_user_id: user.id,
      link_id: resolution.link.id,
      grant_id: grantId,
      metadata_json: { email: user.email ?? null },
    }),
  ])

  return {
    ok: true as const,
    pageId: resolution.landingPage?.id ?? null,
    workspaceId: resolution.link.workspace_id,
  }
}
