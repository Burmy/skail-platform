import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAiBuilderAccess } from '@/lib/ai-builder/access'
import { applyAiBuilderPlan } from '@/lib/ai-builder/apply'
import {
  getAiBuilderPreview,
  markAiBuilderPreviewApplied,
} from '@/lib/ai-builder/store'

const applyRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  previewId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = applyRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid apply request.' },
        { status: 400 },
      )
    }

    const access = await requireAiBuilderAccess(parsed.data.workspaceId)

    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    if (!access.canApply) {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can apply AI Builder changes.' },
        { status: 403 },
      )
    }

    const preview = await getAiBuilderPreview({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      previewId: parsed.data.previewId,
    })

    if (!preview) {
      return NextResponse.json({ error: 'Preview not found.' }, { status: 404 })
    }

    if (preview.status !== 'preview') {
      return NextResponse.json(
        { error: `Preview is already ${preview.status}.` },
        { status: 409 },
      )
    }

    const result = await applyAiBuilderPlan({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      userId: access.user.id,
      plan: preview.plan,
    })

    await markAiBuilderPreviewApplied({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      previewId: parsed.data.previewId,
      operations: result.operations,
    })

    return NextResponse.json({
      status: 'applied',
      operations: result.operations,
      skipped: result.skipped,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI Builder apply failed.',
      },
      { status: 500 },
    )
  }
}
