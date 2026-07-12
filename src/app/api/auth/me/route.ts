import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/auth'

export async function GET() {
  const auth = await requireUser()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user: auth.user })
}
