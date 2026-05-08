import { redirect } from 'next/navigation'

import { getPropertyEngineData } from '@/lib/properties/queries'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import {
  isSavedViewType,
  parseViewConfig,
  type SavedViewWithConfig,
} from '@/lib/views/types'

export type ViewEngineData = NonNullable<
  Awaited<ReturnType<typeof getPropertyEngineData>>
> & {
  views: SavedViewWithConfig[]
}

export async function getWorkspaceIdForViewsPage(workspaceId?: string) {
  if (workspaceId) {
    return workspaceId
  }

  const { workspaces } = await getUserWorkspaces()
  const firstWorkspace = workspaces[0]

  if (!firstWorkspace) {
    redirect('/workspaces/new')
  }

  redirect(`/views?workspace_id=${firstWorkspace.id}`)
}

export async function getViewEngineData(
  workspaceId: string,
): Promise<ViewEngineData | null> {
  const propertyData = await getPropertyEngineData(workspaceId)

  if (!propertyData) {
    return null
  }

  const collectionIds = propertyData.collections.map((collection) => collection.id)
  const supabase = await createClient()

  if (collectionIds.length === 0) {
    return {
      ...propertyData,
      views: [],
    }
  }

  const { data: views, error: viewsError } = await supabase
    .from('views')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('collection_id', collectionIds)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (viewsError) {
    throw new Error(viewsError.message)
  }

  return {
    ...propertyData,
    views:
      views?.flatMap((view) => {
        if (!isSavedViewType(view.view_type)) {
          return []
        }

        return [
          {
            ...view,
            view_type: view.view_type,
            config: parseViewConfig(view.config_json),
          },
        ]
      }) ?? [],
  }
}
