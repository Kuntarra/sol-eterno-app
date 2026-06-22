import { createClient } from '@/lib/supabase/server'
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

// Guard de página de módulo. Bloquea (→ /admin) si:
//  1) la EMPRESA no compró el módulo (vale incluso para el admin), o
//  2) el usuario no tiene acceso al módulo (sub-usuario sin asignación).
// Admin/super con el módulo comprado pasan (nivel_modulo = 'admin_modulo').
export async function requireAccesoModulo(modulo: string): Promise<void> {
  const supabase = await createClient()
  const { data: comprado } = await supabase
    .from('tenant_modulos')
    .select('id')
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
