'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function checkIn(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rut       = (formData.get('rut') as string).trim() || null
  const companyId = formData.get('company_id') as string
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

  const { error } = await supabase.from('stays').update(payload).eq('id', stayId)
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
