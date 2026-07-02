'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

type LogOpts = {
  // Cliente a usar. Por defecto el cliente RLS del tenant (createClient). En
  // acciones de super admin que ya usan el service role, pasa ese cliente.
  client?: SupabaseClient<Database>
  // En el camino service role NO hay auth.uid(): el tenant y el autor deben
  // venir explícitos (el trigger solo los sella cuando hay sesión de usuario).
  tenantId?: string
  actorUserId?: string | null
  actorNombre?: string | null
}

// Registra una acción en el log de auditoría (registro_actividad). El tenant y
// el autor los sella un trigger cuando hay sesión de usuario; nunca lanza: un
// fallo de log no debe romper la acción principal.
export async function registrarActividad(
  entidad: string,
  entidadId: string | null,
  accion: string,
  detalle?: Record<string, unknown>,
  opts?: LogOpts,
): Promise<void> {
  try {
    const supabase = opts?.client ?? (await createClient())
    await supabase.from('registro_actividad').insert({
      entidad,
      entidad_id: entidadId,
      accion,
      detalle: (detalle ?? null) as never,
      ...(opts?.tenantId ? { tenant_id: opts.tenantId } : {}),
      ...(opts?.actorUserId !== undefined ? { actor_user_id: opts.actorUserId } : {}),
      ...(opts?.actorNombre !== undefined ? { actor_nombre: opts.actorNombre } : {}),
    })
  } catch {
    // No romper la acción principal por un fallo de auditoría.
  }
}
