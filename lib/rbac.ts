import { createClient } from '@/lib/supabase/server'
import { getMyTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'

export type NivelModulo = 'admin_modulo' | 'actuador' | 'visor' | null

// Nivel del usuario actual para un módulo.
// Admin del tenant y super-admin siempre son 'admin_modulo'.
export async function nivelModulo(modulo: string): Promise<NivelModulo> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('nivel_modulo', { p_modulo: modulo })
  return (data as NivelModulo) ?? null
}

// Puede OPERAR/escribir en el módulo (admin de módulo o actuador).
export async function puedeGestionar(modulo: string): Promise<boolean> {
  const n = await nivelModulo(modulo)
  return n === 'admin_modulo' || n === 'actuador'
}

// Puede ADMINISTRAR el módulo (config, usuarios del módulo) — solo admin de módulo.
export async function puedeAdministrar(modulo: string): Promise<boolean> {
  return (await nivelModulo(modulo)) === 'admin_modulo'
}

// ¿El usuario actual es admin de su empresa o super admin? Guard de las acciones
// de administración (proyectos, dotaciones, propiedades, etc.). La UI ya las
// oculta a los sub-usuarios, pero las acciones de servidor son invocables
// directamente: este chequeo lo impide en el servidor (RLS no distingue el rol).
export async function esAdministrador(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: prof } = await supabase.from('user_profiles').select('role, is_super_admin').eq('id', user.id).maybeSingle()
  return prof?.role === 'admin' || !!prof?.is_super_admin
}

// ¿Es super admin? Guard de las acciones de la consola SaaS (/super: clientes, EDP).
export async function esSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: prof } = await supabase.from('user_profiles').select('is_super_admin').eq('id', user.id).maybeSingle()
  return !!prof?.is_super_admin
}

// Guard de página de módulo. Bloquea (→ /admin) si:
//  1) la EMPRESA no compró el módulo (vale incluso para el admin), o
//  2) el usuario no tiene acceso al módulo (sub-usuario sin asignación).
// Admin/super con el módulo comprado pasan (nivel_modulo = 'admin_modulo').
export async function requireAccesoModulo(modulo: string): Promise<void> {
  const supabase = await createClient()
  // Filtrar por MI empresa: un super admin ve los tenant_modulos de TODAS las
  // empresas (RLS), así que sin este filtro maybeSingle() encontraría varias
  // filas (Sol Eterno + demos), fallaría y rebotaría al dashboard.
  const { data: comprado } = await supabase
    .from('tenant_modulos')
    .select('id')
    .eq('tenant_id', await getMyTenantId())
    .eq('modulo', modulo)
    .eq('activo', true)
    .maybeSingle()
  if (!comprado) redirect('/admin')
  if ((await nivelModulo(modulo)) === null) redirect('/admin')
}

// Guard de página solo-admin: los sub-usuarios de módulo no entran.
export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase
    .from('user_profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()
  if (prof?.role !== 'admin' && !prof?.is_super_admin) redirect('/admin')
}
