import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/databases/geocode'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('q')?.trim()
  if (!address) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await geocodeAddress(address)
  if (!result) {
    return NextResponse.json({ result: null })
  }
  return NextResponse.json({ result })
}
