import 'server-only'

import { createHash } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseViewConfig } from '@/lib/views/types'
import type { Json } from '@/lib/supabase/database.types'
import type { CollectionFieldWithType } from '@/lib/databases/queries'
import { isPropertyType, normalizePropertyType } from '@/lib/properties/types'

export type PublicFormResolution = {
  workspaceId: string
  collectionId: string
  viewId: string
  config: ReturnType<typeof parseViewConfig>['form']
  fields: CollectionFieldWithType[]
  workspaceName: string
}

export async function resolvePublicForm(slug: string): Promise<PublicFormResolution | null> {
  const supabase = await createClient()

  const { data: view } = await supabase
    .from('views')
    .select('id, workspace_id, collection_id, view_type, config_json, archived_at')
    .eq('view_type', 'form')
    .is('archived_at', null)
    .filter('config_json->form->>publicSlug', 'eq', slug)
    .filter('config_json->form->>sharePublicly', 'eq', 'true')
    .maybeSingle()

  if (!view || !view.workspace_id || !view.collection_id) return null

  const cfg = parseViewConfig(view.config_json)
  if (!cfg.form?.sharePublicly) return null

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', view.workspace_id)
    .maybeSingle()

  const { data: rawFields } = await supabase
    .from('collection_fields')
    .select('*')
    .eq('workspace_id', view.workspace_id)
    .eq('collection_id', view.collection_id)
    .is('archived_at', null)
    .order('position', { ascending: true })

  const fields = (rawFields ?? []).map((f) => ({
    ...f,
    field_type: isPropertyType(f.field_type) ? normalizePropertyType(f.field_type) : 'text',
  })) as CollectionFieldWithType[]

  return {
    workspaceId: view.workspace_id,
    collectionId: view.collection_id,
    viewId: view.id,
    config: cfg.form,
    fields,
    workspaceName: workspace?.name ?? 'Workspace',
  }
}

export function ipHashFor(viewId: string, ip: string) {
  // Per-view salt avoids cross-view correlation, with workspace id ambient through viewId.
  const salt = `${viewId}::skail-form`
  return createHash('sha256').update(`${ip}::${salt}`).digest('hex')
}

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_PER_WINDOW = 10

export async function isRateLimited(viewId: string, ip: string) {
  const admin = createAdminClient()
  const ipHash = ipHashFor(viewId, ip)
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()

  const { count } = await admin
    .from('form_submission_throttle')
    .select('id', { count: 'exact', head: true })
    .eq('view_id', viewId)
    .eq('ip_hash', ipHash)
    .gt('submitted_at', since)

  return (count ?? 0) >= RATE_LIMIT_PER_WINDOW
}

export async function recordSubmission(viewId: string, ip: string) {
  const admin = createAdminClient()
  await admin.from('form_submission_throttle').insert({
    view_id: viewId,
    ip_hash: ipHashFor(viewId, ip),
  })
}

export type SubmissionFieldValues = Record<string, unknown>

export type SubmissionResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string }

export async function submitFormPublic(input: {
  slug: string
  values: SubmissionFieldValues
  ip: string
}): Promise<SubmissionResult> {
  const resolution = await resolvePublicForm(input.slug)
  if (!resolution) return { ok: false, error: 'Form not found.' }
  if (!resolution.config) return { ok: false, error: 'Form not configured.' }

  if (await isRateLimited(resolution.viewId, input.ip)) {
    return { ok: false, error: 'Too many submissions. Please try again in a moment.' }
  }

  const admin = createAdminClient()
  const fieldsById = new Map(resolution.fields.map((f) => [f.id, f]))

  for (const requiredId of resolution.config.requiredFieldIds) {
    const v = input.values[requiredId]
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      const field = fieldsById.get(requiredId)
      return { ok: false, error: `${field?.name ?? 'A required field'} is required.` }
    }
  }

  const titleField = resolution.fields.find(
    (f) => f.semantic_role === 'title' && f.field_type === 'text',
  )
  const titleValue =
    titleField && typeof input.values[titleField.id] === 'string'
      ? (input.values[titleField.id] as string)
      : 'Form submission'

  const { data: record, error: recordError } = await admin
    .from('collection_records')
    .insert({
      workspace_id: resolution.workspaceId,
      collection_id: resolution.collectionId,
      title: titleValue,
      created_by: null,
    })
    .select('id')
    .single()

  if (recordError) return { ok: false, error: recordError.message }

  const inserts: Array<{
    workspace_id: string
    record_id: string
    field_id: string
    value_json: Json
  }> = []

  for (const fieldId of resolution.config.includedFieldIds) {
    const raw = input.values[fieldId]
    if (raw === undefined) continue
    inserts.push({
      workspace_id: resolution.workspaceId,
      record_id: record.id,
      field_id: fieldId,
      value_json: { value: (raw ?? null) as Json },
    })
  }

  if (titleField && titleField.id in input.values) {
    if (!inserts.some((i) => i.field_id === titleField.id)) {
      inserts.push({
        workspace_id: resolution.workspaceId,
        record_id: record.id,
        field_id: titleField.id,
        value_json: { value: titleValue },
      })
    }
  }

  if (inserts.length > 0) {
    const { error: valuesError } = await admin.from('record_values').insert(inserts)
    if (valuesError) return { ok: false, error: valuesError.message }
  }

  await recordSubmission(resolution.viewId, input.ip)

  return { ok: true, recordId: record.id }
}
