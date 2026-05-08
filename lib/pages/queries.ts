import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  PageDocument,
  PageStack,
  SitePage,
} from '@/lib/supabase/database.types'

export type PageRow = SitePage

export type PageNode = PageRow & {
  children: PageNode[]
}

export type StackTreeEntry = {
  stack: PageStack | null // null = "Private" (no stack)
  pages: PageNode[]
}

export type RecentPage = Pick<
  PageRow,
  'id' | 'title' | 'icon' | 'workspace_id' | 'stack_id' | 'parent_page_id'
> & {
  last_opened_at: string
}

export type PageBreadcrumb = {
  id: string
  title: string
  icon: string | null
}

type PageBreadcrumbRow = Pick<PageRow, 'id' | 'title' | 'icon' | 'parent_page_id'>

// ---------------------------------------------------------------------------
// Stacks + page tree (sidebar + home)
// ---------------------------------------------------------------------------

export async function getStackTree(workspaceId: string): Promise<StackTreeEntry[]> {
  const supabase = await createClient()

  const [stacksResult, pagesResult] = await Promise.all([
    supabase
      .from('page_stacks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('position', { ascending: true }),
    supabase
      .from('pages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('position', { ascending: true }),
  ])

  if (stacksResult.error) throw new Error(stacksResult.error.message)
  if (pagesResult.error) throw new Error(pagesResult.error.message)

  const stacks = stacksResult.data ?? []
  const pages = pagesResult.data ?? []

  const tree: StackTreeEntry[] = []
  for (const stack of stacks) {
    tree.push({ stack, pages: buildPageTree(pages, stack.id) })
  }
  // "Private" pages: no stack
  const privatePages = buildPageTree(pages, null)
  if (privatePages.length > 0 || stacks.length === 0) {
    tree.push({ stack: null, pages: privatePages })
  }
  return tree
}

function buildPageTree(rows: PageRow[], stackId: string | null): PageNode[] {
  const inStack = rows.filter((p) =>
    stackId ? p.stack_id === stackId : !p.stack_id,
  )
  const byParent = new Map<string | null, PageNode[]>()
  for (const row of inStack) {
    const node: PageNode = { ...row, children: [] }
    const key = row.parent_page_id ?? null
    const list = byParent.get(key) ?? []
    list.push(node)
    byParent.set(key, list)
  }
  // Attach children
  for (const list of byParent.values()) {
    for (const node of list) {
      const kids = byParent.get(node.id) ?? []
      node.children = kids
    }
  }
  return byParent.get(null) ?? []
}

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

export async function getRecentPages(
  workspaceId: string,
  limit = 10,
): Promise<RecentPage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('page_visits')
    .select(
      `last_opened_at,
       pages!inner (id, title, icon, workspace_id, stack_id, parent_page_id, archived_at)`,
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('last_opened_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  return rows
    .filter(
      (r) =>
        r.pages &&
        !(r.pages as unknown as { archived_at?: string | null }).archived_at,
    )
    .map((r) => {
      const p = r.pages as unknown as Pick<
        PageRow,
        'id' | 'title' | 'icon' | 'workspace_id' | 'stack_id' | 'parent_page_id'
      >
      return {
        id: p.id,
        title: p.title,
        icon: p.icon,
        workspace_id: p.workspace_id,
        stack_id: p.stack_id,
        parent_page_id: p.parent_page_id,
        last_opened_at: r.last_opened_at,
      } satisfies RecentPage
    })
}

// ---------------------------------------------------------------------------
// Page editor reads
// ---------------------------------------------------------------------------

export async function getPage(
  workspaceId: string,
  pageId: string,
): Promise<PageRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getPageDocument(
  workspaceId: string,
  pageId: string,
): Promise<PageDocument | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('page_documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('page_id', pageId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getPageBreadcrumb(
  workspaceId: string,
  pageId: string,
): Promise<PageBreadcrumb[]> {
  // Walk parent_page_id chain up to 10 levels.
  const supabase = await createClient()
  const trail: PageBreadcrumb[] = []
  let current: string | null = pageId
  for (let i = 0; i < 10 && current; i++) {
    const { data, error } = (await supabase
      .from('pages')
      .select('id, title, icon, parent_page_id')
      .eq('workspace_id', workspaceId)
      .eq('id', current)
      .maybeSingle()) as {
      data: PageBreadcrumbRow | null
      error: { message: string } | null
    }
    if (error) throw new Error(error.message)
    if (!data) break
    trail.unshift({ id: data.id, title: data.title, icon: data.icon })
    current = data.parent_page_id
  }
  return trail
}

// ---------------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------------

export type TrashedPage = Pick<
  PageRow,
  'id' | 'title' | 'icon' | 'archived_at' | 'stack_id' | 'parent_page_id'
>

export async function getTrashedPages(workspaceId: string): Promise<TrashedPage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('id, title, icon, archived_at, stack_id, parent_page_id')
    .eq('workspace_id', workspaceId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as TrashedPage[]
}
