'use client'

import { getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from '@blocknote/react'
import { getMultiColumnSlashMenuItems } from '@blocknote/xl-multi-column'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core/extensions'
import {
  BarChart3Icon,
  CalendarIcon,
  ChartBarIcon,
  ChartLineIcon,
  ChartPieIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileIcon,
  FormInputIcon,
  ImageIcon,
  KanbanIcon,
  LayoutGridIcon,
  LayoutListIcon,
  LinkIcon,
  ListIcon,
  MapPinIcon,
  MusicIcon,
  RectangleHorizontalIcon,
  SparklesIcon,
  TableIcon,
  Users2Icon,
  VideoIcon,
} from 'lucide-react'

type Editor = Parameters<typeof getDefaultReactSlashMenuItems>[0]

type Ctx = {
  workspaceId: string
  pageId: string
  onPickDatabaseSource: (
    viewType: string,
    chartSubtype?: string,
  ) => Promise<{
    sourceType: 'collection' | 'view'
    sourceId: string
    sourceName: string
    collectionId: string
    viewType: string
  } | null>
}

function dbItem(
  editor: Editor,
  ctx: Ctx,
  title: string,
  viewType: string,
  Icon: typeof TableIcon,
  group: string,
  chartSubtype?: string,
  displayMode: 'inline' | 'full_page' = 'inline',
): DefaultReactSuggestionItem {
  return {
    title,
    group,
    icon: <Icon className="size-4" />,
    onItemClick: () => {
      void (async () => {
        const picked = await ctx.onPickDatabaseSource(viewType, chartSubtype)
        if (!picked) return
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'database_view',
          props: {
            sourceType: picked.sourceType,
            sourceId: picked.sourceId,
            sourceName: picked.sourceName,
            collectionId: picked.collectionId,
            viewType: picked.viewType || viewType,
            chartSubtype: chartSubtype ?? '',
            displayMode,
            workspaceId: ctx.workspaceId,
          },
        } as never)
      })()
    },
  }
}

export function getSkailSlashMenuItems(
  editor: Editor,
  ctx: Ctx,
): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(editor).map((item) => ({
    ...item,
    group: item.group ?? 'Basic blocks',
  }))
  const columns = getMultiColumnSlashMenuItems(editor as never).map((item) => ({
    ...item,
    group: item.group ?? 'Basic blocks',
  }))

  const suggested: DefaultReactSuggestionItem[] = [
    dbItem(editor, ctx, 'Table view', 'table', TableIcon, 'Suggested'),
    dbItem(editor, ctx, 'Board view', 'kanban', KanbanIcon, 'Suggested'),
    dbItem(editor, ctx, 'Calendar view', 'calendar', CalendarIcon, 'Suggested'),
    {
      title: 'Link to page',
      group: 'Suggested',
      icon: <LinkIcon className="size-4" />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'page_link',
          props: { pageId: '', workspaceId: ctx.workspaceId },
        } as never)
      },
    },
  ]

  const pages: DefaultReactSuggestionItem[] = [
    {
      title: 'Mention person',
      group: 'Pages',
      icon: <Users2Icon className="size-4" />,
      onItemClick: () => undefined,
    },
  ]

  const media: DefaultReactSuggestionItem[] = [
    {
      title: 'Image',
      group: 'Media',
      icon: <ImageIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'image' } as never),
    },
    {
      title: 'Video',
      group: 'Media',
      icon: <VideoIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'video' } as never),
    },
    {
      title: 'Audio',
      group: 'Media',
      icon: <MusicIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'audio' } as never),
    },
    {
      title: 'File',
      group: 'Media',
      icon: <FileIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'file' } as never),
    },
    {
      title: 'Web bookmark',
      group: 'Media',
      icon: <LinkIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'web_bookmark',
          props: { url: '', title: '' },
        } as never),
    },
  ]

  const databaseGroup: DefaultReactSuggestionItem[] = [
    dbItem(editor, ctx, 'Table', 'table', TableIcon, 'Database'),
    dbItem(editor, ctx, 'Board', 'kanban', KanbanIcon, 'Database'),
    dbItem(editor, ctx, 'Gallery', 'gallery', LayoutGridIcon, 'Database'),
    dbItem(editor, ctx, 'List', 'list', ListIcon, 'Database'),
    dbItem(editor, ctx, 'Dashboard', 'dashboard', LayoutListIcon, 'Database'),
    dbItem(editor, ctx, 'Calendar', 'calendar', CalendarIcon, 'Database'),
    dbItem(editor, ctx, 'Timeline', 'timeline', RectangleHorizontalIcon, 'Database'),
    dbItem(editor, ctx, 'Map', 'map', MapPinIcon, 'Database'),
    dbItem(editor, ctx, 'Database - Inline', 'table', DatabaseIcon, 'Database'),
    dbItem(editor, ctx, 'Database - Full-page', 'table', DatabaseIcon, 'Database', undefined, 'full_page'),
  ]

  const charts: DefaultReactSuggestionItem[] = [
    dbItem(editor, ctx, 'Number chart', 'chart', BarChart3Icon, 'Charts', 'number'),
    dbItem(editor, ctx, 'Vertical bar chart', 'chart', ChartBarIcon, 'Charts', 'bar'),
    dbItem(editor, ctx, 'Horizontal bar chart', 'chart', ChartBarIcon, 'Charts', 'bar'),
    dbItem(editor, ctx, 'Line chart', 'chart', ChartLineIcon, 'Charts', 'line'),
    dbItem(editor, ctx, 'Donut chart', 'chart', ChartPieIcon, 'Charts', 'donut'),
  ]

  const skailGroup: DefaultReactSuggestionItem[] = [
    dbItem(editor, ctx, 'Database form', 'form', FormInputIcon, 'SKAIL'),
    {
      title: 'Page form',
      group: 'SKAIL',
      icon: <ClipboardListIcon className="size-4" />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'page_form',
          props: {
            formId: '',
            pageId: ctx.pageId,
            workspaceId: ctx.workspaceId,
            mode: 'edit',
          },
        } as never)
      },
    },
    {
      title: 'AI generated section',
      group: 'SKAIL',
      icon: <SparklesIcon className="size-4" />,
      onItemClick: () => undefined,
    },
  ]

  return [
    ...suggested,
    ...defaults,
    ...columns,
    ...pages,
    ...media,
    ...databaseGroup,
    ...charts,
    ...skailGroup,
  ]
}

export function filterSkailSlashMenuItems(
  items: DefaultReactSuggestionItem[],
  query: string,
) {
  return filterSuggestionItems(items, query)
}
