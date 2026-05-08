'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { CollectionField, Json } from '@/lib/supabase/database.types'
import {
  buildFieldOptions,
  isOptionBackedType,
  isPropertyType,
  PROPERTY_TYPES,
  parseFieldOptions,
  type FieldOption,
} from '@/lib/properties/types'
import { canManageCollectionSchema } from '@/lib/properties/queries'
import {
  DEFAULT_VIEW_CONFIG,
  VIEW_TYPES,
  isViewFilterOperator,
  parseViewConfig,
  serializeViewConfig,
  type DashboardBlock,
  type FilterPreset,
  type SavedViewType,
  type ViewConfig,
  type ViewFilter,
  type ViewFilterGroup,
  type ViewFilterOperator,
  type ViewSort,
} from '@/lib/views/types'
import {
  getCurrentUserPageAccess,
  getPageDocumentForAccess,
} from '@/lib/pages/access'
import { pageDocumentReferencesSource } from '@/lib/pages/document-sources'

export type PropertyActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldId?: string
  field?: CollectionField
}

const initialActionState: PropertyActionState = {
  status: 'idle',
}

const propertyTypeSchema = z.enum(PROPERTY_TYPES)

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

const optionalTextInput = (max = 120) =>
  formString.pipe(
    z
      .string()
      .trim()
      .max(max, `Use ${max} characters or fewer.`)
      .transform((value) => (value.length > 0 ? value : null)),
  )

const workspaceScopedSchema = z.object({
  workspaceId: z.string().uuid(),
})

const collectionScopedSchema = workspaceScopedSchema.extend({
  collectionId: z.string().uuid(),
})

const createCollectionSchema = workspaceScopedSchema.extend({
  name: textInput(80),
  description: optionalTextInput(240),
})

const renameCollectionSchema = collectionScopedSchema.extend({
  name: textInput(80),
})

const createFieldSchema = collectionScopedSchema.extend({
  name: textInput(80),
  fieldType: propertyTypeSchema,
  semanticRole: optionalTextInput(80),
  options: formString.pipe(z.string().trim()),
})

const updateFieldSchema = collectionScopedSchema.extend({
  fieldId: z.string().uuid(),
  name: textInput(80),
  fieldType: propertyTypeSchema,
  originalFieldType: propertyTypeSchema,
  confirmTypeChange: z.enum(['true', 'false']).default('false'),
  semanticRole: optionalTextInput(80),
  isRequired: z.enum(['on', 'off']).default('off'),
})

const addFieldOptionSchema = collectionScopedSchema.extend({
  fieldId: z.string().uuid(),
  optionLabel: textInput(80),
})

const recordScopedSchema = collectionScopedSchema.extend({
  recordId: z.string().uuid(),
})

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the form and try again.'
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function optionLabelsFromInput(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((label) => label.trim())
    .filter(Boolean)
}

function success(message: string): PropertyActionState {
  return {
    status: 'success',
    message,
  }
}

function error(message: string): PropertyActionState {
  return {
    status: 'error',
    message,
  }
}

async function requireWorkspaceAccess(
  workspaceId: string,
  options: { schemaWrite?: boolean; pageId?: string } = {},
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      state: error('Sign in before editing workspace data.'),
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
    if (options.pageId && !options.schemaWrite) {
      try {
        const pageAccess = await getCurrentUserPageAccess({
          workspaceId,
          pageId: options.pageId,
          minimum: 'edit',
        })

        if (pageAccess) {
          return {
            ok: true as const,
            admin: createAdminClient(),
            roleKey: null,
            user,
            pageAccess,
          }
        }
      } catch (accessError) {
        return {
          ok: false as const,
          state: error(
            accessError instanceof Error
              ? accessError.message
              : 'Could not verify page access.',
          ),
        }
      }
    }

    return {
      ok: false as const,
      state: error('You do not have access to this workspace.'),
    }
  }

  if (options.schemaWrite && !canManageCollectionSchema(membership.role_key)) {
    return {
      ok: false as const,
      state: error('Only workspace owners and admins can change collections.'),
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

function revalidateWorkspaceDatabases(workspaceId: string) {
  revalidatePath(`/databases?workspace_id=${workspaceId}`)
  revalidatePath('/databases')
  revalidatePath(`/workspaces/${workspaceId}`)
}

function fieldValueFromForm(field: CollectionField, formData: FormData): Json {
  const key = `field:${field.id}`
  const rawValue = formValue(formData, key).trim()

  switch (field.field_type) {
    case 'number':
    case 'currency':
      return {
        value: rawValue.length > 0 ? Number(rawValue) : null,
      }
    case 'checkbox':
      return {
        value: formData.get(key) === 'on',
      }
    case 'multi_select':
      return {
        value: formData.getAll(key).filter((value) => typeof value === 'string'),
      }
    case 'formula_placeholder':
      return {
        value: null,
      }
    default:
      return {
        value: rawValue.length > 0 ? rawValue : null,
      }
  }
}

function mergeOptions(
  currentOptions: FieldOption[],
  optionToAdd: FieldOption,
) {
  const exists = currentOptions.some(
    (option) => option.label.toLowerCase() === optionToAdd.label.toLowerCase(),
  )

  if (exists) {
    return currentOptions
  }

  return [...currentOptions, optionToAdd]
}

export async function createCollection(
  _state: PropertyActionState = initialActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const parsed = createCollectionSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId, {
    schemaWrite: true,
  })

  if (!access.ok) {
    return access.state
  }

  const { data: collection, error: collectionError } = await access.admin
    .from('collections')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      icon: 'database',
      created_by: access.user.id,
    })
    .select('*')
    .single()

  if (collectionError) {
    return error(collectionError.message)
  }

  const { error: fieldError } = await access.admin
    .from('collection_fields')
    .insert([
      {
        workspace_id: parsed.data.workspaceId,
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
        workspace_id: parsed.data.workspaceId,
        collection_id: collection.id,
        name: 'Created at',
        field_type: 'date',
        semantic_role: 'created_at',
        is_locked: true,
        is_system: true,
        position: 1,
      },
    ])

  if (fieldError) {
    await access.admin.from('collections').delete().eq('id', collection.id)
    return error(fieldError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return success('Collection created.')
}

export async function renameCollection(
  _state: PropertyActionState = initialActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const parsed = renameCollectionSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId, {
    schemaWrite: true,
  })

  if (!access.ok) {
    return access.state
  }

  const { error: updateError } = await access.admin
    .from('collections')
    .update({
      name: parsed.data.name,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.collectionId)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return success('Collection renamed.')
}

export async function createField(
  _state: PropertyActionState = initialActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const parsed = createFieldSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    name: formData.get('name'),
    fieldType: formData.get('fieldType'),
    semanticRole: formData.get('semanticRole'),
    options: formData.get('options'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId, {
    schemaWrite: true,
  })

  if (!access.ok) {
    return access.state
  }

  const { count, error: countError } = await access.admin
    .from('collection_fields')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)

  if (countError) {
    return error(countError.message)
  }

  const optionsJson = isOptionBackedType(parsed.data.fieldType)
    ? buildFieldOptions(optionLabelsFromInput(parsed.data.options))
    : {}

  const { data: createdField, error: insertError } = await access.admin
    .from('collection_fields')
    .insert({
      workspace_id: parsed.data.workspaceId,
      collection_id: parsed.data.collectionId,
      name: parsed.data.name,
      field_type: parsed.data.fieldType,
      semantic_role: parsed.data.semanticRole,
      options_json: optionsJson,
      position: count ?? 0,
    })
    .select('*')
    .single()

  if (insertError) {
    return error(insertError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return {
    ...success('Field created.'),
    fieldId: createdField.id,
    field: createdField,
  }
}

export async function updateField(
  _state: PropertyActionState = initialActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const parsed = updateFieldSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    fieldId: formData.get('fieldId'),
    name: formData.get('name'),
    fieldType: formData.get('fieldType'),
    originalFieldType: formData.get('originalFieldType'),
    confirmTypeChange: formData.get('confirmTypeChange') ?? 'false',
    semanticRole: formData.get('semanticRole'),
    isRequired: formData.get('isRequired') ?? 'off',
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  if (
    parsed.data.fieldType !== parsed.data.originalFieldType &&
    parsed.data.confirmTypeChange !== 'true'
  ) {
    return error('Preview and confirm the type change before saving.')
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId, {
    schemaWrite: true,
  })

  if (!access.ok) {
    return access.state
  }

  const { data: currentField, error: fieldError } = await access.admin
    .from('collection_fields')
    .select('is_locked, options_json')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)
    .eq('id', parsed.data.fieldId)
    .maybeSingle()

  if (fieldError) {
    return error(fieldError.message)
  }

  if (!currentField) {
    return error('Field not found.')
  }

  if (currentField.is_locked) {
    return error('Locked system fields cannot be changed.')
  }

  const { error: updateError } = await access.admin
    .from('collection_fields')
    .update({
      name: parsed.data.name,
      field_type: parsed.data.fieldType,
      semantic_role: parsed.data.semanticRole,
      is_required: parsed.data.isRequired === 'on',
      options_json: isOptionBackedType(parsed.data.fieldType)
        ? currentField.options_json ?? { options: [] }
        : {},
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)
    .eq('id', parsed.data.fieldId)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return success('Field saved.')
}

export async function addFieldOption(
  _state: PropertyActionState = initialActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const parsed = addFieldOptionSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    fieldId: formData.get('fieldId'),
    optionLabel: formData.get('optionLabel'),
  })

  if (!parsed.success) {
    return error(firstError(parsed.error))
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId, {
    schemaWrite: true,
  })

  if (!access.ok) {
    return access.state
  }

  const { data: field, error: fieldError } = await access.admin
    .from('collection_fields')
    .select('field_type, options_json, is_locked')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)
    .eq('id', parsed.data.fieldId)
    .maybeSingle()

  if (fieldError) {
    return error(fieldError.message)
  }

  if (!field) {
    return error('Field not found.')
  }

  if (field.is_locked) {
    return error('Locked system fields cannot be changed.')
  }

  if (!isOptionBackedType(field.field_type)) {
    return error('Only select, status, and multi-select fields have options.')
  }

  const options = mergeOptions(parseFieldOptions(field.options_json), {
    id: crypto.randomUUID(),
    label: parsed.data.optionLabel,
  })

  const { error: updateError } = await access.admin
    .from('collection_fields')
    .update({
      options_json: { options },
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)
    .eq('id', parsed.data.fieldId)

  if (updateError) {
    return error(updateError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return success('Option added.')
}

async function getEditableFields(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  collectionId: string,
) {
  const { data: fields, error: fieldsError } = await admin
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', collectionId)
    .eq('is_system', false)
    .order('position', { ascending: true })

  if (fieldsError) {
    throw new Error(fieldsError.message)
  }

  return fields ?? []
}

export async function createRecord(formData: FormData) {
  const parsed = collectionScopedSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
  })

  if (!parsed.success) {
    return
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return
  }

  const fields = await getEditableFields(
    access.admin,
    parsed.data.workspaceId,
    parsed.data.collectionId,
  )
  const title = formValue(formData, 'title').trim() || 'Untitled'

  const { data: record, error: recordError } = await access.admin
    .from('collection_records')
    .insert({
      workspace_id: parsed.data.workspaceId,
      collection_id: parsed.data.collectionId,
      title,
      created_by: access.user.id,
    })
    .select('*')
    .single()

  if (recordError) {
    throw new Error(recordError.message)
  }

  const values = fields
    .filter((field) => isPropertyType(field.field_type))
    .map((field) => ({
      workspace_id: parsed.data.workspaceId,
      record_id: record.id,
      field_id: field.id,
      value_json: fieldValueFromForm(field, formData),
    }))

  if (values.length > 0) {
    const { error: valuesError } = await access.admin
      .from('record_values')
      .insert(values)

    if (valuesError) {
      await access.admin.from('collection_records').delete().eq('id', record.id)
      throw new Error(valuesError.message)
    }
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
}

export async function updateRecord(formData: FormData) {
  const parsed = recordScopedSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    collectionId: formData.get('collectionId'),
    recordId: formData.get('recordId'),
  })

  if (!parsed.success) {
    return
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)

  if (!access.ok) {
    return
  }

  const [fields, recordResult] = await Promise.all([
    getEditableFields(access.admin, parsed.data.workspaceId, parsed.data.collectionId),
    access.admin
      .from('collection_records')
      .select('id')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('collection_id', parsed.data.collectionId)
      .eq('id', parsed.data.recordId)
      .maybeSingle(),
  ])

  if (recordResult.error) {
    throw new Error(recordResult.error.message)
  }

  if (!recordResult.data) {
    return
  }

  const title = formValue(formData, 'title').trim() || 'Untitled'

  const { error: recordError } = await access.admin
    .from('collection_records')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.collectionId)
    .eq('id', parsed.data.recordId)

  if (recordError) {
    throw new Error(recordError.message)
  }

  const values = fields
    .filter((field) => isPropertyType(field.field_type))
    .map((field) => ({
      workspace_id: parsed.data.workspaceId,
      record_id: parsed.data.recordId,
      field_id: field.id,
      value_json: fieldValueFromForm(field, formData),
      updated_at: new Date().toISOString(),
    }))

  if (values.length > 0) {
    const { error: valuesError } = await access.admin
      .from('record_values')
      .upsert(values, {
        onConflict: 'record_id,field_id',
      })

    if (valuesError) {
      throw new Error(valuesError.message)
    }
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
}

