import { createClient } from '@/lib/supabase/server'

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
