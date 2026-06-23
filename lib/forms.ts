import { redirect } from 'next/navigation'
import type { ServerClient } from '@/lib/supabase/types'

// Redirige a una pantalla con el mensaje de error en el query string.
// Reemplaza el patrón repetido redirect(path + '?error=' + encodeURIComponent(msg)).
export function fail(path: string, message: string): never {
  redirect(path + '?error=' + encodeURIComponent(message))
}

// Usuario autenticado actual (o null). Encapsula el supabase.auth.getUser()
// repetido en acciones y guards.
export async function getAuthedUser(supabase: ServerClient) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
