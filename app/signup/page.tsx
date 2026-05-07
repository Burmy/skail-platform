import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SignupPageProps = {
  searchParams: Promise<{
    next?: string
  }>
}

function getSafeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  return value
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(getSafeNextPath(params.next))
  }

  return (
    <main className="bg-background flex min-h-screen">
      <section className="bg-card hidden w-1/2 flex-col justify-between border-r p-12 lg:flex">
        <Link className="flex items-center gap-3" href="/signup">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg text-lg font-bold">
            S
          </div>
          <span className="text-2xl font-semibold">SKAIL</span>
        </Link>

        <div className="flex max-w-lg flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-normal">
            Create a workspace foundation before adding modules.
          </h1>
          <p className="text-muted-foreground text-lg">
            Your first workspace becomes the tenant boundary for dashboards,
            records, white-label settings, and future automation.
          </p>
        </div>

        <p className="text-muted-foreground text-sm">
          Secrets stay server-side. Browser code only uses public Supabase env
          variables.
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-bold">
              S
            </div>
            <span className="text-xl font-semibold">SKAIL</span>
          </div>
          <AuthForm nextPath={params.next} mode="signup" />
        </div>
      </section>
    </main>
  )
}
