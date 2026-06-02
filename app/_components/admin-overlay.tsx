import { createClient } from '@/lib/supabase/server'
import { RoleSwitcher } from '@/app/admin/_components/role-switcher'

export async function AdminOverlay() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null

  return <RoleSwitcher />
}
