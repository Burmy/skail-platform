import { NextResponse } from 'next/server'

import { submitFormPublic } from '@/lib/databases/forms'

export const dynamic = 'force-dynamic'

function clientIp(request: Request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return '0.0.0.0'
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body required' }, { status: 400 })
  }
  const payload = body as Record<string, unknown>
  const slug = typeof payload.slug === 'string' ? payload.slug : null
  const values =
    payload.values && typeof payload.values === 'object' && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : null

  if (!slug || !values) {
    return NextResponse.json({ error: 'slug and values are required' }, { status: 400 })
  }

  const ip = clientIp(request)
  const result = await submitFormPublic({ slug, values, ip })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, recordId: result.recordId })
}
