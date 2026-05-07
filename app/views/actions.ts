'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { CollectionField } from '@/lib/supabase/database.types'
import {
  DEFAULT_VIEW_CONFIG,
  serializeViewConfig,
  VIEW_TYPES,
  type SavedViewType,
  type ViewConfig,
  type ViewFilter,
  type ViewFilterOperator,
  type ViewSort,
  type ViewSortDirection,
} from '@/lib/views/types'

export type ViewActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

const initialActionState: ViewActionState = {
  status: 'idle',
}

const viewTypeSchema = z.enum(VIEW_TYPES)

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

const collectionScopedSchema = workspaceScopedSchema.extend({
  collectionId: z.string().uuid(),
})

const viewScopedSchema = workspaceScopedSchema.extend({
  viewId: z.string().uuid(),
})

const createViewSchema = collectionScopedSchema.extend({
  name: textInput(80),
  viewType: viewTypeSchema,
})

const renameViewSchema = viewScopedSchema.extend({
  name: textInput(80),
})

const duplicateViewSchema = viewScopedSchema

const updateViewSchema = viewScopedSchema.extend({
  collectionId: z.string().uuid(),
  viewType: viewTypeSchema,
})

const filterOperators = [
  'contains',
  'equals',
  'not_equals',
  'is_empty',
  'is_not_empty',
] as const

const sortDirections = ['asc', 'desc'] as const

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the form and try again.'
}

function success(message: string): ViewActionState {
  return {
    status: 'success',
    message,
  }
}

function error(message: string): ViewActionState {
  return {
    status: 'error',
    message,
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .flatMap((value) => (typeof value === 'string' ? [value] : []))
}

async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      state: error('Sign in before editing views.'),
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

function revalidateWorkspaceViews(workspaceId: string) {
  revalidatePath(`/views?workspace_id=${workspaceId}`)
  revalidatePath('/views')
}

function isGroupableKanbanField(field: CollectionField) {
  return ['status', 'select', 'person'].includes(field.field_type)
}

function isCalendarDateField(field: CollectionField) {
  return field.field_type === 'date'
}

function editableFields(fields: CollectionField[]) {
  return fields.filter((field) => !field.is_system)
}

function defaultConfigForFields(fields: CollectionField[]): ViewConfig {
  const visibleFields = editableFields(fields)
  const kanbanGroupField = visibleFields.find(isGroupableKanbanField)
  const calendarDateField = visibleFields.find(isCalendarDateField)

  return {
    ...DEFAULT_VIEW_CONFIG,
    visibleFieldIds: visibleFields.map((field) => field.id),
    kanban: {
      groupFieldId: kanbanGroupField?.id ?? null,
    },
    calendar: {
      dateFieldId: calendarDateField?.id ?? null,
    },
  }
}

async function getCollectionFields(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  collectionId: string,
) {
  const { data: collection, error: collectionError } = await admin
    .from('collections')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('id', collectionId)
    .maybeSingle()

  if (collectionError) {
    throw new Error(collectionError.message)
  }

  if (!collection) {
    return null
  }

  const { data: fields, error: fieldsError } = await admin
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })

  if (fieldsError) {
    throw new Error(fieldsError.message)
  }

  return fields ?? []
}

function fieldMap(fields: CollectionField[]) {
  return new Map(fields.map((field) => [field.id, field]))
}

function parseFilters(formData: FormData, fields: CollectionField[]) {
  const validFieldIds = fieldMap(fields)
  const fieldIds = getStringArray(formData, 'filterFieldId')
  const operators = getStringArray(formData, 'filterOperator')
  const values = getStringArray(formData, 'filterValue')

  return fieldIds.flatMap((fieldId, index) => {
    if (!fieldId || !validFieldIds.has(fieldId)) {
      return []
    }

    const operator = operators[index]

    if (!filterOperators.includes(operator as ViewFilterOperator)) {
      return []
    }

    const value = values[index]?.trim() ?? ''

    if (
      !value &&
      operator !== 'is_empty' &&
      operator !== 'is_not_empty'
    ) {
      return []
    }

    return [
      {
        id: crypto.randomUUID(),
        fieldId,
        operator: operator as ViewFilterOperator,
        value,
      } satisfies ViewFilter,
    ]
  })
}

function parseSorts(formData: FormData, fields: CollectionField[]) {
  const validFieldIds = fieldMap(fields)
  const fieldIds = getStringArray(formData, 'sortFieldId')
  const directions = getStringArray(formData, 'sortDirection')

  return fieldIds.flatMap((fieldId, index) => {
    if (!fieldId || !validFieldIds.has(fieldId)) {
      return []
    }

    const direction = directions[index]

    if (!sortDirections.includes(direction as ViewSortDirection)) {
      return []
    }

    return [
      {
        id: crypto.randomUUID(),
        fieldId,
        direction: direction as ViewSortDirection,
      } satisfies ViewSort,
    ]
  })
}

