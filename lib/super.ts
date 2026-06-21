import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'

// Verifica que el usuario actual sea super-admin (dueño del SaaS).
// Si no lo es, redirige. Úsalo al inicio de toda página/acción de /super.
export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect('/')
  return { userId: user.id, fullName: profile.full_name ?? user.email ?? 'Super-admin' }
}