// ---------------------------------------------------------------------------
// Phase 1 server actions: cell autosave, archive/restore, view layout
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data?: T; clientRequestId?: string }
  | { ok: false; error: string; clientRequestId?: string }

const clientRequestIdSchema = z.string().min(1).max(64).optional()

const updateRecordFieldSchema = z.object({
  workspaceId: z.string().uuid(),
  recordId: z.string().uuid(),
  fieldId: z.string().uuid(),
  value: z.unknown(),
  clientRequestId: clientRequestIdSchema,
  pageId: z.string().uuid().optional(),
})

const updateRecordTitleSchema = z.object({
  workspaceId: z.string().uuid(),
  recordId: z.string().uuid(),
  title: z.string().max(500),
  clientRequestId: clientRequestIdSchema,
  pageId: z.string().uuid().optional(),
})

const archiveScopedRecordSchema = z.object({
  workspaceId: z.string().uuid(),
  recordId: z.string().uuid(),
})

const archiveScopedFieldSchema = z.object({
  workspaceId: z.string().uuid(),
  fieldId: z.string().uuid(),
})

const archiveScopedCollectionSchema = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
})

const archiveScopedViewSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
})

const reorderFieldSchema = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
  orderedFieldIds: z.array(z.string().uuid()).min(1),
})

const updateViewFieldLayoutSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  visibleFieldIds: z.array(z.string().uuid()),
  fieldOrder: z.array(z.string().uuid()),
  columnWidths: z.record(z.string(), z.number().positive()).optional(),
  density: z.enum(['comfortable', 'compact']).optional(),
  frozenFieldIds: z.array(z.string().uuid()).optional(),
})

const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.object({
    from: z.union([z.string(), z.number()]).nullable().optional(),
    to: z.union([z.string(), z.number()]).nullable().optional(),
  }),
])

const updateViewFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  filters: z.array(
    z.object({
      id: z.string().min(1),
      fieldId: z.string().uuid(),
      operator: z.string().min(1),
      value: filterValueSchema,
    }),
  ),
})

const updateViewSortsSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  sorts: z.array(
    z.object({
      id: z.string().min(1),
      fieldId: z.string().uuid(),
      direction: z.enum(['asc', 'desc']),
    }),
  ),
})

const createRecordInlineSchema = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
  seedTitle: z.string().max(500).optional(),
  clientRequestId: clientRequestIdSchema,
  pageId: z.string().uuid().optional(),
})

const createViewSchema = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(80),
  viewType: z.enum(VIEW_TYPES),
  duplicateFromViewId: z.string().uuid().optional(),
})

const renameViewSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  name: z.string().min(1).max(80),
})

function failResult<T = void>(
  message: string,
  clientRequestId?: string,
): ActionResult<T> {
  return { ok: false, error: message, clientRequestId }
}

function successResult<T>(data?: T, clientRequestId?: string): ActionResult<T> {
  return { ok: true, data, clientRequestId }
}

function revalidateCollectionPaths(workspaceId: string, collectionId?: string) {
  revalidatePath('/databases')
  revalidatePath(`/databases?workspace_id=${workspaceId}`)
  if (collectionId) {
    revalidatePath(`/databases/${collectionId}`)
    revalidatePath(`/databases/${collectionId}?workspace_id=${workspaceId}`)
  }
}

