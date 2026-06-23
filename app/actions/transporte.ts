'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeGestionar } from '@/lib/rbac'
import { fail } from '@/lib/forms'
import { clampCapacidad } from '@/lib/vehiculos'
import * as data from '@/lib/data/transporte'

const SIN_PERMISO = '/admin/transporte?error=' + encodeURIComponent('No tienes permiso de supervisor en Transporte.')

// ── Flota ──────────────────────────────────────────────────────
export async function createVehiculo(formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const supabase = await createClient()
  const tipo = (formData.get('tipo') as string) || 'bus'
  const cap = parseInt((formData.get('capacidad') as string) || '1', 10)
  const { error } = await data.insertVehiculo(supabase, {
    tipo,
    identificador: (formData.get('identificador') as string) || null,
    capacidad:     clampCapacidad(tipo, cap),
    descripcion:   (formData.get('descripcion') as string) || null,
  })
  if (error) fail('/admin/transporte/flota', error.message)
  revalidatePath('/admin/transporte/flota')
  redirect('/admin/transporte/flota?success=1')
}

// ── Traslados ──────────────────────────────────────────────────
export async function createTraslado(formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const supabase = await createClient()
  const { data: traslado, error } = await data.insertTraslado(supabase, {
    proyecto_id:      (formData.get('proyecto_id') as string) || null,
    vehiculo_id:      (formData.get('vehiculo_id') as string) || null,
    tipo:             (formData.get('tipo') as string) || 'movilizacion',
    sentido:          (formData.get('sentido') as string) || 'ida',
    fecha:            (formData.get('fecha') as string) || null,
    hora:             (formData.get('hora') as string) || null,
    origen:           (formData.get('origen') as string) || null,
    destino:          (formData.get('destino') as string) || null,
    conductor_nombre: (formData.get('conductor_nombre') as string) || null,
  })
  if (error) fail('/admin/transporte/nuevo', error.message)
  revalidatePath('/admin/transporte')
  redirect(`/admin/transporte/${traslado.id}`)
}

export async function updateTrasladoEstado(id: string, formData: FormData) {
  const supabase = await createClient()
  await data.updateTrasladoEstado(supabase, id, formData.get('estado') as string)
  revalidatePath(`/admin/transporte/${id}`)
}

// ── Manifiesto (pasajeros) ─────────────────────────────────────
export async function addPasajero(trasladoId: string, formData: FormData) {
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) fail(`/admin/transporte/${trasladoId}`, 'Selecciona una persona.')

  // persona_id desde la dotación (para mostrar aunque se borre la dotación)
  const personaId = await data.getDotacionPersonaId(supabase, dotacionId)

  const { error } = await data.insertPasajero(supabase, {
    traslado_id: trasladoId,
    dotacion_id: dotacionId,
    persona_id:  personaId,
  })
  if (error) fail(`/admin/transporte/${trasladoId}`, error.message)
  revalidatePath(`/admin/transporte/${trasladoId}`)
  redirect(`/admin/transporte/${trasladoId}`)
}

export async function marcarPasajero(trasladoId: string, pasajeroId: string, accion: 'subio' | 'dejado' | 'no_show') {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { estado: accion }
  if (accion === 'subio') patch.subio_at = new Date().toISOString()
  if (accion === 'dejado') patch.dejado_at = new Date().toISOString()
  await data.updatePasajeroEstado(supabase, pasajeroId, patch)
  revalidatePath(`/admin/transporte/${trasladoId}`)
}
