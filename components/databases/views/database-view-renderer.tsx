'use client'

import type { CollectionFieldWithType, CollectionWorkspaceData } from '@/lib/databases/queries'
import type { CollectionRecordWithValues } from '@/lib/properties/types'
import type { SavedViewWithConfig, ViewConfig } from '@/lib/views/types'

import { DatabaseTableView } from './database-table-view'
import { KanbanView } from './kanban-view'
import { GalleryView } from './gallery-view'
import { ListView } from './list-view'
import { CalendarView } from './calendar-view'
import { TimelineView } from './timeline-view'
import { ChartView } from './chart-view'
import { DashboardView } from './dashboard-view'
import { FormView } from './form-view'
import { MapView } from './map-view'
import { PlaceholderView } from './placeholder-view'

import type { GlobalSaveState } from '../saving-indicator'
import type { RecordMutators } from '../hooks/use-optimistic-records'
import type { ViewConfigMutators } from '../hooks/use-optimistic-view'

export type DatabaseViewRendererProps = {
  workspaceId: string
  collectionId: string
  view: SavedViewWithConfig
  fields: CollectionFieldWithType[]
  records: CollectionRecordWithValues[]
  mutators?: RecordMutators
  viewMutators?: ViewConfigMutators
  titleFieldId: string | null
  canManageSchema: boolean
  readOnly?: boolean
  canConfigureView?: boolean
  pageId?: string
  embedded?: boolean
  onOpenRecord: (recordId: string) => void
  onArchiveField?: (field: CollectionFieldWithType) => void
  onSaveStateChange?: (state: GlobalSaveState) => void
  onViewConfigPatch?: (patch: Partial<ViewConfig>) => void
}

export function DatabaseViewRenderer(props: DatabaseViewRendererProps) {
  const {
    workspaceId,
    collectionId,
    view,
    fields,
    records,
    mutators,
    titleFieldId,
    canManageSchema,
    readOnly = false,
    canConfigureView = canManageSchema,
    pageId,
    embedded = false,
    onOpenRecord,
    onArchiveField,
    onSaveStateChange,
    onViewConfigPatch,
  } = props

  switch (view.view_type) {
    case 'table':
      return (
        <DatabaseTableView
          workspaceId={workspaceId}
          collectionId={collectionId}
          view={view}
          fields={fields}
          records={records}
          mutators={mutators}
          titleFieldId={titleFieldId}
          canManageSchema={canManageSchema}
          readOnly={readOnly}
          canConfigureView={canConfigureView}
          pageId={pageId}
          embedded={embedded}
          onOpenRecord={onOpenRecord}
          onArchiveField={onArchiveField}
          onSaveStateChange={onSaveStateChange}
        />
      )
    case 'kanban':
      return (
        <KanbanView
          workspaceId={workspaceId}
          collectionId={collectionId}
          view={view}
          fields={fields}
          records={records}
          mutators={mutators}
          titleFieldId={titleFieldId}
          readOnly={readOnly}
          canConfigureView={canConfigureView}
          pageId={pageId}
          embedded={embedded}
          onViewConfigPatch={onViewConfigPatch}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'gallery':
      return (
        <GalleryView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
          mutators={mutators}
          titleFieldId={titleFieldId}
          embedded={embedded}
          collectionId={collectionId}
          canConfigureView={canConfigureView}
          onViewConfigPatch={onViewConfigPatch}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'list':
      return (
        <ListView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
          titleFieldId={titleFieldId}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'calendar':
      return (
        <CalendarView
          workspaceId={workspaceId}
          collectionId={collectionId}
          view={view}
          fields={fields}
          records={records}
          mutators={mutators}
          titleFieldId={titleFieldId}
          readOnly={readOnly}
          canConfigureView={canConfigureView}
          pageId={pageId}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'timeline':
      return (
        <TimelineView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
          titleFieldId={titleFieldId}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'chart':
      return (
        <ChartView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
        />
      )
    case 'dashboard':
      return (
        <DashboardView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
          titleFieldId={titleFieldId}
          onOpenRecord={onOpenRecord}
        />
      )
    case 'form':
      return (
        <FormView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          titleFieldId={titleFieldId}
          canManageSchema={canManageSchema}
        />
      )
    case 'map':
      return (
        <MapView
          workspaceId={workspaceId}
          view={view}
          fields={fields}
          records={records}
          onOpenRecord={onOpenRecord}
        />
      )
    default:
      return <PlaceholderView viewType={view.view_type} />
  }
}
