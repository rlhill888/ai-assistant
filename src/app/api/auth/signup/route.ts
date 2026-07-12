import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SignupBody {
  email: string
  password: string
}

function isValidBody(body: unknown): body is SignupBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).email === 'string' &&
    typeof (body as Record<string, unknown>).password === 'string'
  )
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isValidBody(body) || !body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 }
    )
  }

  return NextResponse.json(
    { user: data.user, session: data.session !== null },
    { status: 201 }
  )
}
