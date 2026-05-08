import { redirect } from 'next/navigation'

import { getUserWorkspaces } from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsRedirectPage() {
  const { workspaces } = await getUserWorkspaces()

  if (workspaces.length === 0) {
    redirect('/workspaces/new')
  }

  redirect(`/workspaces/${workspaces[0].id}/settings`)
}
