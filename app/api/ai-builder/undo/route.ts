import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAiBuilderAccess } from '@/lib/ai-builder/access'
import { undoAiBuilderOperations } from '@/lib/ai-builder/apply'
import {
  getAiBuilderPreview,
  getLatestAppliedPreview,
  markAiBuilderPreviewUndone,
} from '@/lib/ai-builder/store'

const undoRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  previewId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = undoRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid undo request.' },
        { status: 400 },
      )
    }

    const access = await requireAiBuilderAccess(parsed.data.workspaceId)

    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    if (!access.canApply) {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can undo AI Builder changes.' },
        { status: 403 },
      )
    }

    const preview = parsed.data.previewId
      ? await getAiBuilderPreview({
          admin: access.admin,
          workspaceId: parsed.data.workspaceId,
          previewId: parsed.data.previewId,
        })
      : await getLatestAppliedPreview({
          admin: access.admin,
          workspaceId: parsed.data.workspaceId,
          userId: access.user.id,
        })

    if (!preview) {
      return NextResponse.json(
        { error: 'No applied AI Builder change found to undo.' },
        { status: 404 },
      )
    }

    if (preview.created_by !== access.user.id) {
      return NextResponse.json(
        { error: 'You can only undo your own last AI Builder change.' },
        { status: 403 },
      )
    }

    if (preview.status !== 'applied') {
      return NextResponse.json(
        { error: `Preview is ${preview.status}, not applied.` },
        { status: 409 },
      )
    }

    const undone = await undoAiBuilderOperations({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      operationsJson: preview.applied_operations_json,
    })

    await markAiBuilderPreviewUndone({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      previewId: preview.id,
    })

    return NextResponse.json({
      status: 'undone',
      undone,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI Builder undo failed.',
      },
      { status: 500 },
    )
  }
}
