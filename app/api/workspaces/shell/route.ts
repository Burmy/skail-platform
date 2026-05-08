import { NextResponse } from 'next/server'

import { getAppliedWorkspaceTheme } from '@/lib/theme/applied-theme'
import {
  getUserWorkspaces,
  getWorkspaceForUser,
} from '@/lib/workspaces/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedWorkspaceId = url.searchParams.get('workspaceId')

  try {
    const { user, workspaces } = await getUserWorkspaces()
    const workspaceId = requestedWorkspaceId ?? workspaces[0]?.id ?? null

    if (!workspaceId) {
      return NextResponse.json(
        {
          userEmail: user.email ?? null,
          workspace: null,
          workspaces,
          theme: null,
        },
        { status: 200 },
      )
    }

    const [ctx, theme] = await Promise.all([
      getWorkspaceForUser(workspaceId),
      getAppliedWorkspaceTheme(workspaceId),
    ])

    if (!ctx.workspace || !ctx.roleKey) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      userEmail: user.email ?? null,
      workspace: { ...ctx.workspace, role_key: ctx.roleKey },
      workspaces,
      theme,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load workspace shell.',
      },
      { status: 500 },
    )
  }
}
