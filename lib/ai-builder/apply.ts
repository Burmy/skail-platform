import 'server-only'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Collection,
  CollectionField,
  Json,
  SavedView,
  SitePage,
} from '@/lib/supabase/database.types'
import {
  buildFieldOptions,
  isOptionBackedType,
  isPropertyType,
  type PropertyType,
} from '@/lib/properties/types'
import {
  defaultWidgetConfig,
  isWidgetType,
  serializeWidgetConfig,
  type WidgetConfig,
  type WidgetType,
} from '@/lib/layout/types'
import {
  DEFAULT_VIEW_CONFIG,
  isSavedViewType,
  serializeViewConfig,
  type SavedViewType,
  type ViewConfig,
} from '@/lib/views/types'
import type { AiBuilderPlan } from '@/lib/ai-builder/contract'
import {
  booleanValue,
  objectValue,
  stringList,
  stringValue,
  toJson,
} from '@/lib/ai-builder/json'

type AdminClient = ReturnType<typeof createAdminClient>

export type AppliedOperation =
  | {
      type:
        | 'create_collection'
        | 'create_field'
        | 'create_page'
        | 'create_view'
        | 'create_widget'
      id: string
      label: string
      collectionId?: string
      pageId?: string
    }
  | {
      type: 'update_page'
      id: string
      label: string
      before: {
        title: string
        icon: string | null
      }
    }
  | {
      type: 'update_field'
      id: string
      collectionId: string
      label: string
      before: {
        name: string
        field_type: string
        semantic_role: string | null
        is_required: boolean | null
        options_json: Json | null
      }
    }

type WorkspaceState = {
  collectionsById: Map<string, Collection>
  collectionsByName: Map<string, Collection>
  fieldsById: Map<string, CollectionField>
  fieldsByCollection: Map<string, CollectionField[]>
  pagesById: Map<string, SitePage>
  pagesByTitle: Map<string, SitePage>
  viewsById: Map<string, SavedView>
  viewsByName: Map<string, SavedView>
  nextFieldPositionByCollection: Map<string, number>
  nextPagePosition: number
  nextWidgetPositionByPage: Map<string, number>
}

