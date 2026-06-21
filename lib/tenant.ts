import { createClient } from './supabase/server'

// Devuelve el tenant (operador) del usuario autenticado real.
// Base del aislamiento multi-tenant: se usa para filtrar toda lectura
// hecha con la llave maestra (service role), que se salta RLS.
export async function getMyTenantId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) throw new Error('Usuario sin tenant asignado')
  return profile.tenant_id
}
