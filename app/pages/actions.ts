'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCurrentUserPageAccess,
  getCurrentUserStackAccess,
  pageIsInsideShareScope,
  resolveShareToken,
  type PageAccessLevel,
} from '@/lib/pages/access'

// ---------------------------------------------------------------------------
// Result shape (mirrors app/databases/actions.ts ActionResult)
// ---------------------------------------------------------------------------
export type PageActionResult<T = void> =
  | { ok: true; data?: T; clientRequestId?: string }
  | { ok: false; error: string; clientRequestId?: string }

function ok<T>(data?: T, clientRequestId?: string): PageActionResult<T> {
  return { ok: true, data, clientRequestId }
}

function fail<T = void>(message: string, clientRequestId?: string): PageActionResult<T> {
  return { ok: false, error: message, clientRequestId }
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Validation failed.'
}

// ---------------------------------------------------------------------------
// Workspace access helper
// ---------------------------------------------------------------------------
async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, error: 'Sign in before editing pages.' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { ok: false as const, error: membershipError.message }
  }
  if (!membership) {
    return { ok: false as const, error: 'No access to this workspace.' }
  }

  try {
    return {
      ok: true as const,
      admin: createAdminClient(),
      roleKey: membership.role_key,
      user,
    }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'Admin client unavailable.',
    }
  }
}

async function requirePagePermission(
  workspaceId: string,
  pageId: string,
  minimum: PageAccessLevel,
) {
  const access = await getCurrentUserPageAccess({ workspaceId, pageId, minimum })
  if (!access) {
    return {
      ok: false as const,
      error:
        minimum === 'manage'
          ? 'You need manage access for this page.'
          : 'You do not have access to this page.',
    }
  }

  try {
    return {
      ok: true as const,
      admin: createAdminClient(),
      roleKey: access.roleKey,
      user: {
        id: access.userId,
        email: access.userEmail,
      },
      pageAccess: access,
    }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'Admin client unavailable.',
    }
  }
}

async function requireStackPermission(
  workspaceId: string,
  stackId: string,
  minimum: PageAccessLevel,
) {
  const access = await getCurrentUserStackAccess({ workspaceId, stackId, minimum })
  if (!access) {
    return {
      ok: false as const,
      error:
        minimum === 'manage'
          ? 'You need manage access for this stack.'
          : 'You do not have access to this stack.',
    }
  }

  try {
    return {
      ok: true as const,
      admin: createAdminClient(),
      roleKey: access.roleKey,
      user: {
        id: access.user.id,
        email: access.user.email ?? null,
      },
      stackAccess: access,
    }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'Admin client unavailable.',
    }
  }
}

function revalidatePageRoutes(pageId?: string) {
  revalidatePath('/pages')
  revalidatePath('/pages/trash')
  if (pageId) revalidatePath(`/p/${pageId}`)
}

// ===========================================================================
// STACKS
// ===========================================================================
const stackBase = z.object({
  workspaceId: z.string().uuid(),
})

const createStackSchema = stackBase.extend({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(80).optional(),
})

export async function createStack(
  input: z.input<typeof createStackSchema>,
): Promise<PageActionResult<{ id: string }>> {
  const parsed = createStackSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return fail(access.error)

  const { data: maxRow } = await access.admin
    .from('page_stacks')
    .select('position')
    .eq('workspace_id', parsed.data.workspaceId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = (maxRow?.position ?? -1) + 1

  const { data, error } = await access.admin
    .from('page_stacks')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      position: nextPos,
      created_by: access.user.id,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)
  revalidatePageRoutes()
  return ok({ id: data.id })
}

const renameStackSchema = stackBase.extend({
  stackId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
})

export async function renameStack(
  input: z.input<typeof renameStackSchema>,
): Promise<PageActionResult> {
  const parsed = renameStackSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requireStackPermission(
    parsed.data.workspaceId,
    parsed.data.stackId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('page_stacks')
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.stackId)

  if (error) return fail(error.message)
  revalidatePageRoutes()
  return ok()
}

const archiveStackSchema = stackBase.extend({ stackId: z.string().uuid() })

