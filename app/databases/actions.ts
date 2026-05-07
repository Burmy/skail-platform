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

export type PropertyActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
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
  options: { schemaWrite?: boolean } = {},
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

  const { error: insertError } = await access.admin
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

  if (insertError) {
    return error(insertError.message)
  }

  revalidateWorkspaceDatabases(parsed.data.workspaceId)
  return success('Field created.')
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