async function loadRecordContext(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  recordId: string,
) {
  const { data, error: err } = await admin
    .from('collection_records')
    .select('id, collection_id, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('id', recordId)
    .maybeSingle()
  if (err) throw new Error(err.message)
  return data
}

async function loadFieldContext(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  fieldId: string,
) {
  const { data, error: err } = await admin
    .from('collection_fields')
    .select(
      'id, collection_id, field_type, options_json, is_locked, is_system, archived_at, semantic_role',
    )
    .eq('workspace_id', workspaceId)
    .eq('id', fieldId)
    .maybeSingle()
  if (err) throw new Error(err.message)
  return data
}

async function ensurePageReferencesCollection(input: {
  admin: ReturnType<typeof createAdminClient>
  workspaceId: string
  pageId?: string
  collectionId: string
  viewId?: string | null
}) {
  if (!input.pageId) return null

  const document = await getPageDocumentForAccess(
    input.admin,
    input.workspaceId,
    input.pageId,
  )

  if (
    pageDocumentReferencesSource(
      document?.content_json ?? null,
      input.collectionId,
      input.viewId,
    )
  ) {
    return null
  }

  return 'This database is not exposed on the shared page.'
}

function coerceFieldValue(
  fieldType: string,
  raw: unknown,
): { ok: true; value: Json } | { ok: false; reason: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: { value: null } }
  }
  switch (fieldType) {
    case 'number':
    case 'currency': {
      if (raw === '') return { ok: true, value: { value: null } }
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(n)) return { ok: false, reason: 'Enter a valid number.' }
      return { ok: true, value: { value: n } }
    }
    case 'checkbox': {
      return { ok: true, value: { value: raw === true || raw === 'true' || raw === 'on' } }
    }
    case 'multi_select': {
      const arr = Array.isArray(raw) ? raw.filter((v) => typeof v === 'string') : []
      return { ok: true, value: { value: arr as Json } }
    }
    case 'date': {
      if (raw === '') return { ok: true, value: { value: null } }
      if (typeof raw !== 'string') return { ok: false, reason: 'Date must be a string.' }
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return { ok: false, reason: 'Enter a valid date.' }
      return { ok: true, value: { value: raw } }
    }
    case 'url':
    case 'email':
    case 'phone':
    case 'text':
    case 'long_text':
    case 'select':
    case 'status': {
      if (raw === '') return { ok: true, value: { value: null } }
      if (typeof raw !== 'string') return { ok: false, reason: 'Enter a string value.' }
      return { ok: true, value: { value: raw } }
    }
    case 'formula':
    case 'formula_placeholder': {
      // Formulas are computed server-side, not directly editable. Reject writes.
      return { ok: false, reason: 'Formula fields are calculated and cannot be edited directly.' }
    }
    case 'location': {
      if (typeof raw !== 'object' || Array.isArray(raw) || raw === null) {
        return { ok: false, reason: 'Location must be {address, lat, lng}.' }
      }
      const obj = raw as Record<string, unknown>
      if (
        typeof obj.address !== 'string' ||
        typeof obj.lat !== 'number' ||
        typeof obj.lng !== 'number'
      ) {
        return { ok: false, reason: 'Location must be {address, lat, lng}.' }
      }
      return {
        ok: true,
        value: { value: { address: obj.address, lat: obj.lat, lng: obj.lng, provider: 'osm' } as Json },
      }
    }
    case 'person':
    case 'relation':
    case 'file': {
      // Phase 3 advanced types — accept the value through but consumers will validate further.
      return { ok: true, value: { value: raw as Json } }
    }
    default: {
      return { ok: true, value: { value: raw as Json } }
    }
  }
}

export async function updateRecordField(input: {
  workspaceId: string
  recordId: string
  fieldId: string
  value: unknown
  clientRequestId?: string
  pageId?: string
}): Promise<ActionResult> {
  const parsed = updateRecordFieldSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const { workspaceId, recordId, fieldId, value, clientRequestId, pageId } = parsed.data

  const access = await requireWorkspaceAccess(workspaceId, { pageId })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const [recordCtx, fieldCtx] = await Promise.all([
    loadRecordContext(access.admin, workspaceId, recordId),
    loadFieldContext(access.admin, workspaceId, fieldId),
  ])

  if (!recordCtx) return failResult('Record not found.', clientRequestId)
  if (recordCtx.archived_at) return failResult('Record is archived.', clientRequestId)
  if (!fieldCtx) return failResult('Field not found.', clientRequestId)
  if (fieldCtx.archived_at) return failResult('Field is archived.', clientRequestId)
  if (fieldCtx.collection_id !== recordCtx.collection_id) {
    return failResult('Field does not belong to this collection.', clientRequestId)
  }

  const pageReferenceError = await ensurePageReferencesCollection({
    admin: access.admin,
    workspaceId,
    pageId,
    collectionId: recordCtx.collection_id!,
  })
  if (pageReferenceError) return failResult(pageReferenceError, clientRequestId)

  const coerced = coerceFieldValue(fieldCtx.field_type, value)
  if (!coerced.ok) return failResult(coerced.reason, clientRequestId)

  const { error: upsertError } = await access.admin
    .from('record_values')
    .upsert(
      {
        workspace_id: workspaceId,
        record_id: recordId,
        field_id: fieldId,
        value_json: coerced.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_id' },
    )

  if (upsertError) return failResult(upsertError.message, clientRequestId)

  await access.admin
    .from('collection_records')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', recordId)

  revalidateCollectionPaths(workspaceId, recordCtx.collection_id ?? undefined)
  return successResult(undefined, clientRequestId)
}

export async function updateRecordTitle(input: {
  workspaceId: string
  recordId: string
  title: string
  clientRequestId?: string
  pageId?: string
}): Promise<ActionResult> {
  const parsed = updateRecordTitleSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const { workspaceId, recordId, title, clientRequestId, pageId } = parsed.data

  const access = await requireWorkspaceAccess(workspaceId, { pageId })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const recordCtx = await loadRecordContext(access.admin, workspaceId, recordId)
  if (!recordCtx) return failResult('Record not found.', clientRequestId)
  if (recordCtx.archived_at) return failResult('Record is archived.', clientRequestId)

  const pageReferenceError = await ensurePageReferencesCollection({
    admin: access.admin,
    workspaceId,
    pageId,
    collectionId: recordCtx.collection_id!,
  })
  if (pageReferenceError) return failResult(pageReferenceError, clientRequestId)

  // Find the title field (semantic_role='title') and write to record_values; also update legacy column.
  const { data: titleField } = await access.admin
    .from('collection_fields')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', recordCtx.collection_id!)
    .eq('semantic_role', 'title')
    .is('archived_at', null)
    .limit(1)
    .maybeSingle()

  const trimmed = title.trim() || 'Untitled'

  const { error: titleError } = await access.admin
    .from('collection_records')
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', recordId)

  if (titleError) return failResult(titleError.message, clientRequestId)

  if (titleField?.id) {
    const { error: valueError } = await access.admin
      .from('record_values')
      .upsert(
        {
          workspace_id: workspaceId,
          record_id: recordId,
          field_id: titleField.id,
          value_json: { value: trimmed },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'record_id,field_id' },
      )
    if (valueError) return failResult(valueError.message, clientRequestId)
  }

  revalidateCollectionPaths(workspaceId, recordCtx.collection_id ?? undefined)
  return successResult(undefined, clientRequestId)
}

export async function createRecordInline(input: {
  workspaceId: string
  collectionId: string
  seedTitle?: string
  clientRequestId?: string
  pageId?: string
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createRecordInlineSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const { workspaceId, collectionId, seedTitle, clientRequestId, pageId } = parsed.data

  const access = await requireWorkspaceAccess(workspaceId, { pageId })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const pageReferenceError = await ensurePageReferencesCollection({
    admin: access.admin,
    workspaceId,
    pageId,
    collectionId,
  })
  if (pageReferenceError) return failResult(pageReferenceError, clientRequestId)

  const trimmed = seedTitle?.trim() || 'Untitled'

  const { data: record, error: recordError } = await access.admin
    .from('collection_records')
    .insert({
      workspace_id: workspaceId,
      collection_id: collectionId,
      title: trimmed,
      created_by: access.user.id,
    })
    .select('id, collection_id')
    .single()

  if (recordError) return failResult(recordError.message, clientRequestId)

  // Seed the title field's record_value as well so reads converge.
  const { data: titleField } = await access.admin
    .from('collection_fields')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('collection_id', collectionId)
    .eq('semantic_role', 'title')
    .is('archived_at', null)
    .limit(1)
    .maybeSingle()

  if (titleField?.id) {
    await access.admin.from('record_values').insert({
      workspace_id: workspaceId,
      record_id: record.id,
      field_id: titleField.id,
      value_json: { value: trimmed },
    })
  }

  revalidateCollectionPaths(workspaceId, collectionId)
  return successResult({ id: record.id }, clientRequestId)
}

export async function archiveRecord(input: { workspaceId: string; recordId: string }): Promise<ActionResult> {
  const parsed = archiveScopedRecordSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: record } = await access.admin
    .from('collection_records')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.recordId)
    .select('collection_id')
    .single()

  revalidateCollectionPaths(parsed.data.workspaceId, record?.collection_id ?? undefined)
  return successResult()
}

