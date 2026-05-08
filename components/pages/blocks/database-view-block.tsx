'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DatabaseIcon, ExternalLinkIcon } from 'lucide-react'
import { createReactBlockSpec } from '@blocknote/react'
import { defaultProps } from '@blocknote/core'

import {
  SourcePickerDialog,
  type SourceSelection,
} from '@/components/pages/source-picker-dialog'
import { usePageRuntime } from '@/components/pages/page-runtime-context'
import { EmbeddedDatabase } from './embedded-database'

type ViewTypeProp =
  | 'table'
  | 'kanban'
  | 'gallery'
  | 'list'
  | 'calendar'
  | 'timeline'
  | 'chart'
  | 'dashboard'
  | 'map'
  | 'form'

type BlockProps = {
  sourceType: 'collection' | 'view'
  sourceId: string
  sourceName: string
  viewType: ViewTypeProp
  chartSubtype: string
  collectionId: string
  displayMode: 'inline' | 'full_page'
  workspaceId: string
  viewOverridesJson: string
}

type BlockHandle = {
  props: Record<string, unknown>
}

type BlockEditor = {
  updateBlock: (
    block: unknown,
    update: { props: Record<string, unknown> },
  ) => void
}

export const DatabaseViewBlock = createReactBlockSpec(
  {
    type: 'database_view',
    propSchema: {
      ...defaultProps,
      sourceType: { default: 'collection' as 'collection' | 'view' },
      sourceId: { default: '' },
      sourceName: { default: '' },
      viewType: { default: 'table' as ViewTypeProp },
      chartSubtype: { default: '' as '' | 'bar' | 'line' | 'pie' | 'donut' | 'area' },
      collectionId: { default: '' },
      displayMode: { default: 'inline' as 'inline' | 'full_page' },
      workspaceId: { default: '' },
      viewOverridesJson: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <DatabaseViewBlockRenderer block={block} editor={editor} />
    ),
  },
)

function DatabaseViewBlockRenderer({
  block,
  editor,
}: {
  block: unknown
  editor: unknown
}) {
  const blockRef = block as BlockHandle
  const editorApi = editor as BlockEditor
  const props = blockRef.props as BlockProps
  const runtime = usePageRuntime()
  const canManageBlock = runtime.canManageStructure
  const canOpenDatabaseApp = runtime.mode === 'workspace'
  const [pickerOpen, setPickerOpen] = useState(
    !props.sourceId && canManageBlock,
  )

  function applySelection(selection: SourceSelection) {
    if (selection.kind === 'collection') {
      editorApi.updateBlock(block, {
        props: {
          ...blockRef.props,
          sourceType: 'collection',
          sourceId: selection.id,
          sourceName: selection.name,
          collectionId: selection.id,
          viewType: props.viewType,
          viewOverridesJson: '',
        },
      })
      return
    }

    editorApi.updateBlock(block, {
      props: {
        ...blockRef.props,
        sourceType: 'view',
        sourceId: selection.id,
        sourceName: selection.name,
        viewType: (selection.viewType as ViewTypeProp) ?? 'table',
        collectionId: selection.collectionId,
        viewOverridesJson: '',
      },
    })
  }

  function applyViewOverrides(nextJson: string) {
    editorApi.updateBlock(block, {
      props: {
        ...blockRef.props,
        viewOverridesJson: nextJson,
      },
    })
  }

  const dbHref = props.collectionId && canOpenDatabaseApp
    ? `/databases/${props.collectionId}?workspace_id=${props.workspaceId}${
        props.sourceType === 'view' ? `&view=${props.sourceId}` : ''
      }`
    : null

  return (
    <div
      className="my-2 w-full"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-1 flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <DatabaseIcon className="size-3.5" />
        <span className="truncate font-medium text-foreground">
          {props.sourceName || 'Untitled database'}
        </span>
        {dbHref ? (
          <Link
            href={dbHref}
            className="ml-auto inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3" />
            Open in Databases
          </Link>
        ) : null}
      </div>

      <DatabaseViewBlockBody
        workspaceId={props.workspaceId}
        collectionId={props.collectionId}
        viewId={props.sourceType === 'view' ? props.sourceId : null}
        displayMode={props.displayMode}
        dbHref={dbHref}
        canOpenDatabaseApp={canOpenDatabaseApp}
        sourceName={props.sourceName}
        viewType={props.viewType}
        viewOverridesJson={props.viewOverridesJson}
        canManageSource={canManageBlock}
        onSourceChange={applySelection}
        onViewOverridesChange={applyViewOverrides}
      />

      {canManageBlock ? (
        <SourcePickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={applySelection}
          workspaceId={props.workspaceId}
          initialTab="view"
          requestedViewType={props.viewType}
        />
      ) : null}
    </div>
  )
}

function DatabaseViewBlockBody({
  workspaceId,
  collectionId,
  viewId,
  displayMode,
  dbHref,
  canOpenDatabaseApp,
  sourceName,
  viewType,
  viewOverridesJson,
  canManageSource,
  onSourceChange,
  onViewOverridesChange,
}: {
  workspaceId: string
  collectionId: string
  viewId: string | null
  displayMode: 'inline' | 'full_page'
  dbHref: string | null
  canOpenDatabaseApp: boolean
  sourceName: string
  viewType: ViewTypeProp
  viewOverridesJson: string
  canManageSource: boolean
  onSourceChange: (selection: SourceSelection) => void
  onViewOverridesChange: (nextJson: string) => void
}) {
  if (!collectionId) {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
        Pick a database source from the menu above.
      </p>
    )
  }

  if (displayMode === 'full_page' && canOpenDatabaseApp) {
    return (
      <Link
        href={dbHref ?? '#'}
        className="flex items-center justify-between rounded-md border bg-background p-3 text-sm hover:bg-accent/30"
      >
        <span className="flex items-center gap-2">
          <DatabaseIcon className="size-4 text-muted-foreground" />
          Open this database
        </span>
        <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
      </Link>
    )
  }

  return (
    <EmbeddedDatabase
      workspaceId={workspaceId}
      collectionId={collectionId}
      viewId={viewId}
      sourceName={sourceName}
      viewType={viewType}
      databaseHref={dbHref}
      canOpenDatabaseApp={canOpenDatabaseApp}
      canManageSource={canManageSource}
      viewOverridesJson={viewOverridesJson}
      onSourceChange={onSourceChange}
      onViewOverridesChange={onViewOverridesChange}
    />
  )
}
