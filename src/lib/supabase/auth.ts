import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser() // verified round-trip, safe for authorization decisions

  if (error || !user) return null
  return { user, supabase }
}