export async function restoreRecord(input: { workspaceId: string; recordId: string }): Promise<ActionResult> {
  const parsed = archiveScopedRecordSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: record } = await access.admin
    .from('collection_records')
    .update({ archived_at: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.recordId)
    .select('collection_id')
    .single()

  revalidateCollectionPaths(parsed.data.workspaceId, record?.collection_id ?? undefined)
  return successResult()
}

export async function archiveField(input: { workspaceId: string; fieldId: string }): Promise<ActionResult> {
  const parsed = archiveScopedFieldSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const fieldCtx = await loadFieldContext(access.admin, parsed.data.workspaceId, parsed.data.fieldId)
  if (!fieldCtx) return failResult('Field not found.')
  if (fieldCtx.is_system || fieldCtx.is_locked) {
    return failResult('System and locked fields cannot be archived.')
  }

  const { error: err } = await access.admin
    .from('collection_fields')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.fieldId)

  if (err) return failResult(err.message)

  revalidateCollectionPaths(parsed.data.workspaceId, fieldCtx.collection_id ?? undefined)
  return successResult()
}

export async function restoreField(input: { workspaceId: string; fieldId: string }): Promise<ActionResult> {
  const parsed = archiveScopedFieldSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const fieldCtx = await loadFieldContext(access.admin, parsed.data.workspaceId, parsed.data.fieldId)
  if (!fieldCtx) return failResult('Field not found.')

  const { error: err } = await access.admin
    .from('collection_fields')
    .update({ archived_at: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.fieldId)

  if (err) return failResult(err.message)
  revalidateCollectionPaths(parsed.data.workspaceId, fieldCtx.collection_id ?? undefined)
  return successResult()
}

export async function archiveCollection(input: { workspaceId: string; collectionId: string }): Promise<ActionResult> {
  const parsed = archiveScopedCollectionSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { error: err } = await access.admin
    .from('collections')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.collectionId)

  if (err) return failResult(err.message)
  revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.collectionId)
  return successResult()
}

export async function restoreCollection(input: { workspaceId: string; collectionId: string }): Promise<ActionResult> {
  const parsed = archiveScopedCollectionSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { error: err } = await access.admin
    .from('collections')
    .update({ archived_at: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.collectionId)

  if (err) return failResult(err.message)
  revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.collectionId)
  return successResult()
}

export async function archiveView(input: { workspaceId: string; viewId: string }): Promise<ActionResult> {
  const parsed = archiveScopedViewSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: target } = await access.admin
    .from('views')
    .select('id, collection_id, view_type, archived_at')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .maybeSingle()

  if (!target) return failResult('View not found.')
  if (target.archived_at) return successResult()

  // Cannot archive the last non-archived view in a collection without auto-creating a default.
  const { count } = await access.admin
    .from('views')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', target.collection_id!)
    .is('archived_at', null)

  if ((count ?? 0) <= 1) {
    // Create a default table view first so the collection always has at least one.
    await access.admin.from('views').insert({
      workspace_id: parsed.data.workspaceId,
      collection_id: target.collection_id!,
      name: 'Table',
      view_type: 'table',
      config_json: serializeViewConfig(DEFAULT_VIEW_CONFIG),
    })
  }

  const { error: err } = await access.admin
    .from('views')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)

  if (err) return failResult(err.message)
  revalidateCollectionPaths(parsed.data.workspaceId, target.collection_id ?? undefined)
  return successResult()
}

export async function restoreView(input: { workspaceId: string; viewId: string }): Promise<ActionResult> {
  const parsed = archiveScopedViewSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: target } = await access.admin
    .from('views')
    .update({ archived_at: null })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .select('collection_id')
    .single()

  revalidateCollectionPaths(parsed.data.workspaceId, target?.collection_id ?? undefined)
  return successResult()
}

export async function reorderField(input: {
  workspaceId: string
  collectionId: string
  orderedFieldIds: string[]
}): Promise<ActionResult> {
  const parsed = reorderFieldSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const updates = parsed.data.orderedFieldIds.map((fieldId, index) =>
    access.admin
      .from('collection_fields')
      .update({ position: index })
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('collection_id', parsed.data.collectionId)
      .eq('id', fieldId),
  )

  const results = await Promise.all(updates)
  const firstFailure = results.find((r) => r.error)
  if (firstFailure?.error) return failResult(firstFailure.error.message)

  revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.collectionId)
  return successResult()
}

async function patchViewConfig(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  viewId: string,
  patch: (config: ViewConfig) => ViewConfig,
): Promise<ActionResult> {
  const { data: view, error: loadError } = await admin
    .from('views')
    .select('config_json, collection_id, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)
    .maybeSingle()
  if (loadError) return failResult(loadError.message)
  if (!view) return failResult('View not found.')
  if (view.archived_at) return failResult('View is archived.')

  const next = patch(parseViewConfig(view.config_json))
  const { error: updateError } = await admin
    .from('views')
    .update({ config_json: serializeViewConfig(next), updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)

  if (updateError) return failResult(updateError.message)
  revalidateCollectionPaths(workspaceId, view.collection_id ?? undefined)
  return successResult()
}

export async function updateViewFieldLayout(input: {
  workspaceId: string
  viewId: string
  visibleFieldIds: string[]
  fieldOrder: string[]
  columnWidths?: Record<string, number>
  density?: 'comfortable' | 'compact'
  frozenFieldIds?: string[]
}): Promise<ActionResult> {
  const parsed = updateViewFieldLayoutSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    visibleFieldIds: parsed.data.visibleFieldIds,
    fieldOrder: parsed.data.fieldOrder,
    columnWidths: parsed.data.columnWidths ?? cfg.columnWidths,
    density: parsed.data.density ?? cfg.density,
    frozenFieldIds: parsed.data.frozenFieldIds ?? cfg.frozenFieldIds,
  }))
}

export async function updateViewFilters(input: {
  workspaceId: string
  viewId: string
  filters: ViewFilter[]
}): Promise<ActionResult> {
  const parsed = updateViewFiltersSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    filters: parsed.data.filters as ViewFilter[],
  }))
}

export async function updateViewSorts(input: {
  workspaceId: string
  viewId: string
  sorts: ViewSort[]
}): Promise<ActionResult> {
  const parsed = updateViewSortsSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    sorts: parsed.data.sorts,
  }))
}

export async function createView(input: {
  workspaceId: string
  collectionId: string
  name: string
  viewType: SavedViewType
  duplicateFromViewId?: string
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createViewSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  let configJson: Json = serializeViewConfig(DEFAULT_VIEW_CONFIG)

  if (parsed.data.duplicateFromViewId) {
    const { data: source } = await access.admin
      .from('views')
      .select('config_json')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('id', parsed.data.duplicateFromViewId)
      .maybeSingle()
    if (source?.config_json) {
      configJson = source.config_json as Json
    }
  } else {
    // Seed visible fields with all non-archived fields for the collection.
    const { data: fields } = await access.admin
      .from('collection_fields')
      .select('id')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('collection_id', parsed.data.collectionId)
      .is('archived_at', null)
      .order('position', { ascending: true })

    const fieldIds = (fields ?? []).map((f) => f.id)
    configJson = serializeViewConfig({
      ...DEFAULT_VIEW_CONFIG,
      visibleFieldIds: fieldIds,
      fieldOrder: fieldIds,
    })
  }

  const { data: view, error: insertError } = await access.admin
    .from('views')
    .insert({
      workspace_id: parsed.data.workspaceId,
      collection_id: parsed.data.collectionId,
      name: parsed.data.name,
      view_type: parsed.data.viewType,
      config_json: configJson,
    })
    .select('id')
    .single()

  if (insertError) return failResult(insertError.message)
  revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.collectionId)
  return successResult({ id: view.id })
}

