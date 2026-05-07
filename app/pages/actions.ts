'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
  defaultWidgetConfig,
  defaultWidgetTitle,
  DUPLICATE_PAGE_MODES,
  serializeWidgetConfig,
  WIDGET_SOURCE_TYPES,
  WIDGET_TYPES,
  type DuplicatePageMode,
  type WidgetSourceType,
  type WidgetType,
} from '@/lib/layout/types'
import type { LayoutWidget } from '@/lib/supabase/database.types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  parseViewConfig,
  serializeViewConfig,
  type ViewConfig,
} from '@/lib/views/types'

export type LayoutActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

type AdminClient = ReturnType<typeof createAdminClient>

const initialActionState: LayoutActionState = {
  status: 'idle',
}

const formString = z.preprocess(
  (value) => (typeof value === 'string' ? value : ''),
  z.string(),
)

const textInput = (max = 120) =>
  formString.pipe(
    z
      .string()
      .trim()
      .min(1, 'Enter a value.')
      .max(max, `Use ${max} characters or fewer.`),
  )

const workspaceScopedSchema = z.object({
  workspaceId: z.string().uuid(),
})

const pageScopedSchema = workspaceScopedSchema.extend({
  pageId: z.string().uuid(),
})

const widgetScopedSchema = workspaceScopedSchema.extend({
  widgetId: z.string().uuid(),
})

const createPageSchema = workspaceScopedSchema.extend({
  title: textInput(80),
})

const renamePageSchema = pageScopedSchema.extend({
  title: textInput(80),
})

const duplicatePageSchema = pageScopedSchema.extend({
  mode: z.enum(DUPLICATE_PAGE_MODES),
})

const addWidgetSchema = pageScopedSchema.extend({
  widgetType: z.enum(WIDGET_TYPES),
  dataSourceType: z.enum(WIDGET_SOURCE_TYPES),
  dataSourceId: formString,
})

const updateWidgetSchema = widgetScopedSchema.extend({
  title: textInput(80),
  dataSourceType: z.enum(WIDGET_SOURCE_TYPES),
  dataSourceId: formString,
  content: formString,
  embedUrl: formString,
})

const reorderWidgetSchema = widgetScopedSchema.extend({
  direction: z.enum(['up', 'down']),
})

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the form and try again.'
}

function success(message: string): LayoutActionState {
  return {
    status: 'success',
    message,
  }
}

function error(message: string): LayoutActionState {
  return {
    status: 'error',
    message,
  }
}

function revalidateWorkspacePages(workspaceId: string) {
  revalidatePath(`/pages?workspace_id=${workspaceId}`)
  revalidatePath('/pages')
  revalidatePath(`/databases?workspace_id=${workspaceId}`)
  revalidatePath(`/views?workspace_id=${workspaceId}`)
}

async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      state: error('Sign in before editing pages.'),
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return {
      ok: false as const,
      state: error(membershipError.message),
    }
  }

  if (!membership) {
    return {
      ok: false as const,
      state: error('You do not have access to this workspace.'),
    }
  }

  try {
    return {
      ok: true as const,
      admin: createAdminClient(),
      roleKey: membership.role_key,
      user,
    }
  } catch (adminError) {
    return {
      ok: false as const,
      state: error(
        adminError instanceof Error
          ? adminError.message
          : 'Supabase admin writes are not configured.',
      ),
    }
  }
}

async function nextPagePosition(admin: AdminClient, workspaceId: string) {
  const { data, error: queryError } = await admin
    .from('pages')
    .select('position')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: false })
    .limit(1)

  if (queryError) {
    throw new Error(queryError.message)
  }

  return (data?.[0]?.position ?? -1) + 1
}

async function nextWidgetPosition(
  admin: AdminClient,
  workspaceId: string,
  pageId: string,
) {
  const { data, error: queryError } = await admin
    .from('widgets')
    .select('position')
    .eq('workspace_id', workspaceId)
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1)

  if (queryError) {
    throw new Error(queryError.message)
  }

  return (data?.[0]?.position ?? -1) + 1
}

async function getPage(
  admin: AdminClient,
  workspaceId: string,
  pageId: string,
) {
  const { data, error: pageError } = await admin
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', pageId)
    .maybeSingle()

  if (pageError) {
    throw new Error(pageError.message)
  }

  return data
}