export async function archiveStack(
  input: z.input<typeof archiveStackSchema>,
): Promise<PageActionResult> {
  const parsed = archiveStackSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requireStackPermission(
    parsed.data.workspaceId,
    parsed.data.stackId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  // Detach pages from the stack so they don't disappear silently
  await access.admin
    .from('pages')
    .update({ stack_id: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('stack_id', parsed.data.stackId)

  const { error } = await access.admin
    .from('page_stacks')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.stackId)

  if (error) return fail(error.message)
  revalidatePageRoutes()
  return ok()
}

const reorderStacksSchema = stackBase.extend({
  orderedStackIds: z.array(z.string().uuid()).min(1),
})

export async function reorderStacks(
  input: z.input<typeof reorderStacksSchema>,
): Promise<PageActionResult> {
  const parsed = reorderStacksSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return fail(access.error)

  for (let i = 0; i < parsed.data.orderedStackIds.length; i++) {
    await access.admin
      .from('page_stacks')
      .update({ position: i, updated_at: new Date().toISOString() })
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('id', parsed.data.orderedStackIds[i])
  }

  revalidatePageRoutes()
  return ok()
}

// ===========================================================================
// PAGES
// ===========================================================================
const createPageSchema = stackBase.extend({
  stackId: z.string().uuid().nullable().optional(),
  parentPageId: z.string().uuid().nullable().optional(),
  title: z.string().trim().max(160).optional(),
  icon: z.string().trim().max(80).optional(),
})

export async function createPage(
  input: z.input<typeof createPageSchema>,
): Promise<PageActionResult<{ id: string }>> {
  const parsed = createPageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const stackId = parsed.data.stackId ?? null
  const parentPageId = parsed.data.parentPageId ?? null
  const access = parentPageId
    ? await requirePagePermission(parsed.data.workspaceId, parentPageId, 'manage')
    : stackId
      ? await requireStackPermission(parsed.data.workspaceId, stackId, 'manage')
      : await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return fail(access.error)

  // Compute next position within the same scope (stack + parent).
  let posQuery = access.admin
    .from('pages')
    .select('position')
    .eq('workspace_id', parsed.data.workspaceId)
    .order('position', { ascending: false })
    .limit(1)

  posQuery = stackId
    ? posQuery.eq('stack_id', stackId)
    : posQuery.is('stack_id', null)
  posQuery = parentPageId
    ? posQuery.eq('parent_page_id', parentPageId)
    : posQuery.is('parent_page_id', null)

  const { data: maxRow } = await posQuery.maybeSingle()
  const nextPos = (maxRow?.position ?? -1) + 1

  const { data: page, error } = await access.admin
    .from('pages')
    .insert({
      workspace_id: parsed.data.workspaceId,
      stack_id: stackId,
      parent_page_id: parentPageId,
      title: parsed.data.title?.trim() || 'Untitled',
      icon: parsed.data.icon ?? null,
      position: nextPos,
      last_edited_by: access.user.id,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)

  // Seed an empty document
  await access.admin.from('page_documents').insert({
    page_id: page.id,
    workspace_id: parsed.data.workspaceId,
    content_json: { blocks: [] } as never,
    version: 1,
    updated_by: access.user.id,
  })

  // Initial visit
  await access.admin.from('page_visits').upsert(
    {
      workspace_id: parsed.data.workspaceId,
      user_id: access.user.id,
      page_id: page.id,
      last_opened_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id,page_id' },
  )

  revalidatePageRoutes(page.id)
  return ok({ id: page.id })
}

const renamePageSchema = stackBase.extend({
  pageId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
})

export async function renamePage(
  input: z.input<typeof renamePageSchema>,
): Promise<PageActionResult> {
  const parsed = renamePageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'edit',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .update({
      title: parsed.data.title,
      last_edited_by: access.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

const setPageIconSchema = stackBase.extend({
  pageId: z.string().uuid(),
  icon: z.string().trim().max(80).nullable(),
})

export async function setPageIcon(
  input: z.input<typeof setPageIconSchema>,
): Promise<PageActionResult> {
  const parsed = setPageIconSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'edit',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .update({
      icon: parsed.data.icon,
      last_edited_by: access.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

const setPageCoverSchema = stackBase.extend({
  pageId: z.string().uuid(),
  coverImageUrl: z.string().nullable(),
})

export async function setPageCover(
  input: z.input<typeof setPageCoverSchema>,
): Promise<PageActionResult> {
  const parsed = setPageCoverSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'edit',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .update({
      cover_image_url: parsed.data.coverImageUrl,
      last_edited_by: access.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

const movePageSchema = stackBase.extend({
  pageId: z.string().uuid(),
  stackId: z.string().uuid().nullable().optional(),
  parentPageId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export async function movePage(
  input: z.input<typeof movePageSchema>,
): Promise<PageActionResult> {
  const parsed = movePageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  const patch: {
    updated_at: string
    last_edited_by: string
    stack_id?: string | null
    parent_page_id?: string | null
    position?: number
  } = {
    updated_at: new Date().toISOString(),
    last_edited_by: access.user.id,
  }
  if (parsed.data.stackId !== undefined) patch.stack_id = parsed.data.stackId
  if (parsed.data.parentPageId !== undefined) patch.parent_page_id = parsed.data.parentPageId
  if (parsed.data.position !== undefined) patch.position = parsed.data.position

  const { error } = await access.admin
    .from('pages')
    .update(patch)
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

const archivePageSchema = stackBase.extend({ pageId: z.string().uuid() })

export async function archivePage(
  input: z.input<typeof archivePageSchema>,
): Promise<PageActionResult> {
  const parsed = archivePageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

export async function restorePage(
  input: z.input<typeof archivePageSchema>,
): Promise<PageActionResult> {
  const parsed = archivePageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .update({ archived_at: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok()
}

export async function hardDeletePage(
  input: z.input<typeof archivePageSchema>,
): Promise<PageActionResult> {
  const parsed = archivePageSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'manage',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin
    .from('pages')
    .delete()
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)

  if (error) return fail(error.message)
  revalidatePageRoutes()
  return ok()
}

// ===========================================================================
// PAGE DOCUMENT (BlockNote JSON)
// ===========================================================================
const savePageDocumentSchema = stackBase.extend({
  pageId: z.string().uuid(),
  contentJson: z.unknown(),
  expectedVersion: z.number().int().nonnegative(),
  clientRequestId: z.string().optional(),
})

export async function savePageDocument(
  input: z.input<typeof savePageDocumentSchema>,
): Promise<PageActionResult<{ version: number; conflict?: boolean }>> {
  const parsed = savePageDocumentSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error), input.clientRequestId)
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'edit',
  )
  if (!access.ok) return fail(access.error, parsed.data.clientRequestId)

  const { data: current, error: readErr } = await access.admin
    .from('page_documents')
    .select('version')
    .eq('page_id', parsed.data.pageId)
    .maybeSingle()

  if (readErr) return fail(readErr.message, parsed.data.clientRequestId)

  if (current && current.version !== parsed.data.expectedVersion) {
    return {
      ok: false,
      error: `Page changed elsewhere (server v${current.version}, you have v${parsed.data.expectedVersion}).`,
      clientRequestId: parsed.data.clientRequestId,
    }
  }

  const nextVersion = (current?.version ?? 0) + 1
  const now = new Date().toISOString()

  const { error: upsertErr } = await access.admin.from('page_documents').upsert(
    {
      page_id: parsed.data.pageId,
      workspace_id: parsed.data.workspaceId,
      content_json: (parsed.data.contentJson ?? { blocks: [] }) as never,
      version: nextVersion,
      updated_by: access.user.id,
      updated_at: now,
    },
    { onConflict: 'page_id' },
  )

  if (upsertErr) return fail(upsertErr.message, parsed.data.clientRequestId)

  await access.admin
    .from('pages')
    .update({ updated_at: now, last_edited_by: access.user.id })
    .eq('id', parsed.data.pageId)
    .eq('workspace_id', parsed.data.workspaceId)

  return ok({ version: nextVersion }, parsed.data.clientRequestId)
}

// ===========================================================================
// VISITS / RECENTS
// ===========================================================================
const recordPageVisitSchema = stackBase.extend({ pageId: z.string().uuid() })

export async function recordPageVisit(
  input: z.input<typeof recordPageVisitSchema>,
): Promise<PageActionResult> {
  const parsed = recordPageVisitSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'view',
  )
  if (!access.ok) return fail(access.error)

  const { error } = await access.admin.from('page_visits').upsert(
    {
      workspace_id: parsed.data.workspaceId,
      user_id: access.user.id,
      page_id: parsed.data.pageId,
      last_opened_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id,page_id' },
  )

  if (error) return fail(error.message)
  return ok()
}

// ===========================================================================
// PAGE FORMS
// ===========================================================================
const formFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'long_text', 'number', 'select', 'date', 'email', 'url', 'checkbox']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
})

const upsertPageFormSchema = stackBase.extend({
  pageId: z.string().uuid(),
  blockId: z.string().min(1),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(800).optional(),
  fields: z.array(formFieldSchema).default([]),
  submitText: z.string().trim().min(1).max(40).optional(),
  successMessage: z.string().trim().min(1).max(280).optional(),
})

export async function upsertPageForm(
  input: z.input<typeof upsertPageFormSchema>,
): Promise<PageActionResult<{ id: string }>> {
  const parsed = upsertPageFormSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const access = await requirePagePermission(
    parsed.data.workspaceId,
    parsed.data.pageId,
    'edit',
  )
  if (!access.ok) return fail(access.error)

  const { data, error } = await access.admin
    .from('page_forms')
    .upsert(
      {
        workspace_id: parsed.data.workspaceId,
        page_id: parsed.data.pageId,
        block_id: parsed.data.blockId,
        title: parsed.data.title ?? 'Form',
        description: parsed.data.description ?? null,
        fields_json: parsed.data.fields as never,
        submit_text: parsed.data.submitText ?? 'Submit',
        success_message: parsed.data.successMessage ?? 'Thanks for submitting!',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'page_id,block_id' },
    )
    .select('id')
    .single()

  if (error) return fail(error.message)
  revalidatePageRoutes(parsed.data.pageId)
  return ok({ id: data.id })
}

const submitPageFormSchema = z.object({
  formId: z.string().uuid(),
  values: z.record(z.unknown()),
  publicToken: z.string().optional(),
})

export async function submitPageForm(
  input: z.input<typeof submitPageFormSchema>,
): Promise<PageActionResult<{ id: string }>> {
  const parsed = submitPageFormSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))

  const admin = createAdminClient()
  const { data: form, error: formErr } = await admin
    .from('page_forms')
    .select('id, workspace_id, page_id')
    .eq('id', parsed.data.formId)
    .maybeSingle()
  if (formErr) return fail(formErr.message)
  if (!form) return fail('Form not found.')

  let submittedBy: string | null = null

  if (parsed.data.publicToken) {
    const resolution = await resolveShareToken(parsed.data.publicToken)
    if (
      !resolution ||
      resolution.link.link_type !== 'public' ||
      resolution.link.workspace_id !== form.workspace_id
    ) {
      return fail('Public form link is invalid or expired.')
    }

    const inScope = await pageIsInsideShareScope({
      workspaceId: form.workspace_id,
      pageId: form.page_id,
      scopeType: resolution.link.scope_type === 'stack' ? 'stack' : 'page',
      scopeId: resolution.link.scope_id,
    })
    if (!inScope) return fail('This form is not available from this link.')
  } else {
    const access = await requirePagePermission(
      form.workspace_id,
      form.page_id,
      'view',
    )
    if (!access.ok) return fail(access.error)
    submittedBy = access.user.id
  }

  const { data: submission, error: insertErr } = await admin
    .from('page_form_submissions')
    .insert({
      workspace_id: form.workspace_id,
      form_id: parsed.data.formId,
      values_json: parsed.data.values as never,
      submitted_by: submittedBy,
    })
    .select('id')
    .single()

  if (insertErr) return fail(insertErr.message)
  return ok({ id: submission.id })
}
