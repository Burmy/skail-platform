'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type WorkspaceActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, {
    message: 'Use lowercase letters, numbers, and hyphens only.',
  })

const optionalText = (max = 160) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .pipe(z.string().url().nullable())

const workspaceCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  portalSubdomain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(subdomainSchema.nullable()),
})

const workspaceSettingsSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  whiteLabelLevel: z.coerce.number().int().min(0).max(2),
  brandName: optionalText(120),
  brandLogoUrl: optionalUrl,
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color.'),
  portalSubdomain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(subdomainSchema.nullable()),
  customDomain: optionalText(253).refine(
    (value) => !value || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value),
    'Enter a domain without http:// or https://.',
  ),
  hideSkailBranding: z.enum(['on', 'off']).transform((value) => value === 'on'),
  emailFromName: optionalText(120),
  emailFromAddress: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.string().email().nullable()),
})

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the form and try again.'
}

function workspaceWriteError(error: { code?: string; message: string }) {
  if (error.code === '23505' || error.message.includes('duplicate key')) {
    return 'That subdomain or custom domain is already in use.'
  }

  return error.message
}

export async function createWorkspace(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const parsed = workspaceCreateSchema.safeParse({
    name: formData.get('name'),
    portalSubdomain: formData.get('portalSubdomain'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: firstError(parsed.error),
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Sign in before creating a workspace.',
    }
  }

  let admin: ReturnType<typeof createAdminClient>

  try {
    admin = createAdminClient()
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Workspace creation is not configured.',
    }
  }

  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .insert({
      name: parsed.data.name,
      brand_name: parsed.data.name,
      portal_subdomain: parsed.data.portalSubdomain,
      white_label_level: 2,
    })
    .select('*')
    .single()

  if (workspaceError) {
    return {
      status: 'error',
      message: workspaceWriteError(workspaceError),
    }
  }

  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role_key: 'owner',
    status: 'active',
  })

  if (memberError) {
    await admin.from('workspaces').delete().eq('id', workspace.id)

    return {
      status: 'error',
      message: memberError.message,
    }
  }

  revalidatePath('/')
  redirect(`/workspaces/${workspace.id}`)
}

export async function updateWorkspaceSettings(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const parsed = workspaceSettingsSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    whiteLabelLevel: formData.get('whiteLabelLevel'),
    brandName: formData.get('brandName'),
    brandLogoUrl: formData.get('brandLogoUrl'),
    accentColor: formData.get('accentColor'),
    portalSubdomain: formData.get('portalSubdomain'),
    customDomain: formData.get('customDomain'),
    hideSkailBranding: formData.get('hideSkailBranding'),
    emailFromName: formData.get('emailFromName'),
    emailFromAddress: formData.get('emailFromAddress'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: firstError(parsed.error),
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Sign in before updating workspace settings.',
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role_key')
    .eq('workspace_id', parsed.data.workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return {
      status: 'error',
      message: membershipError.message,
    }
  }

  if (!membership || !['owner', 'admin'].includes(membership.role_key)) {
    return {
      status: 'error',
      message: 'Only workspace owners and admins can update these settings.',
    }
  }

  let admin: ReturnType<typeof createAdminClient>

  try {
    admin = createAdminClient()
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Workspace settings are not configured.',
    }
  }

  const { error: updateError } = await admin
    .from('workspaces')
    .update({
      name: parsed.data.name,
      white_label_level: parsed.data.whiteLabelLevel,
      brand_name: parsed.data.brandName,
      brand_logo_url: parsed.data.brandLogoUrl,
      accent_color: parsed.data.accentColor,
      portal_subdomain: parsed.data.portalSubdomain,
      custom_domain: parsed.data.customDomain,
      hide_skail_branding: parsed.data.hideSkailBranding,
      email_from_name: parsed.data.emailFromName,
      email_from_address: parsed.data.emailFromAddress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.workspaceId)

  if (updateError) {
    return {
      status: 'error',
      message: workspaceWriteError(updateError),
    }
  }

  revalidatePath(`/workspaces/${parsed.data.workspaceId}`)
  revalidatePath(`/workspaces/${parsed.data.workspaceId}/settings`)
  revalidatePath('/settings')

  return {
    status: 'success',
    message: 'Workspace settings saved.',
  }
}
