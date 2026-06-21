import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
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

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const { data: users } = await admin
    .from('user_profiles')
    .select('id, full_name, role, email')
    .eq('tenant_id', tenantId)
    .neq('id', user.id)
    .in('role', ['receptionist', 'client'])
    .order('role')
    .order('full_name')

  return <RoleSwitcher users={users ?? []} />
}
