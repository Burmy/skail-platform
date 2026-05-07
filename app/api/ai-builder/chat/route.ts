import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAiBuilderAccess } from '@/lib/ai-builder/access'
import { getAiBuilderWorkspaceContext } from '@/lib/ai-builder/context'
import { generateAiBuilderPlan } from '@/lib/ai-builder/gemini'
import { planChangeCount } from '@/lib/ai-builder/contract'
import { storeAiBuilderPreview } from '@/lib/ai-builder/store'

const chatRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(4000),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = chatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Invalid AI Builder request.',
        },
        { status: 400 },
      )
    }

    const access = await requireAiBuilderAccess(parsed.data.workspaceId)

    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const context = await getAiBuilderWorkspaceContext(parsed.data.workspaceId)

    if (!context) {
      return NextResponse.json(
        { error: 'Workspace not found.' },
        { status: 404 },
      )
    }

    const plan = await generateAiBuilderPlan({
      prompt: parsed.data.prompt,
      context,
    })
    const preview = await storeAiBuilderPreview({
      admin: access.admin,
      workspaceId: parsed.data.workspaceId,
      userId: access.user.id,
      prompt: parsed.data.prompt,
      plan,
      context,
    })

    return NextResponse.json({
      previewId: preview.id,
      createdAt: preview.created_at,
      plan,
      changeCount: planChangeCount(plan),
      canApply: access.canApply,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'AI Builder chat failed.',
      },
      { status: 500 },
    )
  }
}
