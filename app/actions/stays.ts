'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isValidRut, formatRut } from '@/lib/rut'

export async function checkIn(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const docType   = (formData.get('doc_type') as string) === 'foreign' ? 'foreign' : 'rut'
  const rutRaw    = ((formData.get('rut') as string) ?? '').trim()
  const companyId = formData.get('company_id') as string

  // Documento obligatorio. RUT chileno: validar dígito verificador y normalizar.
  // Extranjero: aceptar el número de documento (no vacío).
  let rut: string
  if (docType === 'rut') {
    if (!isValidRut(rutRaw)) {
      redirect('/recepcion/checkin?error=' + encodeURIComponent('Ingresa un RUT chileno válido (con dígito verificador) o marca "Extranjero".'))
    }
    rut = formatRut(rutRaw)
  } else {
    if (!rutRaw) {
      redirect('/recepcion/checkin?error=' + encodeURIComponent('Ingresa el número de documento del huésped extranjero.'))
    }
    rut = rutRaw
  }
  const roomId    = formData.get('room_id') as string
  const projectId = (formData.get('project_id') as string) || null

  // Buscar huésped existente por RUT + empresa, o crear uno nuevo
  let guestId: string | null = null

  if (rut) {
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('rut', rut)
      .eq('company_id', companyId)
      .maybeSingle()

    if (existing) guestId = existing.id
  }

  // Si la persona ya existe y tiene una estadía activa, avisar en vez de duplicar
  if (guestId) {
    const { data: activa } = await supabase
      .from('stays')
      .select('id, rooms(number, properties(name))')
      .eq('guest_id', guestId)
      .is('checked_out_at', null)
      .maybeSingle()

    if (activa) {
      const r = activa.rooms as any
      const ubic = r?.number ? `Hab. ${r.number}${r?.properties?.name ? ` · ${r.properties.name}` : ''}` : 'una habitación'
      const msg = `Esta persona ya tiene una estadía activa (${ubic}). Haz el check-out antes de registrar un nuevo turno.`
      redirect('/recepcion/checkin?error=' + encodeURIComponent(msg))
    }
  }

  if (!guestId) {
    const { data: newGuest, error: guestError } = await supabase
      .from('guests')
      .insert({
        first_name:        formData.get('first_name') as string,
        last_name_paterno: formData.get('last_name_paterno') as string,
        last_name_materno: (formData.get('last_name_materno') as string) || null,
        rut,
        phone: (formData.get('phone') as string) || null,
        company_id: companyId,
      })
      .select()
      .single()

    if (guestError) redirect('/recepcion/checkin?error=' + encodeURIComponent(guestError.message))
    guestId = newGuest.id
  }

  // Turno
  const shiftValue = formData.get('shift_type') as string
  const shiftOther = (formData.get('shift_type_other') as string) || null
  const shiftType  = shiftValue === 'otro' ? shiftOther : shiftValue

  // Buscar allocation
  const { data: allocation } = await supabase
    .from('allocations')
    .select('id')
    .eq('room_id', roomId)
    .eq('company_id', companyId)
    .maybeSingle()

  const { error: stayError } = await supabase.from('stays').insert({
    guest_id:           guestId,
    room_id:            roomId,
    company_id:         companyId,
    project_id:         projectId,
    allocation_id:      allocation?.id || null,
    shift_type:         shiftType || null,
    checked_in_at:      new Date().toISOString(),
    estimated_checkout: (formData.get('estimated_checkout') as string) || null,
    notes:              (formData.get('notes') as string) || null,
    checked_in_by:      user?.id,
  })

  if (stayError) redirect('/recepcion/checkin?error=' + encodeURIComponent(stayError.message))

  revalidatePath('/recepcion')
  redirect('/recepcion?success=1')
}

export async function updateStay(stayId: string, formData: FormData) {
  const supabase = await createClient()

  const updates: Record<string, string | null> = {
    checked_in_at:      (formData.get('checked_in_at') as string) || null,
    estimated_checkout: (formData.get('estimated_checkout') as string) || null,
    checked_out_at:     (formData.get('checked_out_at') as string) || null,
    notes:              (formData.get('notes') as string) || null,
  }

  // Eliminar nulls para no sobreescribir campos que no se enviaron
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== null && v !== '')
  )

  // Permitir borrar checked_out_at si se envió vacío explícitamente
  if (formData.get('clear_checkout') === '1') payload.checked_out_at = null

  // payload es un objeto dinámico (solo campos enviados); el cast evita el
  // chequeo de exceso de propiedades del tipo Update generado.
  const { error } = await supabase.from('stays').update(payload as never).eq('id', stayId)
  if (error) redirect('/admin/estadias/' + stayId + '/editar?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/estadias')
  revalidatePath('/recepcion')
  redirect('/admin/estadias?success=1')
}

export async function checkOut(stayId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase
    .from('stays')
    .update({
      checked_out_at:  new Date().toISOString(),
      checked_out_by:  user?.id,
    })
    .eq('id', stayId)

  revalidatePath('/recepcion')
  redirect('/recepcion?success=checkout')
}
