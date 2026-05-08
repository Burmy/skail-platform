import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type LoginPageProps = {
  searchParams: Promise<{
    message?: string
    next?: string
  }>
}

function getSafeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  return value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(getSafeNextPath(params.next))
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-center text-2xl font-semibold tracking-normal">
          Welcome to SKAIL
        </h1>
        <AuthForm message={params.message} nextPath={params.next} mode="login" />
      </div>
    </main>
  )
}
