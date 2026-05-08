import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { PageAccessGrant, PageStack, SitePage } from '@/lib/supabase/database.types'
import type { PageNode, StackTreeEntry } from '@/lib/pages/queries'
import type { PageShareScopeType } from '@/lib/pages/access'

function buildTree(rows: SitePage[], stackId: string | null): PageNode[] {
  const inStack = rows.filter((page) =>
    stackId ? page.stack_id === stackId : !page.stack_id,
  )
  const allowedIds = new Set(inStack.map((page) => page.id))
  const byParent = new Map<string | null, PageNode[]>()

  for (const row of inStack) {
    const node: PageNode = { ...row, children: [] }
    const parentKey =
      row.parent_page_id && allowedIds.has(row.parent_page_id)
        ? row.parent_page_id
        : null
    const list = byParent.get(parentKey) ?? []
    list.push(node)
    byParent.set(parentKey, list)
  }

  for (const list of byParent.values()) {
    for (const node of list) {
      node.children = byParent.get(node.id) ?? []
    }
  }

  return byParent.get(null) ?? []
}

function descendantIds(rows: SitePage[], rootPageId: string) {
  const childrenByParent = new Map<string | null, SitePage[]>()
  for (const row of rows) {
    const key = row.parent_page_id ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(row)
    childrenByParent.set(key, list)
  }

  const ids = new Set<string>([rootPageId])
  const stack = [rootPageId]
  while (stack.length > 0) {
    const parentId = stack.pop()!
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (ids.has(child.id)) continue
      ids.add(child.id)
      stack.push(child.id)
    }
  }

  return ids
}

export async function getPortalTreeForScope(input: {
  workspaceId: string
  scopeType: PageShareScopeType
  scopeId: string
}): Promise<StackTreeEntry[]> {
  const admin = createAdminClient()
  const [{ data: stacks, error: stacksError }, { data: pages, error: pagesError }] =
    await Promise.all([
      admin
        .from('page_stacks')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .is('archived_at', null)
        .order('position', { ascending: true }),
      admin
        .from('pages')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .is('archived_at', null)
        .order('position', { ascending: true }),
    ])

  if (stacksError) throw new Error(stacksError.message)
  if (pagesError) throw new Error(pagesError.message)

  const allPages = pages ?? []
  const stackById = new Map((stacks ?? []).map((stack) => [stack.id, stack]))

  if (input.scopeType === 'stack') {
    const stack = stackById.get(input.scopeId) ?? null
    return [
      {
        stack,
        pages: buildTree(
          allPages.filter((page) => page.stack_id === input.scopeId),
          input.scopeId,
        ),
      },
    ]
  }

  const allowedIds = descendantIds(allPages, input.scopeId)
  const scopedPages = allPages.filter((page) => allowedIds.has(page.id))
  const stackIds = Array.from(new Set(scopedPages.map((page) => page.stack_id)))

  return stackIds.map((stackId) => ({
    stack: stackId ? stackById.get(stackId) ?? null : null,
    pages: buildTree(scopedPages, stackId),
  }))
}

export async function getPortalTreeForGrants(input: {
  workspaceId: string
  userId: string
}): Promise<StackTreeEntry[]> {
  const admin = createAdminClient()
  const { data: grants, error } = await admin
    .from('page_access_grants')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', input.userId)
    .is('revoked_at', null)

  if (error) throw new Error(error.message)
  if (!grants?.length) return []

  const [{ data: stacks }, { data: pages }] = await Promise.all([
    admin
      .from('page_stacks')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .is('archived_at', null)
      .order('position', { ascending: true }),
    admin
      .from('pages')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .is('archived_at', null)
      .order('position', { ascending: true }),
  ])

  const allPages = pages ?? []
  const allowedIds = new Set<string>()
  const allowedStackIds = new Set<string>()

  for (const grant of grants as PageAccessGrant[]) {
    if (grant.scope_type === 'stack') {
      allowedStackIds.add(grant.scope_id)
      for (const page of allPages) {
        if (page.stack_id === grant.scope_id) allowedIds.add(page.id)
      }
      continue
    }

    for (const id of descendantIds(allPages, grant.scope_id)) {
      allowedIds.add(id)
    }
  }

  const scopedPages = allPages.filter((page) => allowedIds.has(page.id))
  const stackById = new Map<string, PageStack>(
    ((stacks ?? []) as PageStack[]).map((stack) => [stack.id, stack]),
  )
  const stackIds = Array.from(
    new Set([
      ...Array.from(allowedStackIds),
      ...scopedPages.map((page) => page.stack_id).filter(Boolean),
    ]),
  ) as string[]

  const entries = stackIds.map((stackId) => ({
    stack: stackById.get(stackId) ?? null,
    pages: buildTree(
      scopedPages.filter((page) => page.stack_id === stackId),
      stackId,
    ),
  }))

  const privatePages = buildTree(
    scopedPages.filter((page) => !page.stack_id),
    null,
  )
  if (privatePages.length > 0) entries.push({ stack: null, pages: privatePages })

  return entries
}
