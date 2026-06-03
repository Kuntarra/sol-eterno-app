import { cookies } from 'next/headers'
import { createClient } from './supabase/server'

// Devuelve el user ID efectivo: si el admin está impersonando, retorna ese ID
export async function getEffectiveUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    const cookieStore = await cookies()
    const impersonateId = cookieStore.get('sol_impersonate')?.value
    if (impersonateId) return impersonateId
  }

  return user.id
}
