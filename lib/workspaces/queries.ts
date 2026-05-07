import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Workspace } from '@/lib/supabase/database.types'

export type WorkspaceListItem = Workspace & {
  role_key: string
}

export type WorkspaceOverview = {
  collections: number
  pages: number
  views: number
  agents: number
  members: number
  recentCollections: Array<{
    id: string
    name: string
    description: string | null
    icon: string | null
    created_at: string | null
  }>
}

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return { supabase, user }
}

export async function getUserWorkspaces() {
  const { supabase, user } = await requireUser()
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role_key, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const workspaceIds =
    memberships?.flatMap((membership) =>
      membership.workspace_id ? [membership.workspace_id] : [],
    ) ?? []

  if (workspaceIds.length === 0) {
    return { user, workspaces: [] as WorkspaceListItem[] }
  }

  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds)

  if (workspaceError) {
    throw new Error(workspaceError.message)
  }

  const workspaceById = new Map(
    workspaces?.map((workspace) => [workspace.id, workspace]) ?? [],
  )

  return {
    user,
    workspaces:
      memberships
        ?.flatMap((membership) => {
          if (!membership.workspace_id) {
            return []
          }

          const workspace = workspaceById.get(membership.workspace_id)

          if (!workspace) {
            return []
          }

          return [
            {
              ...workspace,
              role_key: membership.role_key,
            },
          ]
        }) ?? [],
  }
}

export async function getWorkspaceForUser(workspaceId: string) {
  const { supabase, user } = await requireUser()

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role_key, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  if (!membership) {
    return { supabase, user, workspace: null, roleKey: null }
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError) {
    throw new Error(workspaceError.message)
  }

  return {
    supabase,
    user,
    workspace,
    roleKey: membership.role_key,
  }
}

export async function getWorkspaceOverview(workspaceId: string) {
  const { supabase } = await requireUser()

  const [
    collectionsResult,
    pagesResult,
    viewsResult,
    agentsResult,
    membersResult,
    recentCollectionsResult,
  ] = await Promise.all([
    supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('views')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('agent_instances')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase
      .from('collections')
      .select('id, name, description, icon, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    collections: collectionsResult.count ?? 0,
    pages: pagesResult.count ?? 0,
    views: viewsResult.count ?? 0,
    agents: agentsResult.count ?? 0,
    members: membersResult.count ?? 0,
    recentCollections: recentCollectionsResult.data ?? [],
  } satisfies WorkspaceOverview
}