export async function renameView(input: {
  workspaceId: string
  viewId: string
  name: string
}): Promise<ActionResult> {
  const parsed = renameViewSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: target, error: err } = await access.admin
    .from('views')
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.viewId)
    .select('collection_id')
    .single()

  if (err) return failResult(err.message)
  revalidateCollectionPaths(parsed.data.workspaceId, target?.collection_id ?? undefined)
  return successResult()
}

// ---------------------------------------------------------------------------
// Phase 2 server actions: per-view config updates + drag-driven mutations
// ---------------------------------------------------------------------------

const updateKanbanConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  groupFieldId: z.string().uuid().nullable(),
  columnOrder: z.array(z.string()).optional(),
  cardOrder: z.record(z.string(), z.array(z.string().uuid())).optional(),
  collapsedColumns: z.array(z.string()).optional(),
})

const moveKanbanCardSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  recordId: z.string().uuid(),
  toColumnValue: z.string().nullable(),
  toIndex: z.number().int().nonnegative(),
  clientRequestId: clientRequestIdSchema,
  pageId: z.string().uuid().optional(),
})

const updateGalleryConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  coverFieldId: z.string().uuid().nullable(),
  coverFit: z.enum(['cover', 'contain', 'fit']).optional(),
  cardSize: z.enum(['sm', 'md', 'lg']).optional(),
  visibleFieldIds: z.array(z.string().uuid()).optional(),
})

const updateListConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  showFieldIds: z.array(z.string().uuid()),
  iconFieldId: z.string().uuid().nullable().optional(),
  density: z.enum(['comfortable', 'compact']).optional(),
})

const updateCalendarConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  dateFieldId: z.string().uuid().nullable(),
  defaultMode: z.enum(['month', 'week', 'day']).optional(),
})

const rescheduleCalendarRecordSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  recordId: z.string().uuid(),
  newDate: z.string().min(1),
  clientRequestId: clientRequestIdSchema,
  pageId: z.string().uuid().optional(),
})

const updateTimelineConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  startFieldId: z.string().uuid().nullable(),
  endFieldId: z.string().uuid().nullable().optional(),
  mode: z.enum(['days', 'weeks', 'months', 'quarters']).optional(),
  groupFieldId: z.string().uuid().nullable().optional(),
})

const moveTimelineRecordSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  recordId: z.string().uuid(),
  newStart: z.string().min(1),
  newEnd: z.string().min(1).optional(),
  clientRequestId: clientRequestIdSchema,
})

const updateChartConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  chartType: z.enum(['bar', 'line', 'pie', 'donut', 'area']),
  xFieldId: z.string().uuid().nullable(),
  yFieldId: z.string().uuid().nullable().optional(),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']),
})

const dashboardBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['kpi', 'status_count', 'list', 'chart']),
  title: z.string().optional(),
  fieldId: z.string().uuid().nullable().optional(),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional(),
  chart: z
    .object({
      chartType: z.enum(['bar', 'line', 'pie', 'donut', 'area']),
      xFieldId: z.string().uuid().nullable(),
      yFieldId: z.string().uuid().nullable().optional(),
      aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']),
    })
    .optional(),
  filterIds: z.array(z.string().uuid()).optional(),
  layout: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
})

const updateDashboardBlocksSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  blocks: z.array(dashboardBlockSchema),
})

const updateFormConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  includedFieldIds: z.array(z.string().uuid()),
  requiredFieldIds: z.array(z.string().uuid()),
  submitButtonText: z.string().min(1).max(40),
  successMessage: z.string().min(1).max(400),
  sharePublicly: z.boolean(),
  publicSlug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug uses lowercase letters, numbers, and dashes.')
    .optional(),
  redirectUrl: z.string().url().optional(),
})

export async function updateKanbanConfig(input: {
  workspaceId: string
  viewId: string
  groupFieldId: string | null
  columnOrder?: string[]
  cardOrder?: Record<string, string[]>
  collapsedColumns?: string[]
}): Promise<ActionResult> {
  const parsed = updateKanbanConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    kanban: {
      ...cfg.kanban,
      groupFieldId: parsed.data.groupFieldId,
      columnOrder: parsed.data.columnOrder ?? cfg.kanban.columnOrder,
      cardOrder: parsed.data.cardOrder ?? cfg.kanban.cardOrder,
      collapsedColumns: parsed.data.collapsedColumns ?? cfg.kanban.collapsedColumns,
    },
  }))
}

export async function moveKanbanCard(input: {
  workspaceId: string
  viewId: string
  recordId: string
  toColumnValue: string | null
  toIndex: number
  clientRequestId?: string
  pageId?: string
}): Promise<ActionResult> {
  const parsed = moveKanbanCardSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const {
    workspaceId,
    viewId,
    recordId,
    toColumnValue,
    toIndex,
    clientRequestId,
    pageId,
  } = parsed.data

  const access = await requireWorkspaceAccess(workspaceId, { pageId })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const { data: view, error: viewError } = await access.admin
    .from('views')
    .select('config_json, collection_id')
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)
    .maybeSingle()

  if (viewError) return failResult(viewError.message, clientRequestId)
  if (!view) return failResult('View not found.', clientRequestId)

  const pageReferenceError = await ensurePageReferencesCollection({
    admin: access.admin,
    workspaceId,
    pageId,
    collectionId: view.collection_id!,
    viewId,
  })
  if (pageReferenceError) return failResult(pageReferenceError, clientRequestId)

  const cfg = parseViewConfig(view.config_json)
  const groupFieldId = cfg.kanban.groupFieldId
  if (!groupFieldId) return failResult('Kanban view has no group field configured.', clientRequestId)

  const { data: field } = await access.admin
    .from('collection_fields')
    .select('field_type')
    .eq('id', groupFieldId)
    .maybeSingle()

  const fieldType = field?.field_type ?? 'text'
  const valueToWrite =
    toColumnValue === null
      ? null
      : fieldType === 'multi_select' || fieldType === 'person'
        ? [toColumnValue]
        : toColumnValue

  await access.admin
    .from('record_values')
    .upsert(
      {
        workspace_id: workspaceId,
        record_id: recordId,
        field_id: groupFieldId,
        value_json: { value: valueToWrite as Json },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_id' },
    )

  const colKey = toColumnValue ?? '__null__'
  const cardOrder: Record<string, string[]> = { ...(cfg.kanban.cardOrder ?? {}) }
  for (const k of Object.keys(cardOrder)) {
    cardOrder[k] = cardOrder[k]!.filter((id) => id !== recordId)
  }
  const target = cardOrder[colKey] ?? []
  const insertAt = Math.min(Math.max(toIndex, 0), target.length)
  cardOrder[colKey] = [...target.slice(0, insertAt), recordId, ...target.slice(insertAt)]

  await patchViewConfig(access.admin, workspaceId, viewId, (current) => ({
    ...current,
    kanban: { ...current.kanban, cardOrder },
  }))

  revalidateCollectionPaths(workspaceId, view.collection_id ?? undefined)
  return successResult(undefined, clientRequestId)
}

export async function updateGalleryConfig(input: {
  workspaceId: string
  viewId: string
  coverFieldId: string | null
  coverFit?: 'cover' | 'contain' | 'fit'
  cardSize?: 'sm' | 'md' | 'lg'
  visibleFieldIds?: string[]
}): Promise<ActionResult> {
  const parsed = updateGalleryConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    gallery: {
      coverFieldId: parsed.data.coverFieldId,
      coverFit: parsed.data.coverFit ?? cfg.gallery?.coverFit ?? 'cover',
      cardSize: parsed.data.cardSize ?? cfg.gallery?.cardSize ?? 'md',
      visibleFieldIds: parsed.data.visibleFieldIds ?? cfg.gallery?.visibleFieldIds,
    },
  }))
}

export async function updateListConfig(input: {
  workspaceId: string
  viewId: string
  showFieldIds: string[]
  iconFieldId?: string | null
  density?: 'comfortable' | 'compact'
}): Promise<ActionResult> {
  const parsed = updateListConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    list: {
      showFieldIds: parsed.data.showFieldIds,
      iconFieldId: parsed.data.iconFieldId ?? cfg.list?.iconFieldId ?? null,
      density: parsed.data.density ?? cfg.list?.density ?? 'comfortable',
    },
  }))
}

