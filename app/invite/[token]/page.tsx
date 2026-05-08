import { notFound, redirect } from 'next/navigation'

import { InviteAcceptCard } from '@/components/pages/invite-accept-card'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { normalizePageAccessLevel, resolveShareToken } from '@/lib/pages/access'

export const dynamic = 'force-dynamic'

type InvitePageProps = {
  params: Promise<{ token: string }>
}

const ACCESS_LABELS = {
  view: 'view',
  edit: 'edit',
  manage: 'manage',
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const resolution = await resolveShareToken(token)
  if (!resolution || resolution.link.link_type !== 'invite') notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  let invitedBy = 'A workspace manager'
  if (resolution.link.created_by) {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(resolution.link.created_by)
    invitedBy = data.user?.email ?? invitedBy
  }

  const level = normalizePageAccessLevel(resolution.link.access_level)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <InviteAcceptCard
        token={token}
        invitedBy={invitedBy}
        scopeLabel={resolution.scopeLabel}
        workspaceName={resolution.workspace.brand_name || resolution.workspace.name}
        accessLabel={ACCESS_LABELS[level]}
      />
    </main>
  )
}
