'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Registra un evento en la bitácora compartida del proyecto. RLS permite
// escribir si eres el dueño del proyecto o un proveedor vinculado activo.
// El autor (tenant + usuario) lo sella un trigger; no se puede falsificar.
export async function registrarEvento(formData: FormData) {
  const supabase = await createClient()
  const proyectoId = (formData.get('proyecto_id') as string) || ''
  const tipo = ((formData.get('tipo') as string) || '').trim()
  const back = (formData.get('back') as string) || '/admin/conectados'
  if (!proyectoId || !tipo) return

  await supabase.from('eventos_bitacora').insert({
    proyecto_id: proyectoId,
    dotacion_id: (formData.get('dotacion_id') as string) || null,
    persona_id: (formData.get('persona_id') as string) || null,
    modulo: (formData.get('modulo') as string) || 'general',
    tipo,
    detalle: ((formData.get('detalle') as string) || '').trim() || null,
  })

  revalidatePath(back)
}
