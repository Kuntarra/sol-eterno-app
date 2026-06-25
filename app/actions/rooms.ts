'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador } from '@/lib/rbac'

export async function createRoom(propertyId: string, formData: FormData) {
  if (!(await esAdministrador())) redirect(`/admin/propiedades/${propertyId}?error=` + encodeURIComponent('Solo la administración puede crear habitaciones.'))
  const supabase = await createClient()

  const { error } = await supabase.from('rooms').insert({
    property_id: propertyId,
    number:      formData.get('number') as string,
    type:        (formData.get('type') as string) || null,
    floor:       formData.get('floor') ? Number(formData.get('floor')) : null,
    capacity:    Number(formData.get('capacity')) || 1,
  })

  if (error) {
    redirect(`/admin/propiedades/${propertyId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/admin/propiedades/${propertyId}`)
  redirect(`/admin/propiedades/${propertyId}#habitaciones`)
}

export async function deleteRoom(roomId: string, propertyId: string) {
  if (!(await esAdministrador())) redirect(`/admin/propiedades/${propertyId}?error=` + encodeURIComponent('Solo la administración puede eliminar habitaciones.'))
  const supabase = await createClient()
  await supabase.from('rooms').delete().eq('id', roomId)
  revalidatePath(`/admin/propiedades/${propertyId}`)
  redirect(`/admin/propiedades/${propertyId}#habitaciones`)
}
