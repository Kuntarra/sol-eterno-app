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

// Movilización multimodal: un traslado tipo 'movilizacion' + sus tramos (legs).
type TramoForm = { modo?: string; origen?: string; destino?: string; fecha?: string; hora?: string; notas?: string }
export async function createMovilizacion(formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const back = '/admin/transporte/movilizacion'
  const supabase = await createClient()

  let tramos: TramoForm[] = []
  try { tramos = JSON.parse((formData.get('tramos') as string) || '[]') } catch { tramos = [] }
  tramos = tramos.filter((t) => t && (t.origen || t.destino))
  if (!tramos.length) fail(back, 'Agrega al menos un tramo con origen y destino.')

  const first = tramos[0]
  const last = tramos[tramos.length - 1]

  const { data: traslado, error } = await data.insertTraslado(supabase, {
    proyecto_id:      (formData.get('proyecto_id') as string) || null,
    vehiculo_id:      (formData.get('vehiculo_id') as string) || null,
    tipo:             'movilizacion',
    sentido:          (formData.get('sentido') as string) || 'ida',
    fecha:            first.fecha || null,
    hora:             first.hora || null,
    origen:           first.origen || null,
    destino:          last.destino || null,
    conductor_nombre: (formData.get('conductor_nombre') as string) || null,
  })
  if (error) fail(back, error.message)

  const { error: e2 } = await data.insertTramos(supabase, traslado.id, tramos.map((t, i) => ({
    orden: i + 1,
    modo: t.modo || 'bus',
    origen: t.origen || null,
    destino: t.destino || null,
    fecha: t.fecha || null,
    hora: t.hora || null,
    notas: t.notas || null,
  })))
  if (e2) fail(back, e2.message)

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

// Manifiesto MASIVO = SOLO planificación (quién debería ir): agrega una cuadrilla
// o todos los en faena a la lista del traslado de una vez. NO es embarque: el
// "quién subió" se sigue marcando persona por persona (marcarPasajero). Respeta
// la capacidad del vehículo (el bus es crítico): no sobrepasa el tope.
export async function addPasajerosMasivo(trasladoId: string, formData: FormData) {
  if (!(await puedeGestionar('transporte'))) redirect(SIN_PERMISO)
  const supabase = await createClient()
  const back = `/admin/transporte/${trasladoId}`
  const scope = (formData.get('scope') as string) || 'cuadrilla'
  const ref = (formData.get('ref') as string) || ''

  const t = await data.getTraslado(supabase, trasladoId)
  if (!t) fail(back, 'Traslado no encontrado.')

  let candidatos: { id: string; persona_id: string | null }[] = []
  if (scope === 'cuadrilla') {
    if (!ref) fail(back, 'Selecciona una cuadrilla.')
    candidatos = await data.listDotacionesByCuadrilla(supabase, ref, t!.proyecto_id)
  } else {
    if (!t!.fecha) fail(back, 'El traslado no tiene fecha; no se puede calcular "en faena".')
    candidatos = await data.listDotacionesEnFaena(supabase, t!.fecha as string, t!.proyecto_id)
  }

  // Quitar los que ya están en el manifiesto.
  const yaIds = new Set(await data.listPasajeroDotacionIds(supabase, trasladoId))
  let nuevos = candidatos.filter((c) => !yaIds.has(c.id))

  // Respetar la capacidad del vehículo (no sobrepasar el bus).
  const veh = t!.vehiculos as unknown as { capacidad: number } | null
  let fuera = 0
  if (veh?.capacidad && veh.capacidad > 0) {
    const restante = Math.max(0, veh.capacidad - yaIds.size)
    if (nuevos.length > restante) { fuera = nuevos.length - restante; nuevos = nuevos.slice(0, restante) }
  }

  if (!nuevos.length) {
    redirect(back + (fuera > 0 ? '?fuera=' + fuera : '?agregados=0'))
  }
  const { error } = await data.insertPasajeros(supabase, nuevos.map((c) => ({
    traslado_id: trasladoId, dotacion_id: c.id, persona_id: c.persona_id,
  })))
  if (error) fail(back, error.message)
  revalidatePath(back)
  redirect(back + '?agregados=' + nuevos.length + (fuera > 0 ? '&fuera=' + fuera : ''))
}

export async function marcarPasajero(trasladoId: string, pasajeroId: string, accion: 'subio' | 'dejado' | 'no_show') {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { estado: accion }
  if (accion === 'subio') patch.subio_at = new Date().toISOString()
  if (accion === 'dejado') patch.dejado_at = new Date().toISOString()
  await data.updatePasajeroEstado(supabase, pasajeroId, patch)
  revalidatePath(`/admin/transporte/${trasladoId}`)
}