function nameKey(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function actionObjects(values: Record<string, unknown>[]) {
  return values.map(objectValue)
}

function jsonObject(value: unknown) {
  return objectValue(value) as WidgetConfig
}

function fieldOptionsFromAction(action: Record<string, unknown>) {
  return buildFieldOptions(
    stringList(action.options ?? action.option_labels ?? action.choices),
  )
}

function resolvePropertyType(value: string) {
  return isPropertyType(value) ? value : 'text'
}

function resolveViewType(value: string) {
  return isSavedViewType(value) ? value : 'table'
}

function revalidateAiBuilderWorkspace(workspaceId: string) {
  revalidatePath(`/ai-builder?workspace_id=${workspaceId}`)
  revalidatePath(`/databases?workspace_id=${workspaceId}`)
  revalidatePath(`/pages?workspace_id=${workspaceId}`)
  revalidatePath(`/views?workspace_id=${workspaceId}`)
  revalidatePath(`/workspaces/${workspaceId}`)
}

async function loadWorkspaceState(
  admin: AdminClient,
  workspaceId: string,
): Promise<WorkspaceState> {
  const [collectionsResult, pagesResult, viewsResult, widgetsResult] =
    await Promise.all([
      admin.from('collections').select('*').eq('workspace_id', workspaceId),
      admin
        .from('pages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true }),
      admin.from('views').select('*').eq('workspace_id', workspaceId),
      admin
        .from('widgets')
        .select('id, page_id, position')
        .eq('workspace_id', workspaceId),
    ])

  if (collectionsResult.error) {
    throw new Error(collectionsResult.error.message)
  }

  if (pagesResult.error) {
    throw new Error(pagesResult.error.message)
  }

  if (viewsResult.error) {
    throw new Error(viewsResult.error.message)
  }

  if (widgetsResult.error) {
    throw new Error(widgetsResult.error.message)
  }

  const collectionIds = collectionsResult.data?.map((collection) => collection.id) ?? []
  const fieldsResult =
    collectionIds.length > 0
      ? await admin
          .from('collection_fields')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('collection_id', collectionIds)
          .order('position', { ascending: true })
      : { data: [], error: null }

  if (fieldsResult.error) {
    throw new Error(fieldsResult.error.message)
  }

  const collectionsById = new Map<string, Collection>()
  const collectionsByName = new Map<string, Collection>()
  const fieldsById = new Map<string, CollectionField>()
  const fieldsByCollection = new Map<string, CollectionField[]>()
  const pagesById = new Map<string, SitePage>()
  const pagesByTitle = new Map<string, SitePage>()
  const viewsById = new Map<string, SavedView>()
  const viewsByName = new Map<string, SavedView>()
  const nextFieldPositionByCollection = new Map<string, number>()
  const nextWidgetPositionByPage = new Map<string, number>()

  collectionsResult.data?.forEach((collection) => {
    collectionsById.set(collection.id, collection)
    collectionsByName.set(nameKey(collection.name), collection)
  })

  fieldsResult.data?.forEach((field) => {
    fieldsById.set(field.id, field)

    if (field.collection_id) {
      const fields = fieldsByCollection.get(field.collection_id) ?? []
      fieldsByCollection.set(field.collection_id, [...fields, field])
    }
  })

  fieldsByCollection.forEach((fields, collectionId) => {
    nextFieldPositionByCollection.set(
      collectionId,
      Math.max(-1, ...fields.map((field) => field.position ?? 0)) + 1,
    )
  })

  pagesResult.data?.forEach((page) => {
    pagesById.set(page.id, page)
    pagesByTitle.set(nameKey(page.title), page)
  })

  viewsResult.data?.forEach((view) => {
    viewsById.set(view.id, view)
    viewsByName.set(nameKey(view.name), view)
  })

  widgetsResult.data?.forEach((widget) => {
    if (!widget.page_id) {
      return
    }

    const currentPosition = nextWidgetPositionByPage.get(widget.page_id) ?? 0
    nextWidgetPositionByPage.set(
      widget.page_id,
      Math.max(currentPosition, (widget.position ?? 0) + 1),
    )
  })

  return {
    collectionsById,
    collectionsByName,
    fieldsById,
    fieldsByCollection,
    pagesById,
    pagesByTitle,
    viewsById,
    viewsByName,
    nextFieldPositionByCollection,
    nextPagePosition:
      Math.max(-1, ...(pagesResult.data?.map((page) => page.position ?? 0) ?? [])) +
      1,
    nextWidgetPositionByPage,
  }
}

function addFieldToState(state: WorkspaceState, field: CollectionField) {
  state.fieldsById.set(field.id, field)

  if (!field.collection_id) {
    return
  }

  const fields = state.fieldsByCollection.get(field.collection_id) ?? []
  state.fieldsByCollection.set(field.collection_id, [...fields, field])
}

function resolveCollection(
  state: WorkspaceState,
  action: Record<string, unknown>,
) {
  const collectionId = stringValue(action, ['collection_id', 'collectionId'])

  if (collectionId) {
    return state.collectionsById.get(collectionId) ?? null
  }

  const collectionName = stringValue(action, [
    'collection_name',
    'collectionName',
    'collection',
    'database',
  ])

  return state.collectionsByName.get(nameKey(collectionName)) ?? null
}

function resolvePage(state: WorkspaceState, action: Record<string, unknown>) {
  const pageId = stringValue(action, ['page_id', 'pageId', 'id'])

  if (pageId) {
    return state.pagesById.get(pageId) ?? null
  }

  const pageTitle = stringValue(action, [
    'page_title',
    'pageTitle',
    'title',
    'name',
  ])

  return state.pagesByTitle.get(nameKey(pageTitle)) ?? null
}

function resolveField(state: WorkspaceState, action: Record<string, unknown>) {
  const fieldId = stringValue(action, ['field_id', 'fieldId', 'id'])

  if (fieldId) {
    return state.fieldsById.get(fieldId) ?? null
  }

  const collection = resolveCollection(state, action)
  const fieldName = stringValue(action, [
    'field_name',
    'fieldName',
    'current_name',
    'name',
  ])

  if (!collection || !fieldName) {
    return null
  }

  return (
    state.fieldsByCollection
      .get(collection.id)
      ?.find((field) => nameKey(field.name) === nameKey(fieldName)) ?? null
  )
}

function resolveView(state: WorkspaceState, action: Record<string, unknown>) {
  const viewId = stringValue(action, ['view_id', 'viewId', 'id'])

  if (viewId) {
    return state.viewsById.get(viewId) ?? null
  }

  const viewName = stringValue(action, ['view_name', 'viewName', 'view', 'name'])

  return state.viewsByName.get(nameKey(viewName)) ?? null
}

async function createFieldFromAction({
  admin,
  workspaceId,
  state,
  collection,
  action,
  operations,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  collection: Collection
  action: Record<string, unknown>
  operations: AppliedOperation[]
}) {
  const name = stringValue(action, ['name', 'field_name', 'fieldName'])

  if (!name) {
    return null
  }

  const fieldType = resolvePropertyType(
    stringValue(action, ['field_type', 'fieldType', 'type'], 'text'),
  )
  const semanticRole =
    stringValue(action, ['semantic_role', 'semanticRole']) || null
  const position = state.nextFieldPositionByCollection.get(collection.id) ?? 0
  state.nextFieldPositionByCollection.set(collection.id, position + 1)

  const { data, error } = await admin
    .from('collection_fields')
    .insert({
      workspace_id: workspaceId,
      collection_id: collection.id,
      name,
      field_type: fieldType,
      semantic_role: semanticRole,
      is_required: booleanValue(action, 'is_required'),
      is_system: false,
      options_json: isOptionBackedType(fieldType)
        ? fieldOptionsFromAction(action)
        : {},
      position,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  addFieldToState(state, data)
  operations.push({
    type: 'create_field',
    id: data.id,
    collectionId: collection.id,
    label: `${collection.name}.${data.name}`,
  })

  return data
}

async function createCollectionFromAction({
  admin,
  workspaceId,
  userId,
  state,
  action,
  operations,
}: {
  admin: AdminClient
  workspaceId: string
  userId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
}) {
  const name = stringValue(action, ['name', 'title'])

  if (!name) {
    return null
  }

  const { data: collection, error } = await admin
    .from('collections')
    .insert({
      workspace_id: workspaceId,
      name,
      description: stringValue(action, ['description']) || null,
      icon: stringValue(action, ['icon'], 'database'),
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  state.collectionsById.set(collection.id, collection)
  state.collectionsByName.set(nameKey(collection.name), collection)
  operations.push({
    type: 'create_collection',
    id: collection.id,
    label: collection.name,
  })

  const systemFields = [
    {
      workspace_id: workspaceId,
      collection_id: collection.id,
      name: 'Record title',
      field_type: 'text',
      semantic_role: 'title',
      is_required: true,
      is_locked: true,
      is_system: true,
      position: 0,
    },
    {
      workspace_id: workspaceId,
      collection_id: collection.id,
      name: 'Created at',
      field_type: 'date',
      semantic_role: 'created_at',
      is_locked: true,
      is_system: true,
      position: 1,
    },
  ]
  const { data: fields, error: fieldError } = await admin
    .from('collection_fields')
    .insert(systemFields)
    .select('*')

  if (fieldError) {
    throw new Error(fieldError.message)
  }

  fields?.forEach((field) => addFieldToState(state, field))
  state.nextFieldPositionByCollection.set(collection.id, 2)

  const inlineFields = Array.isArray(action.fields) ? action.fields : []

  for (const inlineField of inlineFields) {
    await createFieldFromAction({
      admin,
      workspaceId,
      state,
      collection,
      action: objectValue(inlineField),
      operations,
    })
  }

  return collection
}

async function createPageFromAction({
  admin,
  workspaceId,
  state,
  action,
  operations,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
}) {
  const title = stringValue(action, ['title', 'name'])

  if (!title) {
    return null
  }

  const position = state.nextPagePosition
  state.nextPagePosition += 1
  const { data, error } = await admin
    .from('pages')
    .insert({
      workspace_id: workspaceId,
      title,
      icon: stringValue(action, ['icon'], 'file-text'),
      visibility_scope: 'workspace',
      position,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  state.pagesById.set(data.id, data)
  state.pagesByTitle.set(nameKey(data.title), data)
  operations.push({
    type: 'create_page',
    id: data.id,
    label: data.title,
  })

  return data
}

function viewConfigForCollection(
  state: WorkspaceState,
  collectionId: string,
): ViewConfig {
  const fields =
    state.fieldsByCollection
      .get(collectionId)
      ?.filter((field) => !field.is_system) ?? []
  const groupField = fields.find((field) =>
    ['status', 'select', 'person'].includes(field.field_type),
  )
  const dateField = fields.find((field) => field.field_type === 'date')

  return {
    ...DEFAULT_VIEW_CONFIG,
    visibleFieldIds: fields.map((field) => field.id),
    kanban: {
      groupFieldId: groupField?.id ?? null,
    },
    calendar: {
      dateFieldId: dateField?.id ?? null,
    },
  }
}

function requiredViewFieldMissing(
  viewType: SavedViewType,
  config: ViewConfig,
) {
  return (
    (viewType === 'kanban' && !config.kanban.groupFieldId) ||
    (viewType === 'calendar' && !config.calendar.dateFieldId)
  )
}

async function createViewFromAction({
  admin,
  workspaceId,
  state,
  action,
  operations,
  skipped,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
  skipped: string[]
}) {
  const collection = resolveCollection(state, action)
  const name = stringValue(action, ['name', 'title'])
  const viewType = resolveViewType(
    stringValue(action, ['view_type', 'viewType', 'type'], 'table'),
  )

  if (!collection || !name) {
    skipped.push(`Skipped view "${name || 'Untitled'}": collection not found.`)
    return null
  }

  const config = viewConfigForCollection(state, collection.id)

  if (requiredViewFieldMissing(viewType, config)) {
    skipped.push(
      `Skipped ${viewType} view "${name}": required field type is missing.`,
    )
    return null
  }

  const { data, error } = await admin
    .from('views')
    .insert({
      workspace_id: workspaceId,
      collection_id: collection.id,
      name,
      view_type: viewType,
      config_json: serializeViewConfig(config),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  state.viewsById.set(data.id, data)
  state.viewsByName.set(nameKey(data.name), data)
  operations.push({
    type: 'create_view',
    id: data.id,
    label: data.name,
  })

  return data
}

function resolveWidgetSource(
  state: WorkspaceState,
  action: Record<string, unknown>,
) {
  const sourceType = stringValue(action, [
    'data_source_type',
    'dataSourceType',
    'source_type',
    'sourceType',
  ])

  if (sourceType === 'collection') {
    const collection = resolveCollection(state, action)

    return collection
      ? {
          type: 'collection' as const,
          id: collection.id,
        }
      : null
  }

  if (sourceType === 'view') {
    const view = resolveView(state, action)

    return view
      ? {
          type: 'view' as const,
          id: view.id,
        }
      : null
  }

  return {
    type: null,
    id: null,
  }
}

async function createWidgetFromAction({
  admin,
  workspaceId,
  state,
  action,
  operations,
  skipped,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
  skipped: string[]
}) {
  const page = resolvePage(state, action)
  const widgetTypeValue = stringValue(action, ['widget_type', 'widgetType', 'type'])
  const widgetType: WidgetType = isWidgetType(widgetTypeValue)
    ? widgetTypeValue
    : 'text'

  if (!page) {
    skipped.push(
      `Skipped ${widgetType} widget "${stringValue(action, ['title', 'name'], 'Untitled')}": page not found.`,
    )
    return null
  }

  const source = resolveWidgetSource(state, action)

  if (!source) {
    skipped.push(
      `Skipped ${widgetType} widget "${stringValue(action, ['title', 'name'], 'Untitled')}": data source not found.`,
    )
    return null
  }

  const position = state.nextWidgetPositionByPage.get(page.id) ?? 0
  state.nextWidgetPositionByPage.set(page.id, position + 1)
  const config = {
    ...defaultWidgetConfig(widgetType),
    ...jsonObject(action.config),
  }
  const { data, error } = await admin
    .from('widgets')
    .insert({
      workspace_id: workspaceId,
      page_id: page.id,
      widget_type: widgetType,
      title: stringValue(action, ['title', 'name']) || null,
      data_source_type: source.type,
      data_source_id: source.id,
      config_json: serializeWidgetConfig(config),
      position,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  operations.push({
    type: 'create_widget',
    id: data.id,
    pageId: page.id,
    label: stringValue(action, ['title', 'name'], widgetType),
  })

  return data
}

async function updatePageFromAction({
  admin,
  workspaceId,
  state,
  action,
  operations,
  skipped,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
  skipped: string[]
}) {
  const page = resolvePage(state, action)
  const title = stringValue(action, ['new_title', 'title', 'name'])
  const icon = stringValue(action, ['icon'])

  if (!page || (!title && !icon)) {
    skipped.push('Skipped page update: page not found or no changes supplied.')
    return
  }

  const { error } = await admin
    .from('pages')
    .update({
      title: title || page.title,
      icon: icon || page.icon,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', page.id)
    .eq('is_locked', false)

  if (error) {
    throw new Error(error.message)
  }

  operations.push({
    type: 'update_page',
    id: page.id,
    label: page.title,
    before: {
      title: page.title,
      icon: page.icon,
    },
  })
}

async function updateFieldFromAction({
  admin,
  workspaceId,
  state,
  action,
  operations,
  skipped,
}: {
  admin: AdminClient
  workspaceId: string
  state: WorkspaceState
  action: Record<string, unknown>
  operations: AppliedOperation[]
  skipped: string[]
}) {
  const field = resolveField(state, action)

  if (!field || !field.collection_id) {
    skipped.push('Skipped field update: field not found.')
    return
  }

  if (field.is_locked) {
    skipped.push(`Skipped field update "${field.name}": system field is locked.`)
    return
  }

  const name = stringValue(action, ['new_name', 'name', 'field_name'], field.name)
  const fieldType = resolvePropertyType(
    stringValue(action, ['field_type', 'fieldType', 'type'], field.field_type),
  ) as PropertyType
  const semanticRole =
    stringValue(action, ['semantic_role', 'semanticRole']) ||
    field.semantic_role ||
    null
  const optionsJson = isOptionBackedType(fieldType)
    ? fieldOptionsFromAction(action)
    : {}

  const { error } = await admin
    .from('collection_fields')
    .update({
      name,
      field_type: fieldType,
      semantic_role: semanticRole,
      options_json: optionsJson,
      is_required:
        typeof action.is_required === 'boolean'
          ? booleanValue(action, 'is_required')
          : field.is_required,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('collection_id', field.collection_id)
    .eq('id', field.id)

  if (error) {
    throw new Error(error.message)
  }

  operations.push({
    type: 'update_field',
    id: field.id,
    collectionId: field.collection_id,
    label: field.name,
    before: {
      name: field.name,
      field_type: field.field_type,
      semantic_role: field.semantic_role,
      is_required: field.is_required,
      options_json: field.options_json,
    },
  })
}

export async function applyAiBuilderPlan({
  admin,
  workspaceId,
  userId,
  plan,
}: {
  admin: AdminClient
  workspaceId: string
  userId: string
  plan: AiBuilderPlan
}) {
  const state = await loadWorkspaceState(admin, workspaceId)
  const operations: AppliedOperation[] = []
  const skipped: string[] = []

  for (const action of actionObjects(plan.changes.collections_to_create)) {
    await createCollectionFromAction({
      admin,
      workspaceId,
      userId,
      state,
      action,
      operations,
    })
  }

  for (const action of actionObjects(plan.changes.fields_to_create)) {
    const collection = resolveCollection(state, action)

    if (!collection) {
      skipped.push(
        `Skipped field "${stringValue(action, ['name'], 'Untitled')}": collection not found.`,
      )
      continue
    }

    await createFieldFromAction({
      admin,
      workspaceId,
      state,
      collection,
      action,
      operations,
    })
  }

  for (const action of actionObjects(plan.changes.pages_to_create)) {
    await createPageFromAction({
      admin,
      workspaceId,
      state,
      action,
      operations,
    })
  }

  for (const action of actionObjects(plan.changes.views_to_create)) {
    await createViewFromAction({
      admin,
      workspaceId,
      state,
      action,
      operations,
      skipped,
    })
  }

  for (const action of actionObjects(plan.changes.widgets_to_create)) {
    await createWidgetFromAction({
      admin,
      workspaceId,
      state,
      action,
      operations,
      skipped,
    })
  }

  for (const action of actionObjects(plan.changes.pages_to_update)) {
    await updatePageFromAction({
      admin,
      workspaceId,
      state,
      action,
      operations,
      skipped,
    })
  }

  for (const action of actionObjects(plan.changes.fields_to_update)) {
    await updateFieldFromAction({
      admin,
      workspaceId,
      state,
      action,
      operations,
      skipped,
    })
  }

  if (plan.changes.layout_changes.length > 0) {
    skipped.push('Layout change reordering is preview-only in this module.')
  }

  await applyPhase4Operations({ admin, workspaceId, plan, operations, skipped })

  revalidateAiBuilderWorkspace(workspaceId)

  return {
    operations,
    skipped,
  }
}

async function applyPhase4Operations({
  admin,
  workspaceId,
  plan,
  operations,
  skipped,
}: {
  admin: AdminClient
  workspaceId: string
  plan: AiBuilderPlan
  operations: AppliedOperation[]
  skipped: string[]
}) {
  for (const action of actionObjects(plan.changes.archives)) {
    const kind = stringValue(action, ['kind', 'type'], '')
    const id = stringValue(action, ['id', 'target_id'], '')
    const table = archiveTableForKind(kind)
    if (!table || !id) {
      skipped.push('Skipped archive: missing kind or id')
      continue
    }
    const { error } = await admin
      .from(table)
      .update({ archived_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', id)
    if (error) skipped.push(`Archive failed: ${error.message}`)
    else operations.push({ type: 'ai_archive', kind, id } as unknown as AppliedOperation)
  }

  for (const action of actionObjects(plan.changes.restores)) {
    const kind = stringValue(action, ['kind', 'type'], '')
    const id = stringValue(action, ['id', 'target_id'], '')
    const table = archiveTableForKind(kind)
    if (!table || !id) {
      skipped.push('Skipped restore: missing kind or id')
      continue
    }
    const { error } = await admin
      .from(table)
      .update({ archived_at: null })
      .eq('workspace_id', workspaceId)
      .eq('id', id)
    if (error) skipped.push(`Restore failed: ${error.message}`)
    else operations.push({ type: 'ai_restore', kind, id } as unknown as AppliedOperation)
  }

  if (plan.changes.relations_to_create.length > 0) {
    skipped.push(
      `${plan.changes.relations_to_create.length} relation(s) require manual setup via the relation wizard.`,
    )
  }

  for (const action of actionObjects(plan.changes.record_links)) {
    const relationId = stringValue(action, ['relation_id', 'relationId'], '')
    const sourceRecordId = stringValue(action, ['source_record_id', 'sourceRecordId'], '')
    const targetRecordId = stringValue(action, ['target_record_id', 'targetRecordId'], '')
    if (!relationId || !sourceRecordId || !targetRecordId) {
      skipped.push('Skipped link: missing relation_id, source_record_id, or target_record_id')
      continue
    }
    const { error } = await admin
      .from('collection_record_links')
      .upsert(
        {
          workspace_id: workspaceId,
          relation_id: relationId,
          source_record_id: sourceRecordId,
          target_record_id: targetRecordId,
        },
        { onConflict: 'relation_id,source_record_id,target_record_id' },
      )
    if (error) skipped.push(`Link failed: ${error.message}`)
  }

  for (const action of actionObjects(plan.changes.formulas_to_set)) {
    const fieldId = stringValue(action, ['field_id', 'fieldId'], '')
    const source = stringValue(action, ['source', 'formula', 'expression'], '')
    if (!fieldId) {
      skipped.push('Skipped formula: missing field_id')
      continue
    }
    const { parseFormula } = await import('@/lib/databases/formula/grammar')
    const parsed = parseFormula(source)
    if (!parsed.ok) {
      skipped.push(`Formula parse failed: ${parsed.error}`)
      continue
    }
    const formulaJson: Json = {
      source,
      ast: parsed.ast as unknown as Json,
      dependsOn: parsed.referencedFieldIds,
      updatedAt: new Date().toISOString(),
    }
    const { error } = await admin
      .from('collection_fields')
      .update({ field_type: 'formula', formula_json: formulaJson })
      .eq('workspace_id', workspaceId)
      .eq('id', fieldId)
    if (error) skipped.push(`Formula save failed: ${error.message}`)
  }

  for (const action of actionObjects(plan.changes.files_to_attach)) {
    const recordId = stringValue(action, ['record_id', 'recordId'], '')
    const fieldId = stringValue(action, ['field_id', 'fieldId'], '')
    const externalUrl = stringValue(action, ['external_url', 'externalUrl'], '')
    const filename =
      stringValue(action, ['filename', 'name'], '') || externalUrl.split('/').pop() || 'link'
    if (!recordId || !fieldId || !externalUrl) {
      skipped.push('Skipped file attach: missing record_id, field_id, or external_url')
      continue
    }
    const { error } = await admin.from('collection_files').insert({
      workspace_id: workspaceId,
      record_id: recordId,
      field_id: fieldId,
      source: 'external_link',
      external_url: externalUrl,
      filename,
    })
    if (error) skipped.push(`File attach failed: ${error.message}`)
  }

  for (const action of actionObjects(plan.changes.locations_to_set)) {
    const recordId = stringValue(action, ['record_id', 'recordId'], '')
    const fieldId = stringValue(action, ['field_id', 'fieldId'], '')
    const address = stringValue(action, ['address'], '')
    const lat = Number(stringValue(action, ['lat', 'latitude'], ''))
    const lng = Number(stringValue(action, ['lng', 'longitude'], ''))
    if (!recordId || !fieldId || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      skipped.push('Skipped location: missing record_id, field_id, address, lat, or lng')
      continue
    }
    const { error } = await admin
      .from('record_values')
      .upsert(
        {
          workspace_id: workspaceId,
          record_id: recordId,
          field_id: fieldId,
          value_json: { value: { address, lat, lng, provider: 'osm' } as Json },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'record_id,field_id' },
      )
    if (error) skipped.push(`Location save failed: ${error.message}`)
  }

  if (plan.changes.view_layout_changes.length > 0) {
    skipped.push(
      `${plan.changes.view_layout_changes.length} view layout change(s) are preview-only.`,
    )
  }
  if (plan.changes.dashboard_blocks_to_add.length > 0) {
    skipped.push(
      `${plan.changes.dashboard_blocks_to_add.length} dashboard block(s) need user confirmation in the dashboard editor.`,
    )
  }
}

function archiveTableForKind(kind: string) {
  switch (kind) {
    case 'record':
      return 'collection_records' as const
    case 'field':
      return 'collection_fields' as const
    case 'collection':
      return 'collections' as const
    case 'view':
      return 'views' as const
    default:
      return null
  }
}

function parseOperations(value: Json | null): AppliedOperation[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    return [item as AppliedOperation]
  })
}

export async function undoAiBuilderOperations({
  admin,
  workspaceId,
  operationsJson,
}: {
  admin: AdminClient
  workspaceId: string
  operationsJson: Json | null
}) {
  const operations = parseOperations(operationsJson)
  const undone: string[] = []

  for (const operation of [...operations].reverse()) {
    switch (operation.type) {
      case 'create_widget':
        await admin
          .from('widgets')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'create_view':
        await admin
          .from('views')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'create_field':
        await admin
          .from('collection_fields')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'create_page':
        await admin
          .from('pages')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'create_collection':
        await admin
          .from('collections')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'update_page':
        await admin
          .from('pages')
          .update({
            title: operation.before.title,
            icon: operation.before.icon,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
      case 'update_field':
        await admin
          .from('collection_fields')
          .update({
            name: operation.before.name,
            field_type: operation.before.field_type,
            semantic_role: operation.before.semantic_role,
            is_required: operation.before.is_required,
            options_json: operation.before.options_json,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('collection_id', operation.collectionId)
          .eq('id', operation.id)
        undone.push(operation.label)
        break
    }
  }

  revalidateAiBuilderWorkspace(workspaceId)

  return undone
}

export function operationsToJson(operations: AppliedOperation[]) {
  return toJson(operations)
}
