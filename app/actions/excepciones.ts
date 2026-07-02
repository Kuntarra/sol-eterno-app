'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeGestionar, esAdministrador } from '@/lib/rbac'
import { MODULO_KEYS } from '@/lib/modulos'

const BACK = '/admin/excepciones'
const TIPOS_EXCEPCION = ['no_llego', 'sin_planificacion', 'diferencia_cantidad', 'no_entregado'] as const
const ESTADOS_EXCEPCION = ['abierta', 'en_revision', 'resuelta', 'rechazada'] as const

// Crea una excepción (nace 'abierta', GEN-004). La puede registrar quien opera
// el módulo (Control/Supervisor) o la administración.
export async function crearExcepcion(formData: FormData) {
  const modulo = (formData.get('modulo') as string) || ''
  const tipo = (formData.get('tipo') as string) || ''
  if (!MODULO_KEYS.includes(modulo as never)) redirect(BACK + '?error=' + encodeURIComponent('Módulo no válido.'))
  if (!TIPOS_EXCEPCION.includes(tipo as never)) redirect(BACK + '?error=' + encodeURIComponent('Tipo de excepción no válido.'))
  if (!(await puedeGestionar(modulo))) redirect(BACK + '?error=' + encodeURIComponent('No tienes permiso para registrar excepciones en este módulo.'))

  const supabase = await createClient()
  const { error } = await supabase.from('excepciones').insert({
    modulo,
    tipo,
    descripcion: ((formData.get('descripcion') as string) || '').trim() || null,
    persona_id: ((formData.get('persona_id') as string) || '') || null,
    proyecto_id: ((formData.get('proyecto_id') as string) || '') || null,
    estado: 'abierta',
  })
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))
  revalidatePath(BACK)
  redirect(BACK + '?success=creada')
}

// Cambia el estado de una excepción (en revisión / resuelta / rechazada). La
// excepción NO se borra: conserva su historial (GEN-005).
export async function actualizarEstadoExcepcion(id: string, formData: FormData) {
  const estado = (formData.get('estado') as string) || ''
  if (!ESTADOS_EXCEPCION.includes(estado as never)) redirect(BACK + '?error=' + encodeURIComponent('Estado no válido.'))
  const supabase = await createClient()

  const { data: row } = await supabase.from('excepciones').select('modulo').eq('id', id).maybeSingle()
  if (!row) redirect(BACK + '?error=' + encodeURIComponent('Excepción no encontrada.'))
  if (!((await esAdministrador()) || (await puedeGestionar(row.modulo)))) {
    redirect(BACK + '?error=' + encodeURIComponent('No tienes permiso para cambiar esta excepción.'))
  }

  const { error } = await supabase
    .from('excepciones')
    .update({
      estado,
      resolucion: ((formData.get('resolucion') as string) || '').trim() || null,
      responsable_nombre: ((formData.get('responsable_nombre') as string) || '').trim() || null,
      actualizada_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) redirect(BACK + '?error=' + encodeURIComponent(error.message))
  revalidatePath(BACK)
  redirect(BACK + '?success=actualizada')
}
