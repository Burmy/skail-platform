import { redirect } from 'next/navigation'

import { getViewEngineData } from '@/lib/views/queries'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import {
  isWidgetType,
  parseWidgetConfig,
  type LayoutWidgetWithConfig,
  type PageWithWidgets,
} from '@/lib/layout/types'
import { parsePageStyle, parseWidgetStyle } from '@/lib/theme/types'

export type LayoutBuilderData = NonNullable<
  Awaited<ReturnType<typeof getViewEngineData>>
> & {
  pages: PageWithWidgets[]
}

export async function getWorkspaceIdForPagesPage(workspaceId?: string) {
  if (workspaceId) {
    return workspaceId
  }

  const { workspaces } = await getUserWorkspaces()
  const firstWorkspace = workspaces[0]

  if (!firstWorkspace) {
    redirect('/workspaces/new')
  }

  redirect(`/pages?workspace_id=${firstWorkspace.id}`)
}

export async function getLayoutBuilderData(
  workspaceId: string,
): Promise<LayoutBuilderData | null> {
  const viewData = await getViewEngineData(workspaceId)

  if (!viewData) {
    return null
  }

  const supabase = await createClient()
  const { data: pages, error: pagesError } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (pagesError) {
    throw new Error(pagesError.message)
  }

  const pageIds = pages?.map((page) => page.id) ?? []

  if (pageIds.length === 0) {
    return {
      ...viewData,
      pages: [],
    }
  }

  const [{ data: widgets, error: widgetsError }, pageStylesResult] =
    await Promise.all([
      supabase
        .from('widgets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('page_id', pageIds)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('page_style_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('page_id', pageIds),
    ])

  if (widgetsError) {
    throw new Error(widgetsError.message)
  }

  if (pageStylesResult.error) {
    throw new Error(pageStylesResult.error.message)
  }

  const widgetIds = widgets?.map((widget) => widget.id) ?? []
  const widgetStylesResult =
    widgetIds.length > 0
      ? await supabase
          .from('widget_style_settings')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('widget_id', widgetIds)
      : { data: [], error: null }

  if (widgetStylesResult.error) {
    throw new Error(widgetStylesResult.error.message)
  }

  const widgetsByPage = new Map<string, LayoutWidgetWithConfig[]>()
  const pageStyleByPage = new Map(
    pageStylesResult.data?.map((style) => {
      const parsedStyle = parsePageStyle(style)

      return [parsedStyle.page_id, parsedStyle]
    }) ?? [],
  )
  const widgetStyleByWidget = new Map(
    widgetStylesResult.data?.map((style) => {
      const parsedStyle = parseWidgetStyle(style)

      return [parsedStyle.widget_id, parsedStyle.style]
    }) ?? [],
  )

  widgets?.forEach((widget) => {
    if (!widget.page_id || !isWidgetType(widget.widget_type)) {
      return
    }

    const dataSourceType =
      widget.data_source_type === 'collection' || widget.data_source_type === 'view'
        ? widget.data_source_type
        : null
    const currentWidgets = widgetsByPage.get(widget.page_id) ?? []

    widgetsByPage.set(widget.page_id, [
      ...currentWidgets,
      {
        ...widget,
        widget_type: widget.widget_type,
        data_source_type: dataSourceType,
        config: parseWidgetConfig(widget.config_json),
        style: widgetStyleByWidget.get(widget.id) ?? null,
      },
    ])
  })

  return {
    ...viewData,
    pages:
      pages?.map((page) => ({
        ...page,
        style: pageStyleByPage.get(page.id) ?? null,
        widgets: widgetsByPage.get(page.id) ?? [],
      })) ?? [],
  }
}
