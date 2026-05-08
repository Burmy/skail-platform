'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createStatelessAuthClient } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AuthActionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getSafeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return '/'
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  return value
}

function getJwtRole(key: string) {
  if (!key.startsWith('eyJ')) {
    return null
  }

  try {
    const payload = key.split('.')[1]
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(
      Buffer.from(normalizedPayload, 'base64').toString('utf8'),
    ) as { role?: unknown }

    return typeof claims.role === 'string' ? claims.role : null
  } catch {
    return null
  }
}

function hasUsableAdminAuthKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!key) {
    return false
  }

  return key.startsWith('sb_secret_') || getJwtRole(key) === 'service_role'
}

function getAutoConfirmSignupSetupMessage() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!key) {
    return 'Add the real Supabase service_role key to SUPABASE_SERVICE_ROLE_KEY, or disable Confirm email in Supabase Auth settings.'
  }

  const role = getJwtRole(key)

  if (role && role !== 'service_role') {
    return `SUPABASE_SERVICE_ROLE_KEY is currently a ${role} key. Replace it with the real service_role key, or disable Confirm email in Supabase Auth settings.`
  }

  return null
}

function canAutoConfirmSignup() {
  return (
    hasUsableAdminAuthKey() &&
    process.env.SKAIL_AUTO_CONFIRM_SIGNUPS !== 'false' &&
    process.env.SKAIL_DEV_AUTO_CONFIRM_SIGNUPS !== 'false'
  )
}

async function signInAfterSignup(email: string, password: string, nextPath: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      status: 'error' as const,
      message: error.message,
    }
  }

  redirect(nextPath)
}

export async function login(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, 'email')
  const password = getString(formData, 'password')

  if (!email || !password) {
    return {
      status: 'error',
      message: 'Enter an email and password.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      status: 'error',
      message: error.message,
    }
  }

  redirect(getSafeNextPath(formData.get('next')))
}

export async function signup(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, 'email')
  const password = getString(formData, 'password')

  if (!email || !password) {
    return {
      status: 'error',
      message: 'Enter an email and password.',
    }
  }

  if (password.length < 8) {
    return {
      status: 'error',
      message: 'Password must be at least 8 characters.',
    }
  }

  const nextPath = getSafeNextPath(formData.get('next'))

  if (canAutoConfirmSignup()) {
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      return {
        status: 'error',
        message:
          error.message === 'User not allowed'
            ? 'Supabase Admin signup failed. SUPABASE_SERVICE_ROLE_KEY must be the service_role key, not anon.'
            : error.message,
      }
    }

    return signInAfterSignup(email, password, nextPath)
  }

  const headerStore = await headers()
  const origin =
    headerStore.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'

  const supabase = createStatelessAuthClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      const setupMessage = getAutoConfirmSignupSetupMessage()

      return {
        status: 'error',
        message:
          setupMessage ??
          'Supabase email rate limit exceeded. Wait for the limit to reset or configure custom SMTP in Supabase.',
      }
    }

    return {
      status: 'error',
      message: error.message,
    }
  }

  if (data.session) {
    return signInAfterSignup(email, password, nextPath)
  }

  return {
    status: 'error',
    message: getAutoConfirmSignupSetupMessage() ?? 'Supabase still requires email confirmation. Disable Confirm email in Supabase Auth settings.',
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
