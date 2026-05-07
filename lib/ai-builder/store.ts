import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizeAiBuilderPlan,
  type AiBuilderPlan,
} from '@/lib/ai-builder/contract'
import { toJson } from '@/lib/ai-builder/json'

type AdminClient = ReturnType<typeof createAdminClient>

export async function storeAiBuilderPreview({
  admin,
  workspaceId,
  userId,
  prompt,
  plan,
  context,
}: {
  admin: AdminClient
  workspaceId: string
  userId: string
  prompt: string
  plan: AiBuilderPlan
  context: unknown
}) {
  const { data, error } = await admin
    .from('ai_builder_previews')
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      user_prompt: prompt,
      status: 'preview',
      intent: plan.intent,
      summary: plan.summary,
      risk_level: plan.risk_level,
      requires_confirmation: plan.requires_confirmation,
      plan_json: toJson(plan),
      context_json: toJson(context),
    })
    .select('id, created_at')
    .single()

  if (error) {
    throw new Error(
      error.message.includes('ai_builder_previews')
        ? `${error.message}. Run sql/supabase_ai_builder_v1.sql in Supabase.`
        : error.message,
    )
  }

  return data
}

export async function getAiBuilderPreview({
  admin,
  workspaceId,
  previewId,
}: {
  admin: AdminClient
  workspaceId: string
  previewId: string
}) {
  const { data, error } = await admin
    .from('ai_builder_previews')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', previewId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return {
    ...data,
    plan: normalizeAiBuilderPlan(data.plan_json),
  }
}

export async function markAiBuilderPreviewApplied({
  admin,
  workspaceId,
  previewId,
  operations,
}: {
  admin: AdminClient
  workspaceId: string
  previewId: string
  operations: unknown[]
}) {
  const { error } = await admin
    .from('ai_builder_previews')
    .update({
      status: 'applied',
      applied_operations_json: toJson(operations),
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', previewId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markAiBuilderPreviewUndone({
  admin,
  workspaceId,
  previewId,
}: {
  admin: AdminClient
  workspaceId: string
  previewId: string
}) {
  const { error } = await admin
    .from('ai_builder_previews')
    .update({
      status: 'undone',
      undone_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', previewId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getLatestAppliedPreview({
  admin,
  workspaceId,
  userId,
}: {
  admin: AdminClient
  workspaceId: string
  userId: string
}) {
  const { data, error } = await admin
    .from('ai_builder_previews')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('created_by', userId)
    .eq('status', 'applied')
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
