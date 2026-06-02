'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createAllocation(companyId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const roomIdValue  = formData.get('room_id') as string
  const projectId    = (formData.get('project_id') as string) || null
  const startDate    = formData.get('start_date') as string
  const endDate      = (formData.get('end_date') as string) || null

  // Si el valor empieza con "ALL:" asignamos todas las habitaciones de esa propiedad
  if (roomIdValue.startsWith('ALL:')) {
    const propertyId = roomIdValue.split(':')[1]

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('property_id', propertyId)

    if (rooms && rooms.length > 0) {
      const { error } = await supabase.from('allocations').insert(
        rooms.map(r => ({
          company_id: companyId,
          project_id: projectId,
          room_id:    r.id,
          start_date: startDate,
          end_date:   endDate,
          created_by: user?.id,
        }))
      )
      if (error) redirect(`/admin/clientes/${companyId}?error=` + encodeURIComponent(error.message))
    }
  } else {
    // Habitación individual
    const { error } = await supabase.from('allocations').insert({
      company_id: companyId,
      project_id: projectId,
      room_id:    roomIdValue,
      start_date: startDate,
      end_date:   endDate,
      created_by: user?.id,
    })
    if (error) redirect(`/admin/clientes/${companyId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#asignaciones`)
}

export async function deleteAllocation(allocationId: string, companyId: string) {
  const supabase = await createClient()
  await supabase.from('allocations').delete().eq('id', allocationId)
  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#asignaciones`)
}
