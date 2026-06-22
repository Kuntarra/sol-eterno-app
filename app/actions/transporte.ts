'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeGestionar } from '@/lib/rbac'

const SIN_PERMISO = '/admin/transporte?error=' + encodeURIComponent('No tienes permiso de supervisor en Transporte.')

// ── Flota ──────────────────────────────────────────────────────
export async function createVehiculo(formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const supabase = await createClient()
  const cap = parseInt((formData.get('capacidad') as string) || '1', 10)
  const { error } = await supabase.from('vehiculos').insert({
    tipo:          (formData.get('tipo') as string) || 'bus',
    identificador: (formData.get('identificador') as string) || null,
    capacidad:     Number.isFinite(cap) ? cap : 1,
    descripcion:   (formData.get('descripcion') as string) || null,
  })
  if (error) redirect('/admin/transporte/flota?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/transporte/flota')
  redirect('/admin/transporte/flota?success=1')
}

// ── Traslados ──────────────────────────────────────────────────
export async function createTraslado(formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const supabase = await createClient()
  const { data, error } = await supabase.from('traslados').insert({
    proyecto_id:      (formData.get('proyecto_id') as string) || null,
    vehiculo_id:      (formData.get('vehiculo_id') as string) || null,
    tipo:             (formData.get('tipo') as string) || 'movilizacion',
    sentido:          (formData.get('sentido') as string) || 'ida',
    fecha:            (formData.get('fecha') as string) || null,
    hora:             (formData.get('hora') as string) || null,
    origen:           (formData.get('origen') as string) || null,
    destino:          (formData.get('destino') as string) || null,
    conductor_nombre: (formData.get('conductor_nombre') as string) || null,
  }).select('id').single()
  if (error) redirect('/admin/transporte/nuevo?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/transporte')
  redirect(`/admin/transporte/${data.id}`)
}

export async function updateTrasladoEstado(id: string, formData: FormData) {
  const supabase = await createClient()
  await supabase.from('traslados').update({ estado: formData.get('estado') as string }).eq('id', id)
  revalidatePath(`/admin/transporte/${id}`)
}

// ── Manifiesto (pasajeros) ─────────────────────────────────────
export async function addPasajero(trasladoId: string, formData: FormData) {
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect(`/admin/transporte/${trasladoId}?error=` + encodeURIComponent('Selecciona una persona.'))

  // persona_id desde la dotación (para mostrar aunque se borre la dotación)
  const { data: dot } = await supabase.from('dotaciones').select('persona_id').eq('id', dotacionId).maybeSingle()

  const { error } = await supabase.from('traslado_pasajeros').insert({
    traslado_id: trasladoId,
    dotacion_id: dotacionId,
    persona_id:  dot?.persona_id ?? null,
  })
  if (error) redirect(`/admin/transporte/${trasladoId}?error=` + encodeURIComponent(error.message))
  revalidatePath(`/admin/transporte/${trasladoId}`)
  redirect(`/admin/transporte/${trasladoId}`)
}

export async function marcarPasajero(trasladoId: string, pasajeroId: string, accion: 'subio' | 'dejado' | 'no_show') {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { estado: accion }
  if (accion === 'subio') patch.subio_at = new Date().toISOString()
  if (accion === 'dejado') patch.dejado_at = new Date().toISOString()
  await supabase.from('traslado_pasajeros').update(patch).eq('id', pasajeroId)
  revalidatePath(`/admin/transporte/${trasladoId}`)
}
