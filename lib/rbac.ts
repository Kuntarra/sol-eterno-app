import { createClient } from '@/lib/supabase/server'

// Nivel del usuario actual para un módulo: 'supervisor' | 'visor' | null.
// Admin del tenant y super-admin siempre son 'supervisor'.
export async function nivelModulo(modulo: string): Promise<'supervisor' | 'visor' | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('nivel_modulo', { p_modulo: modulo })
  return (data as 'supervisor' | 'visor' | null) ?? null
}

// Para usar en server actions: corta la ejecución si no puede gestionar el módulo.
export async function puedeGestionar(modulo: string): Promise<boolean> {
  return (await nivelModulo(modulo)) === 'supervisor'
}