export async function updateCalendarConfig(input: {
  workspaceId: string
  viewId: string
  dateFieldId: string | null
  defaultMode?: 'month' | 'week' | 'day'
}): Promise<ActionResult> {
  const parsed = updateCalendarConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    calendar: {
      dateFieldId: parsed.data.dateFieldId,
      defaultMode: parsed.data.defaultMode ?? cfg.calendar.defaultMode ?? 'month',
    },
  }))
}

export async function rescheduleCalendarRecord(input: {
  workspaceId: string
  viewId: string
  recordId: string
  newDate: string
  clientRequestId?: string
  pageId?: string
}): Promise<ActionResult> {
  const parsed = rescheduleCalendarRecordSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const { workspaceId, viewId, recordId, newDate, clientRequestId, pageId } =
    parsed.data

  const access = await requireWorkspaceAccess(workspaceId, { pageId })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const { data: view } = await access.admin
    .from('views')
    .select('config_json, collection_id')
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)
    .maybeSingle()
  if (!view) return failResult('View not found.', clientRequestId)

  const pageReferenceError = await ensurePageReferencesCollection({
    admin: access.admin,
    workspaceId,
    pageId,
    collectionId: view.collection_id!,
    viewId,
  })
  if (pageReferenceError) return failResult(pageReferenceError, clientRequestId)

  const cfg = parseViewConfig(view.config_json)
  if (!cfg.calendar.dateFieldId) {
    return failResult('Calendar view has no date field configured.', clientRequestId)
  }

  const { error: upsertError } = await access.admin
    .from('record_values')
    .upsert(
      {
        workspace_id: workspaceId,
        record_id: recordId,
        field_id: cfg.calendar.dateFieldId,
        value_json: { value: newDate },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_id' },
    )

  if (upsertError) return failResult(upsertError.message, clientRequestId)
  revalidateCollectionPaths(workspaceId, view.collection_id ?? undefined)
  return successResult(undefined, clientRequestId)
}

export async function updateTimelineConfig(input: {
  workspaceId: string
  viewId: string
  startFieldId: string | null
  endFieldId?: string | null
  mode?: 'days' | 'weeks' | 'months' | 'quarters'
  groupFieldId?: string | null
}): Promise<ActionResult> {
  const parsed = updateTimelineConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    timeline: {
      startFieldId: parsed.data.startFieldId,
      endFieldId: parsed.data.endFieldId ?? cfg.timeline?.endFieldId ?? null,
      mode: parsed.data.mode ?? cfg.timeline?.mode ?? 'weeks',
      groupFieldId: parsed.data.groupFieldId ?? cfg.timeline?.groupFieldId ?? null,
    },
  }))
}

export async function moveTimelineRecord(input: {
  workspaceId: string
  viewId: string
  recordId: string
  newStart: string
  newEnd?: string
  clientRequestId?: string
}): Promise<ActionResult> {
  const parsed = moveTimelineRecordSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error), input.clientRequestId)
  const { workspaceId, viewId, recordId, newStart, newEnd, clientRequestId } = parsed.data

  const access = await requireWorkspaceAccess(workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.', clientRequestId)

  const { data: view } = await access.admin
    .from('views')
    .select('config_json, collection_id')
    .eq('workspace_id', workspaceId)
    .eq('id', viewId)
    .maybeSingle()
  if (!view) return failResult('View not found.', clientRequestId)

  const cfg = parseViewConfig(view.config_json)
  if (!cfg.timeline?.startFieldId) {
    return failResult('Timeline view has no start field configured.', clientRequestId)
  }

  const writes: { field_id: string; value: string }[] = [
    { field_id: cfg.timeline.startFieldId, value: newStart },
  ]
  if (cfg.timeline.endFieldId && newEnd) {
    writes.push({ field_id: cfg.timeline.endFieldId, value: newEnd })
  }

  for (const w of writes) {
    await access.admin
      .from('record_values')
      .upsert(
        {
          workspace_id: workspaceId,
          record_id: recordId,
          field_id: w.field_id,
          value_json: { value: w.value },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'record_id,field_id' },
      )
  }

  revalidateCollectionPaths(workspaceId, view.collection_id ?? undefined)
  return successResult(undefined, clientRequestId)
}

export async function updateChartConfig(input: {
  workspaceId: string
  viewId: string
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area'
  xFieldId: string | null
  yFieldId?: string | null
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max'
}): Promise<ActionResult> {
  const parsed = updateChartConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    chart: {
      chartType: parsed.data.chartType,
      xFieldId: parsed.data.xFieldId,
      yFieldId: parsed.data.yFieldId ?? cfg.chart?.yFieldId ?? null,
      aggregation: parsed.data.aggregation,
    },
  }))
}

export async function updateDashboardBlocks(input: {
  workspaceId: string
  viewId: string
  blocks: z.infer<typeof dashboardBlockSchema>[]
}): Promise<ActionResult> {
  const parsed = updateDashboardBlocksSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    dashboard: { blocks: parsed.data.blocks },
  }))
}

export async function updateFormConfig(input: {
  workspaceId: string
  viewId: string
  title: string
  description?: string
  includedFieldIds: string[]
  requiredFieldIds: string[]
  submitButtonText: string
  successMessage: string
  sharePublicly: boolean
  publicSlug?: string
  redirectUrl?: string
}): Promise<ActionResult> {
  const parsed = updateFormConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    form: {
      title: parsed.data.title,
      description: parsed.data.description ?? cfg.form?.description,
      includedFieldIds: parsed.data.includedFieldIds,
      requiredFieldIds: parsed.data.requiredFieldIds,
      submitButtonText: parsed.data.submitButtonText,
      successMessage: parsed.data.successMessage,
      sharePublicly: parsed.data.sharePublicly,
      publicSlug: parsed.data.publicSlug ?? cfg.form?.publicSlug,
      redirectUrl: parsed.data.redirectUrl ?? cfg.form?.redirectUrl,
    },
  }))
}

// ---------------------------------------------------------------------------
// Phase 3 server actions: relations, files, formulas, location, map
// ---------------------------------------------------------------------------

const createRelationSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceCollectionId: z.string().uuid(),
  sourceFieldName: z.string().min(1).max(80),
  targetCollectionId: z.string().uuid(),
  twoWay: z.boolean().default(true),
  inverseFieldName: z.string().min(1).max(80).optional(),
})

const linkRecordsSchema = z.object({
  workspaceId: z.string().uuid(),
  relationId: z.string().uuid(),
  sourceRecordId: z.string().uuid(),
  targetRecordIds: z.array(z.string().uuid()),
})

const unlinkRecordsSchema = z.object({
  workspaceId: z.string().uuid(),
  relationId: z.string().uuid(),
  sourceRecordId: z.string().uuid(),
  targetRecordIds: z.array(z.string().uuid()),
})

const setFieldFormulaSchema = z.object({
  workspaceId: z.string().uuid(),
  fieldId: z.string().uuid(),
  source: z.string().min(0).max(2000),
})

const uploadFileMetadataSchema = z.object({
  workspaceId: z.string().uuid(),
  recordId: z.string().uuid(),
  fieldId: z.string().uuid(),
  source: z.enum(['upload', 'external_link']),
  storagePath: z.string().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
})

const removeFileSchema = z.object({
  workspaceId: z.string().uuid(),
  fileId: z.string().uuid(),
})

const updateMapConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  locationFieldId: z.string().uuid().nullable(),
  defaultZoom: z.number().int().min(1).max(20).optional(),
  defaultCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
  clusterAtZoom: z.number().int().min(0).max(20).optional(),
})