async function getWidget(
  admin: AdminClient,
  workspaceId: string,
  widgetId: string,
) {
  const { data, error: widgetError } = await admin
    .from('widgets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', widgetId)
    .maybeSingle()

  if (widgetError) {
    throw new Error(widgetError.message)
  }

  return data
}

async function resolveDataSource(
  admin: AdminClient,
  workspaceId: string,
  dataSourceType: WidgetSourceType,
  dataSourceId: string,
) {
  if (dataSourceType === 'none' || !dataSourceId) {
    return {
      type: null,
      id: null,
    }
  }

  if (dataSourceType === 'collection') {
    const { data: collection, error: collectionError } = await admin
      .from('collections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', dataSourceId)
      .maybeSingle()

    if (collectionError) {
      throw new Error(collectionError.message)
    }

    if (!collection) {
      return null
    }
  }

  if (dataSourceType === 'view') {
    const { data: view, error: viewError } = await admin
      .from('views')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', dataSourceId)
      .maybeSingle()

    if (viewError) {
      throw new Error(viewError.message)
    }

    if (!view) {
      return null
    }
  }

  return {
    type: dataSourceType,
    id: dataSourceId,
  }
}

function widgetConfigForForm(widgetType: WidgetType, formData: z.infer<typeof updateWidgetSchema>) {
  const config = defaultWidgetConfig(widgetType)

  if (widgetType === 'text' || widgetType === 'heading') {
    return {
      ...config,
      content: formData.content.trim(),
    }
  }

  if (widgetType === 'embed') {
    return {
      ...config,
      url: formData.embedUrl.trim(),
    }
  }

  return config
}

function remapFieldId(fieldId: string | null, fieldIdMap: Map<string, string>) {
  if (!fieldId) {
    return null
  }

  return fieldIdMap.get(fieldId) ?? null
}

function remapViewConfig(config: ViewConfig, fieldIdMap: Map<string, string>) {
  return {
    visibleFieldIds: config.visibleFieldIds.flatMap((fieldId) => {
      const mappedFieldId = fieldIdMap.get(fieldId)

      return mappedFieldId ? [mappedFieldId] : []
    }),
    filters: config.filters.flatMap((filter) => {
      const fieldId = fieldIdMap.get(filter.fieldId)

      return fieldId
        ? [
            {
              ...filter,
              id: crypto.randomUUID(),
              fieldId,
            },
          ]
        : []
    }),
    sorts: config.sorts.flatMap((sort) => {
      const fieldId = fieldIdMap.get(sort.fieldId)

      return fieldId
        ? [
            {
              ...sort,
              id: crypto.randomUUID(),
              fieldId,
            },
          ]
        : []
    }),
    kanban: {
      groupFieldId: remapFieldId(config.kanban.groupFieldId, fieldIdMap),
    },
    calendar: {
      dateFieldId: remapFieldId(config.calendar.dateFieldId, fieldIdMap),
    },
  } satisfies ViewConfig
}

