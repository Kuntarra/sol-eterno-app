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

// Cupo de personas: cuántas hay en el directorio vs el límite contratado.
export async function getCupoPersonas(): Promise<{ usadas: number; limite: number; disponibles: number }> {
  const supabase = await createClient()
  const [{ count }, { data: t }] = await Promise.all([
    supabase.from('persona_directorio').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('limite_personas').eq('id', await getMyTenantId()).maybeSingle(),
  ])
  const usadas = count ?? 0
  const limite = t?.limite_personas ?? 0
  return { usadas, limite, disponibles: Math.max(0, limite - usadas) }
}

// Módulos que la empresa (tenant) tiene activos = lo que compró.
// RLS deja a cada usuario leer los de su propia empresa.
export async function modulosActivosTenant(): Promise<string[]> {
  const supabase = await createClient()
  // Filtrar por MI empresa: el super admin ve (RLS) los módulos de todas las
  // empresas, así que sin este filtro el menú mezclaría módulos de otros tenants.
  const { data } = await supabase
    .from('tenant_modulos')
    .select('modulo')
    .eq('tenant_id', await getMyTenantId())
    .eq('activo', true)
  return (data ?? []).map((r) => r.modulo)
}