export async function createRelation(input: {
  workspaceId: string
  sourceCollectionId: string
  sourceFieldName: string
  targetCollectionId: string
  twoWay?: boolean
  inverseFieldName?: string
}): Promise<ActionResult<{ relationId: string; sourceFieldId: string; targetFieldId: string | null }>> {
  const parsed = createRelationSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const isSelfRef = parsed.data.sourceCollectionId === parsed.data.targetCollectionId

  const { count: sourceCount, error: sourceCountError } = await access.admin
    .from('collection_fields')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('collection_id', parsed.data.sourceCollectionId)
  if (sourceCountError) return failResult(sourceCountError.message)

  const { data: sourceField, error: sourceFieldError } = await access.admin
    .from('collection_fields')
    .insert({
      workspace_id: parsed.data.workspaceId,
      collection_id: parsed.data.sourceCollectionId,
      name: parsed.data.sourceFieldName,
      field_type: 'relation',
      settings_json: { targetCollectionId: parsed.data.targetCollectionId },
      position: sourceCount ?? 0,
    })
    .select('id')
    .single()

  if (sourceFieldError) return failResult(sourceFieldError.message)

  let targetFieldId: string | null = null
  if (parsed.data.twoWay) {
    const inverseName = parsed.data.inverseFieldName?.trim() || `Linked from ${parsed.data.sourceFieldName}`

    const { count: targetCount } = await access.admin
      .from('collection_fields')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('collection_id', parsed.data.targetCollectionId)

    const { data: targetField, error: targetFieldError } = await access.admin
      .from('collection_fields')
      .insert({
        workspace_id: parsed.data.workspaceId,
        collection_id: parsed.data.targetCollectionId,
        name: inverseName,
        field_type: 'relation',
        settings_json: { targetCollectionId: parsed.data.sourceCollectionId },
        position: targetCount ?? 0,
      })
      .select('id')
      .single()

    if (targetFieldError) {
      await access.admin.from('collection_fields').delete().eq('id', sourceField.id)
      return failResult(targetFieldError.message)
    }
    targetFieldId = targetField.id
  }

  const { data: relation, error: relationError } = await access.admin
    .from('collection_relations')
    .insert({
      workspace_id: parsed.data.workspaceId,
      source_field_id: sourceField.id,
      target_field_id: targetFieldId,
      is_two_way: parsed.data.twoWay,
      is_self_ref: isSelfRef,
    })
    .select('id')
    .single()

  if (relationError) {
    await access.admin.from('collection_fields').delete().eq('id', sourceField.id)
    if (targetFieldId) {
      await access.admin.from('collection_fields').delete().eq('id', targetFieldId)
    }
    return failResult(relationError.message)
  }

  revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.sourceCollectionId)
  if (parsed.data.targetCollectionId !== parsed.data.sourceCollectionId) {
    revalidateCollectionPaths(parsed.data.workspaceId, parsed.data.targetCollectionId)
  }
  return successResult({
    relationId: relation.id,
    sourceFieldId: sourceField.id,
    targetFieldId,
  })
}

export async function linkRecords(input: {
  workspaceId: string
  relationId: string
  sourceRecordId: string
  targetRecordIds: string[]
}): Promise<ActionResult> {
  const parsed = linkRecordsSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const rows = parsed.data.targetRecordIds.map((target) => ({
    workspace_id: parsed.data.workspaceId,
    relation_id: parsed.data.relationId,
    source_record_id: parsed.data.sourceRecordId,
    target_record_id: target,
  }))

  if (rows.length === 0) return successResult()

  const { error: linkError } = await access.admin
    .from('collection_record_links')
    .upsert(rows, { onConflict: 'relation_id,source_record_id,target_record_id' })

  if (linkError) return failResult(linkError.message)

  revalidateCollectionPaths(parsed.data.workspaceId)
  return successResult()
}

export async function unlinkRecords(input: {
  workspaceId: string
  relationId: string
  sourceRecordId: string
  targetRecordIds: string[]
}): Promise<ActionResult> {
  const parsed = unlinkRecordsSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  if (parsed.data.targetRecordIds.length === 0) return successResult()

  const { error: deleteError } = await access.admin
    .from('collection_record_links')
    .delete()
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('relation_id', parsed.data.relationId)
    .eq('source_record_id', parsed.data.sourceRecordId)
    .in('target_record_id', parsed.data.targetRecordIds)

  if (deleteError) return failResult(deleteError.message)
  revalidateCollectionPaths(parsed.data.workspaceId)
  return successResult()
}

export async function setFieldFormula(input: {
  workspaceId: string
  fieldId: string
  source: string
}): Promise<ActionResult<{ referencedFieldIds: string[] }>> {
  const parsed = setFieldFormulaSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const fieldCtx = await loadFieldContext(access.admin, parsed.data.workspaceId, parsed.data.fieldId)
  if (!fieldCtx) return failResult('Field not found.')

  const { parseFormula } = await import('@/lib/databases/formula/grammar')
  const parsedFormula = parseFormula(parsed.data.source)
  if (!parsedFormula.ok) return failResult(parsedFormula.error)

  const formulaJson: Json = {
    source: parsed.data.source,
    ast: parsedFormula.ast as unknown as Json,
    dependsOn: parsedFormula.referencedFieldIds,
    updatedAt: new Date().toISOString(),
  }

  const { error: updateError } = await access.admin
    .from('collection_fields')
    .update({
      field_type: 'formula',
      formula_json: formulaJson,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.fieldId)

  if (updateError) return failResult(updateError.message)
  revalidateCollectionPaths(parsed.data.workspaceId, fieldCtx.collection_id ?? undefined)
  return successResult({ referencedFieldIds: parsedFormula.referencedFieldIds })
}

export async function uploadFileMetadata(input: {
  workspaceId: string
  recordId: string
  fieldId: string
  source: 'upload' | 'external_link'
  storagePath?: string | null
  externalUrl?: string | null
  filename: string
  mimeType?: string
  sizeBytes?: number
}): Promise<ActionResult<{ id: string }>> {
  const parsed = uploadFileMetadataSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  if (parsed.data.source === 'upload' && !parsed.data.storagePath) {
    return failResult('Upload requires a storagePath.')
  }
  if (parsed.data.source === 'external_link' && !parsed.data.externalUrl) {
    return failResult('External link requires a URL.')
  }

  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data, error: insertError } = await access.admin
    .from('collection_files')
    .insert({
      workspace_id: parsed.data.workspaceId,
      record_id: parsed.data.recordId,
      field_id: parsed.data.fieldId,
      source: parsed.data.source,
      storage_path: parsed.data.storagePath ?? null,
      external_url: parsed.data.externalUrl ?? null,
      filename: parsed.data.filename,
      mime_type: parsed.data.mimeType ?? null,
      size_bytes: parsed.data.sizeBytes ?? null,
      created_by: access.user.id,
    })
    .select('id')
    .single()

  if (insertError) return failResult(insertError.message)

  // Update record_values to include the file id list (denormalized for fast reads).
  const { data: existing } = await access.admin
    .from('record_values')
    .select('value_json')
    .eq('record_id', parsed.data.recordId)
    .eq('field_id', parsed.data.fieldId)
    .maybeSingle()

  const currentList = (() => {
    const v = existing?.value_json
    if (!v || typeof v !== 'object' || Array.isArray(v)) return []
    const inner = (v as Record<string, Json>).value
    return Array.isArray(inner) ? inner.flatMap((x) => (typeof x === 'string' ? [x] : [])) : []
  })()

  const nextList = [...currentList, data.id]

  await access.admin
    .from('record_values')
    .upsert(
      {
        workspace_id: parsed.data.workspaceId,
        record_id: parsed.data.recordId,
        field_id: parsed.data.fieldId,
        value_json: { value: nextList as Json },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_id' },
    )

  revalidateCollectionPaths(parsed.data.workspaceId)
  return successResult({ id: data.id })
}

export async function removeFile(input: {
  workspaceId: string
  fileId: string
}): Promise<ActionResult> {
  const parsed = removeFileSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: file, error: loadError } = await access.admin
    .from('collection_files')
    .select('id, record_id, field_id, source, storage_path')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('id', parsed.data.fileId)
    .maybeSingle()

  if (loadError) return failResult(loadError.message)
  if (!file) return failResult('File not found.')

  if (file.source === 'upload' && file.storage_path) {
    await access.admin.storage.from('collection-files').remove([file.storage_path])
  }

  const { error: deleteError } = await access.admin
    .from('collection_files')
    .delete()
    .eq('id', parsed.data.fileId)
  if (deleteError) return failResult(deleteError.message)

  // Strip the file id from the record_values list.
  const { data: existing } = await access.admin
    .from('record_values')
    .select('value_json')
    .eq('record_id', file.record_id)
    .eq('field_id', file.field_id)
    .maybeSingle()

  const list = (() => {
    const v = existing?.value_json
    if (!v || typeof v !== 'object' || Array.isArray(v)) return []
    const inner = (v as Record<string, Json>).value
    return Array.isArray(inner) ? inner.flatMap((x) => (typeof x === 'string' ? [x] : [])) : []
  })()

  await access.admin
    .from('record_values')
    .upsert(
      {
        workspace_id: parsed.data.workspaceId,
        record_id: file.record_id,
        field_id: file.field_id,
        value_json: { value: list.filter((id) => id !== parsed.data.fileId) as Json },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'record_id,field_id' },
    )

  revalidateCollectionPaths(parsed.data.workspaceId)
  return successResult()
}