function nextViewConfig(
  formData: FormData,
  fields: CollectionField[],
  viewType: SavedViewType,
) {
  const visibleFields = editableFields(fields)
  const fieldById = fieldMap(visibleFields)
  const visibleFieldIds = getStringArray(formData, 'visibleFieldId').filter(
    (fieldId) => fieldById.has(fieldId),
  )
  const kanbanGroupFieldId = getString(formData, 'kanbanGroupFieldId') || null
  const calendarDateFieldId = getString(formData, 'calendarDateFieldId') || null
  const kanbanFields = visibleFields.filter(isGroupableKanbanField)
  const dateFields = visibleFields.filter(isCalendarDateField)

  if (viewType === 'kanban') {
    if (kanbanFields.length === 0) {
      return {
        ok: false as const,
        state: error('Kanban views require a status, select, or person field.'),
      }
    }

    if (!kanbanGroupFieldId || !kanbanFields.some((field) => field.id === kanbanGroupFieldId)) {
      return {
        ok: false as const,
        state: error('Choose a valid kanban group field.'),
      }
    }
  }

  if (viewType === 'calendar') {
    if (dateFields.length === 0) {
      return {
        ok: false as const,
        state: error('Calendar views require a date field.'),
      }
    }

    if (!calendarDateFieldId || !dateFields.some((field) => field.id === calendarDateFieldId)) {
      return {
        ok: false as const,
        state: error('Choose a valid calendar date field.'),
      }
    }
  }

  return {
    ok: true as const,
    config: {
      visibleFieldIds:
        visibleFieldIds.length > 0
          ? visibleFieldIds
          : visibleFields.map((field) => field.id),
      filters: parseFilters(formData, visibleFields),
      sorts: parseSorts(formData, visibleFields),
      kanban: {
        groupFieldId:
          kanbanGroupFieldId && kanbanFields.some((field) => field.id === kanbanGroupFieldId)
            ? kanbanGroupFieldId
            : kanbanFields[0]?.id ?? null,
      },
      calendar: {
        dateFieldId:
          calendarDateFieldId && dateFields.some((field) => field.id === calendarDateFieldId)
            ? calendarDateFieldId
            : dateFields[0]?.id ?? null,
      },
    } satisfies ViewConfig,
  }
}

export async function createView(
  _state: ViewActionState = initialActionState,
  formData: FormData,
): Promise<ViewActionState> {
  const parsed = createViewSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    name: formData.get('name'),
    viewType: formData.get('viewType'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  const fields = await getCollectionFields(
    access.admin,
    parsed.data.workspaceId,
    parsed.data.collectionId,
  )

  if (!fields) {
    return error('Collection not found.')
  }

  const config = defaultConfigForFields(fields)

  if (
    parsed.data.viewType === 'kanban' &&
    editableFields(fields).filter(isGroupableKanbanField).length === 0
  ) {
    return error('Kanban views require a status, select, or person field.')
  }

  if (
    parsed.data.viewType === 'calendar' &&
    editableFields(fields).filter(isCalendarDateField).length === 0
  ) {
    return error('Calendar views require a date field.')
  }

  const { error: insertError } = await access.admin.from('views').insert({
    workspace_id: parsed.data.workspaceId,
    collection_id: parsed.data.collectionId,
    name: parsed.data.name,
    view_type: parsed.data.viewType,
    config_json: serializeViewConfig(config),
  })

  if (insertError) {
    return error(insertError.message)
  }

  revalidateWorkspaceViews(parsed.data.workspaceId)
  return success('View created.')
}

export async function renameView(
  _state: ViewActionState = initialActionState,
  formData: FormData,
): Promise<ViewActionState> {
  const parsed = renameViewSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    viewId: formData.get('viewId'),
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  const { error: updateError } = await access.admin
    .from('views')
    .update({
      name: parsed.data.name,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .eq('is_locked', false)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspaceViews(parsed.data.workspaceId)
  return success('View renamed.')
}

export async function duplicateView(
  _state: ViewActionState = initialActionState,
  formData: FormData,
): Promise<ViewActionState> {
  const parsed = duplicateViewSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    viewId: formData.get('viewId'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  const { data: view, error: viewError } = await access.admin
    .from('views')
    .select('*')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .maybeSingle()

  if (viewError) {
    return error(viewError.message)
  }

  if (!view) {
    return error('View not found.')
  }

  const { error: insertError } = await access.admin.from('views').insert({
    workspace_id: view.workspace_id,
    collection_id: view.collection_id,
    name: `${view.name} copy`,
    view_type: view.view_type,
    config_json: view.config_json ?? serializeViewConfig(DEFAULT_VIEW_CONFIG),
  })

  if (insertError) {
    return error(insertError.message)
  }

  revalidateWorkspaceViews(parsed.data.workspaceId)
  return success('View duplicated.')
}

export async function updateViewSettings(
  _state: ViewActionState = initialActionState,
  formData: FormData,
): Promise<ViewActionState> {
  const parsed = updateViewSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    viewId: formData.get('viewId'),
    collectionId: formData.get('collectionId'),
    viewType: formData.get('viewType'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return access.state
  }

  const { data: view, error: viewError } = await access.admin
    .from('views')
    .select('id, collection_id, is_locked')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .maybeSingle()

  if (viewError) {
    return error(viewError.message)
  }

  if (!view) {
    return error('View not found.')
  }

  if (view.is_locked) {
    return error('Locked views cannot be changed.')
  }

  if (view.collection_id !== parsed.data.collectionId) {
    return error('View and collection do not match.')
  }

  const fields = await getCollectionFields(
    access.admin,
    parsed.data.workspaceId,
    parsed.data.collectionId,
  )

  if (!fields) {
    return error('Collection not found.')
  }

  const configResult = nextViewConfig(formData, fields, parsed.data.viewType)

  if (!configResult.ok) {
    return configResult.state
  }

  const { error: updateError } = await access.admin
    .from('views')
    .update({
      view_type: parsed.data.viewType,
      config_json: serializeViewConfig(configResult.config),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspaceViews(parsed.data.workspaceId)
  return success('View settings saved.')
}