async function duplicateCollectionForPage(
  admin: AdminClient,
  workspaceId: string,
  sourceCollectionId: string,
  copyRecords: boolean,
  collectionMap: Map<string, { id: string; fieldIdMap: Map<string, string> }>,
) {
  const existing = collectionMap.get(sourceCollectionId)

  if (existing) {
    return existing
  }

  const { data: collection, error: collectionError } = await admin
    .from('collections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', sourceCollectionId)
    .maybeSingle()

  if (collectionError) {
    throw new Error(collectionError.message)
  }

  if (!collection) {
    throw new Error('Collection not found.')
  }

  const { data: createdCollection, error: insertError } = await admin
    .from('collections')
    .insert({
      workspace_id: workspaceId,
      name: `${collection.name} copy`,
      description: collection.description,
      icon: collection.icon,
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(insertError.message)
  }

  const { data: fields, error: fieldsError } = await admin
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', sourceCollectionId)
    .order('position', { ascending: true })

  if (fieldsError) {
    throw new Error(fieldsError.message)
  }

  const fieldIdMap = new Map<string, string>()

  for (const field of fields ?? []) {
    const { data: createdField, error: fieldInsertError } = await admin
      .from('collection_fields')
      .insert({
        workspace_id: workspaceId,
        collection_id: createdCollection.id,
        name: field.name,
        field_type: field.field_type,
        semantic_role: field.semantic_role,
        options_json: field.options_json,
        is_system: field.is_system,
        position: field.position,
      })
      .select('id')
      .single()

    if (fieldInsertError) {
      throw new Error(fieldInsertError.message)
    }

    fieldIdMap.set(field.id, createdField.id)
  }

  if (copyRecords) {
    await duplicateCollectionRecords(
      admin,
      workspaceId,
      sourceCollectionId,
      createdCollection.id,
      fieldIdMap,
    )
  }

  const result = {
    id: createdCollection.id,
    fieldIdMap,
  }

  collectionMap.set(sourceCollectionId, result)
  return result
}

async function duplicateCollectionRecords(
  admin: AdminClient,
  workspaceId: string,
  sourceCollectionId: string,
  targetCollectionId: string,
  fieldIdMap: Map<string, string>,
) {
  const { data: records, error: recordsError } = await admin
    .from('collection_records')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', sourceCollectionId)
    .order('created_at', { ascending: true })

  if (recordsError) {
    throw new Error(recordsError.message)
  }

  const recordsList = records ?? []
  const recordIds = recordsList.map((record) => record.id)
  const valuesResult =
    recordIds.length > 0
      ? await admin
          .from('record_values')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('record_id', recordIds)
      : { data: [], error: null }

  if (valuesResult.error) {
    throw new Error(valuesResult.error.message)
  }

  const valuesByRecord = new Map<string, typeof valuesResult.data>()

  valuesResult.data?.forEach((value) => {
    if (!value.record_id) {
      return
    }

    const currentValues = valuesByRecord.get(value.record_id) ?? []
    valuesByRecord.set(value.record_id, [...currentValues, value])
  })

  for (const record of recordsList) {
    const { data: createdRecord, error: recordInsertError } = await admin
      .from('collection_records')
      .insert({
        workspace_id: workspaceId,
        collection_id: targetCollectionId,
        title: record.title,
        created_by: record.created_by,
      })
      .select('id')
      .single()

    if (recordInsertError) {
      throw new Error(recordInsertError.message)
    }

    const valueRows =
      valuesByRecord.get(record.id)?.flatMap((value) => {
        if (!value.field_id) {
          return []
        }

        const newFieldId = fieldIdMap.get(value.field_id)

        return newFieldId
          ? [
              {
                workspace_id: workspaceId,
                record_id: createdRecord.id,
                field_id: newFieldId,
                value_json: value.value_json,
              },
            ]
          : []
      }) ?? []

    if (valueRows.length > 0) {
      const { error: valuesInsertError } = await admin
        .from('record_values')
        .insert(valueRows)

      if (valuesInsertError) {
        throw new Error(valuesInsertError.message)
      }
    }
  }
}

async function duplicateViewForPage(
  admin: AdminClient,
  workspaceId: string,
  sourceViewId: string,
  copyRecords: boolean,
  collectionMap: Map<string, { id: string; fieldIdMap: Map<string, string> }>,
  viewMap: Map<string, string>,
) {
  const existingViewId = viewMap.get(sourceViewId)

  if (existingViewId) {
    return existingViewId
  }

  const { data: view, error: viewError } = await admin
    .from('views')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', sourceViewId)
    .maybeSingle()

  if (viewError) {
    throw new Error(viewError.message)
  }

  if (!view || !view.collection_id) {
    throw new Error('View not found.')
  }

  const collectionCopy = await duplicateCollectionForPage(
    admin,
    workspaceId,
    view.collection_id,
    copyRecords,
    collectionMap,
  )
  const config = parseViewConfig(view.config_json)
  const remappedConfig = remapViewConfig(config, collectionCopy.fieldIdMap)
  const { data: createdView, error: insertError } = await admin
    .from('views')
    .insert({
      workspace_id: workspaceId,
      collection_id: collectionCopy.id,
      name: `${view.name} copy`,
      view_type: view.view_type,
      config_json: serializeViewConfig(remappedConfig),
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(insertError.message)
  }

  viewMap.set(sourceViewId, createdView.id)
  return createdView.id
}

async function remapWidgetDataSourceForDuplicate(
  admin: AdminClient,
  workspaceId: string,
  widget: LayoutWidget,
  mode: DuplicatePageMode,
  collectionMap: Map<string, { id: string; fieldIdMap: Map<string, string> }>,
  viewMap: Map<string, string>,
) {
  if (mode === 'layout_only' || !widget.data_source_type || !widget.data_source_id) {
    return {
      dataSourceType: widget.data_source_type,
      dataSourceId: widget.data_source_id,
    }
  }

  const copyRecords = mode === 'everything'

  if (widget.data_source_type === 'collection') {
    const collectionCopy = await duplicateCollectionForPage(
      admin,
      workspaceId,
      widget.data_source_id,
      copyRecords,
      collectionMap,
    )

    return {
      dataSourceType: 'collection',
      dataSourceId: collectionCopy.id,
    }
  }

  if (widget.data_source_type === 'view') {
    const viewId = await duplicateViewForPage(
      admin,
      workspaceId,
      widget.data_source_id,
      copyRecords,
      collectionMap,
      viewMap,
    )

    return {
      dataSourceType: 'view',
      dataSourceId: viewId,
    }
  }

  return {
    dataSourceType: null,
    dataSourceId: null,
  }
}

export async function createPage(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = createPageSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    title: formData.get('title'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  try {
    const position = await nextPagePosition(access.admin, parsed.data.workspaceId)
    const { error: insertError } = await access.admin.from('pages').insert({
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      icon: 'file-text',
      visibility_scope: 'workspace',
      position,
    })

    if (insertError) {
      return error(insertError.message)
    }
  } catch (createError) {
    return error(createError instanceof Error ? createError.message : 'Page not created.')
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Page created.')
}

export async function renamePage(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = renamePageSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    pageId: formData.get('pageId'),
    title: formData.get('title'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  const { error: updateError } = await access.admin
    .from('pages')
    .update({
      title: parsed.data.title,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.pageId)
    .eq('is_locked', false)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Page renamed.')
}

export async function duplicatePage(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = duplicatePageSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    pageId: formData.get('pageId'),
    mode: formData.get('mode'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  try {
    const sourcePage = await getPage(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.pageId,
    )

    if (!sourcePage) {
      return error('Page not found.')
    }

    const position = await nextPagePosition(access.admin, parsed.data.workspaceId)
    const { data: createdPage, error: pageInsertError } = await access.admin
      .from('pages')
      .insert({
        workspace_id: parsed.data.workspaceId,
        parent_page_id: sourcePage.parent_page_id,
        title: `${sourcePage.title} copy`,
        icon: sourcePage.icon,
        visibility_scope: sourcePage.visibility_scope,
        position,
      })
      .select('id')
      .single()

    if (pageInsertError) {
      return error(pageInsertError.message)
    }

    const { data: sourceWidgets, error: widgetsError } = await access.admin
      .from('widgets')
      .select('*')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('page_id', sourcePage.id)
      .order('position', { ascending: true })

    if (widgetsError) {
      return error(widgetsError.message)
    }

    const collectionMap = new Map<string, { id: string; fieldIdMap: Map<string, string> }>()
    const viewMap = new Map<string, string>()

    for (const widget of sourceWidgets ?? []) {
      const source = await remapWidgetDataSourceForDuplicate(
        access.admin,
        parsed.data.workspaceId,
        widget,
        parsed.data.mode,
        collectionMap,
        viewMap,
      )
      const { error: widgetInsertError } = await access.admin.from('widgets').insert({
        workspace_id: parsed.data.workspaceId,
        page_id: createdPage.id,
        widget_type: widget.widget_type,
        title: widget.title,
        data_source_type: source.dataSourceType,
        data_source_id: source.dataSourceId,
        config_json: widget.config_json,
        position: widget.position,
      })

      if (widgetInsertError) {
        return error(widgetInsertError.message)
      }
    }
  } catch (duplicateError) {
    return error(
      duplicateError instanceof Error
        ? duplicateError.message
        : 'Page was not duplicated.',
    )
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Page duplicated.')
}

export async function addWidget(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = addWidgetSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    pageId: formData.get('pageId'),
    widgetType: formData.get('widgetType'),
    dataSourceType: formData.get('dataSourceType'),
    dataSourceId: formData.get('dataSourceId'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  try {
    const page = await getPage(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.pageId,
    )

    if (!page) {
      return error('Page not found.')
    }

    const source = await resolveDataSource(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.dataSourceType,
      parsed.data.dataSourceId,
    )

    if (!source) {
      return error('Choose a valid data source.')
    }

    const position = await nextWidgetPosition(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.pageId,
    )
    const { error: insertError } = await access.admin.from('widgets').insert({
      workspace_id: parsed.data.workspaceId,
      page_id: parsed.data.pageId,
      widget_type: parsed.data.widgetType,
      title: defaultWidgetTitle(parsed.data.widgetType),
      data_source_type: source.type,
      data_source_id: source.id,
      config_json: serializeWidgetConfig(defaultWidgetConfig(parsed.data.widgetType)),
      position,
    })

    if (insertError) {
      return error(insertError.message)
    }
  } catch (addError) {
    return error(addError instanceof Error ? addError.message : 'Widget not added.')
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Widget added.')
}

export async function updateWidget(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = updateWidgetSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    widgetId: formData.get('widgetId'),
    title: formData.get('title'),
    dataSourceType: formData.get('dataSourceType'),
    dataSourceId: formData.get('dataSourceId'),
    content: formData.get('content'),
    embedUrl: formData.get('embedUrl'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  try {
    const widget = await getWidget(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.widgetId,
    )

    if (!widget || !WIDGET_TYPES.includes(widget.widget_type as WidgetType)) {
      return error('Widget not found.')
    }

    const source = await resolveDataSource(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.dataSourceType,
      parsed.data.dataSourceId,
    )

    if (!source) {
      return error('Choose a valid data source.')
    }

    const widgetType = widget.widget_type as WidgetType
    const { error: updateError } = await access.admin
      .from('widgets')
      .update({
        title: parsed.data.title,
        data_source_type: source.type,
        data_source_id: source.id,
        config_json: serializeWidgetConfig(
          widgetConfigForForm(widgetType, parsed.data),
        ),
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('id', parsed.data.widgetId)

    if (updateError) {
      return error(updateError.message)
    }
  } catch (updateError) {
    return error(
      updateError instanceof Error ? updateError.message : 'Widget not updated.',
    )
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Widget updated.')
}

export async function reorderWidget(
  _state: LayoutActionState = initialActionState,
  formData: FormData,
): Promise<LayoutActionState> {
  const parsed = reorderWidgetSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    widgetId: formData.get('widgetId'),
    direction: formData.get('direction'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  try {
    const widget = await getWidget(
      access.admin,
      parsed.data.workspaceId,
      parsed.data.widgetId,
    )

    if (!widget?.page_id) {
      return error('Widget not found.')
    }

    const { data: widgets, error: widgetsError } = await access.admin
      .from('widgets')
      .select('id, position')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('page_id', widget.page_id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (widgetsError) {
      return error(widgetsError.message)
    }

    const currentIndex = widgets?.findIndex((item) => item.id === widget.id) ?? -1
    const nextIndex =
      parsed.data.direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const neighbor = widgets?.[nextIndex]

    if (currentIndex < 0 || !neighbor) {
      return success('Widget order unchanged.')
    }

    const currentPosition = widget.position ?? currentIndex
    const neighborPosition = neighbor.position ?? nextIndex
    const [currentUpdate, neighborUpdate] = await Promise.all([
      access.admin
        .from('widgets')
        .update({
          position: neighborPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', parsed.data.workspaceId)
        .eq('id', widget.id),
      access.admin
        .from('widgets')
        .update({
          position: currentPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', parsed.data.workspaceId)
        .eq('id', neighbor.id),
    ])

    if (currentUpdate.error) {
      return error(currentUpdate.error.message)
    }

    if (neighborUpdate.error) {
      return error(neighborUpdate.error.message)
    }
  } catch (reorderError) {
    return error(
      reorderError instanceof Error ? reorderError.message : 'Widget not reordered.',
    )
  }

  revalidateWorkspacePages(parsed.data.workspaceId)
  return success('Widget reordered.')
}