export async function updateMapConfig(input: {
  workspaceId: string
  viewId: string
  locationFieldId: string | null
  defaultZoom?: number
  defaultCenter?: { lat: number; lng: number }
  clusterAtZoom?: number
}): Promise<ActionResult> {
  const parsed = updateMapConfigSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    map: {
      locationFieldId: parsed.data.locationFieldId,
      defaultZoom: parsed.data.defaultZoom ?? cfg.map?.defaultZoom ?? 10,
      defaultCenter: parsed.data.defaultCenter ?? cfg.map?.defaultCenter,
      clusterAtZoom: parsed.data.clusterAtZoom ?? cfg.map?.clusterAtZoom ?? 12,
    },
  }))
}

// ---------------------------------------------------------------------------
// Phase 4 server actions: advanced filter trees, presets, dashboard templates
// ---------------------------------------------------------------------------

const filterValueZ: z.ZodType<ViewFilter['value']> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.object({
    from: z.union([z.string(), z.number()]).nullable().optional(),
    to: z.union([z.string(), z.number()]).nullable().optional(),
  }),
])

const filterLeafSchema: z.ZodType<ViewFilter> = z.object({
  id: z.string().min(1),
  fieldId: z.string().uuid(),
  operator: z.custom<ViewFilterOperator>(isViewFilterOperator, {
    message: 'Invalid filter operator.',
  }),
  value: filterValueZ,
})

type FilterTreeInput = ViewFilterGroup

const filterTreeSchema: z.ZodType<FilterTreeInput> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    conjunction: z.enum(['and', 'or']),
    children: z.array(z.union([filterTreeSchema, filterLeafSchema])).max(64),
  }),
)

const updateAdvancedFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  filterTree: filterTreeSchema.nullable(),
  flatFilters: z.array(filterLeafSchema).optional(),
})

const saveFilterPresetSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  name: z.string().min(1).max(80),
  filters: z.array(filterLeafSchema),
  filterTree: filterTreeSchema.optional().nullable(),
  presetId: z.string().min(1).optional(),
})

const applyFilterPresetSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  presetId: z.string().min(1).nullable(),
})

const deleteFilterPresetSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  presetId: z.string().min(1),
})

const saveDashboardTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  blocks: z.array(dashboardBlockSchema),
  templateId: z.string().uuid().optional(),
})

const applyDashboardTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  viewId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  inlineBlocks: z.array(dashboardBlockSchema).optional(),
})

export async function updateAdvancedFilters(input: {
  workspaceId: string
  viewId: string
  filterTree: ViewFilterGroup | null
  flatFilters?: ViewFilter[]
}): Promise<ActionResult> {
  const parsed = updateAdvancedFiltersSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    filterTree: parsed.data.filterTree ?? undefined,
    filters: (parsed.data.flatFilters ?? cfg.filters) as ViewFilter[],
  }))
}

export async function saveFilterPreset(input: {
  workspaceId: string
  viewId: string
  name: string
  filters: ViewFilter[]
  filterTree?: ViewFilterGroup | null
  presetId?: string
}): Promise<ActionResult<{ presetId: string }>> {
  const parsed = saveFilterPresetSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const presetId = parsed.data.presetId ?? crypto.randomUUID()

  const result = await patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => {
    const existing = cfg.filterPresets ?? []
    const otherPresets = existing.filter((p) => p.id !== presetId)
    const next: FilterPreset = {
      id: presetId,
      name: parsed.data.name,
      filters: parsed.data.filters as ViewFilter[],
      filterTree: parsed.data.filterTree ?? undefined,
    }
    return {
      ...cfg,
      filterPresets: [...otherPresets, next],
    }
  })

  if (!result.ok) return failResult(result.error)
  return successResult({ presetId })
}

export async function applyFilterPreset(input: {
  workspaceId: string
  viewId: string
  presetId: string | null
}): Promise<ActionResult> {
  const parsed = applyFilterPresetSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => {
    if (!parsed.data.presetId) {
      return { ...cfg, activePresetId: null }
    }
    const preset = (cfg.filterPresets ?? []).find((p) => p.id === parsed.data.presetId)
    if (!preset) return { ...cfg, activePresetId: null }
    return {
      ...cfg,
      activePresetId: preset.id,
      filters: preset.filters,
      filterTree: preset.filterTree,
    }
  })
}

export async function deleteFilterPreset(input: {
  workspaceId: string
  viewId: string
  presetId: string
}): Promise<ActionResult> {
  const parsed = deleteFilterPresetSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => {
    const remaining = (cfg.filterPresets ?? []).filter((p) => p.id !== parsed.data.presetId)
    return {
      ...cfg,
      filterPresets: remaining,
      activePresetId: cfg.activePresetId === parsed.data.presetId ? null : cfg.activePresetId,
    }
  })
}

export async function saveDashboardTemplate(input: {
  workspaceId: string
  name: string
  description?: string
  blocks: DashboardBlock[]
  templateId?: string
}): Promise<ActionResult<{ templateId: string }>> {
  const parsed = saveDashboardTemplateSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId, { schemaWrite: true })
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const config: Json = {
    description: parsed.data.description ?? null,
    blocks: parsed.data.blocks as unknown as Json,
  }

  if (parsed.data.templateId) {
    const { error: updateError } = await access.admin
      .from('templates')
      .update({
        name: parsed.data.name,
        config_json: config,
      })
      .eq('id', parsed.data.templateId)
      .eq('workspace_id', parsed.data.workspaceId)
    if (updateError) return failResult(updateError.message)
    return successResult({ templateId: parsed.data.templateId })
  }

  const { data: created, error: insertError } = await access.admin
    .from('templates')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      template_type: 'dashboard',
      config_json: config,
    })
    .select('id')
    .single()
  if (insertError) return failResult(insertError.message)

  return successResult({ templateId: created.id })
}

export async function applyDashboardTemplate(input: {
  workspaceId: string
  viewId: string
  templateId?: string
  inlineBlocks?: DashboardBlock[]
}): Promise<ActionResult> {
  const parsed = applyDashboardTemplateSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  let blocks: DashboardBlock[] | null = parsed.data.inlineBlocks ?? null
  if (!blocks && parsed.data.templateId) {
    const { data: template } = await access.admin
      .from('templates')
      .select('config_json')
      .eq('id', parsed.data.templateId)
      .eq('workspace_id', parsed.data.workspaceId)
      .maybeSingle()
    const cfg = template?.config_json
    if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
      const candidate = (cfg as Record<string, unknown>).blocks
      if (Array.isArray(candidate)) {
        const validated = candidate.flatMap((b) => {
          const result = dashboardBlockSchema.safeParse(b)
          return result.success ? [result.data as DashboardBlock] : []
        })
        blocks = validated
      }
    }
  }

  if (!blocks) return failResult('No blocks to apply.')

  // Re-id blocks so the same template can be applied multiple times without collision.
  const reIded: DashboardBlock[] = blocks.map((b) => ({ ...b, id: crypto.randomUUID() }))

  return patchViewConfig(access.admin, parsed.data.workspaceId, parsed.data.viewId, (cfg) => ({
    ...cfg,
    dashboard: { blocks: reIded },
  }))
}

const listDashboardTemplatesSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function listDashboardTemplates(input: {
  workspaceId: string
}): Promise<ActionResult<{ templates: Array<{ id: string; name: string; description: string | null; blocks: DashboardBlock[] }> }>> {
  const parsed = listDashboardTemplatesSchema.safeParse(input)
  if (!parsed.success) return failResult(firstError(parsed.error))
  const access = await requireWorkspaceAccess(parsed.data.workspaceId)
  if (!access.ok) return failResult(access.state.message ?? 'Access denied.')

  const { data: rows, error: err } = await access.admin
    .from('templates')
    .select('id, name, config_json')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('template_type', 'dashboard')
    .order('created_at', { ascending: false })
  if (err) return failResult(err.message)

  const templates = (rows ?? []).flatMap((row) => {
    const cfg = row.config_json
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return []
    const obj = cfg as Record<string, unknown>
    const blocks = Array.isArray(obj.blocks)
      ? obj.blocks.flatMap((b) => {
          const result = dashboardBlockSchema.safeParse(b)
          return result.success ? [result.data as DashboardBlock] : []
        })
      : []
    return [
      {
        id: row.id,
        name: row.name,
        description: typeof obj.description === 'string' ? obj.description : null,
        blocks,
      },
    ]
  })

  return successResult({ templates })
}
