'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esAdministrador } from '@/lib/rbac'

function parseServices(formData: FormData) {
  return {
    parking:       formData.get('parking')       === 'on',
    parking_spots: Number(formData.get('parking_spots')) || 0,
    laundry:       formData.get('laundry')       === 'on',
    food:          formData.get('food')          === 'on',
    transport:     formData.get('transport')     === 'on',
    cleaning:      formData.get('cleaning')      === 'on',
    cold_meals:    formData.get('cold_meals')    === 'on',
  }
}

export async function createProperty(formData: FormData) {
  if (!(await esAdministrador())) redirect('/admin/propiedades/nueva?error=' + encodeURIComponent('Solo la administración puede crear propiedades.'))
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('properties')
    .insert({
      city_id:  formData.get('city_id') as string,
      name:     formData.get('name') as string,
      type:     formData.get('type') as string,
      address:  (formData.get('address') as string) || null,
      icon_url: (formData.get('icon_url') as string) || null,
      floors:   formData.get('floors') ? Number(formData.get('floors')) : null,
      services: parseServices(formData),
      active:   true,
    })
    .select()
    .single()

  if (error) {
    redirect('/admin/propiedades/nueva?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/propiedades')
  redirect(`/admin/propiedades/${data.id}?success=creada`)
}

export async function updateProperty(id: string, formData: FormData) {
  if (!(await esAdministrador())) redirect(`/admin/propiedades/${id}?error=` + encodeURIComponent('Solo la administración puede editar propiedades.'))
  const supabase = await createClient()

  const { error } = await supabase
    .from('properties')
    .update({
      city_id:  formData.get('city_id') as string,
      name:     formData.get('name') as string,
      type:     formData.get('type') as string,
      address:  (formData.get('address') as string) || null,
      icon_url: (formData.get('icon_url') as string) || null,
      floors:   formData.get('floors') ? Number(formData.get('floors')) : null,
      services: parseServices(formData),
    })
    .eq('id', id)

  if (error) {
    redirect(`/admin/propiedades/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/propiedades')
  revalidatePath(`/admin/propiedades/${id}`)
  redirect(`/admin/propiedades/${id}?success=guardada`)
}

export async function togglePropertyActive(id: string, active: boolean) {
  if (!(await esAdministrador())) redirect(`/admin/propiedades/${id}?error=` + encodeURIComponent('Solo la administración puede cambiar propiedades.'))
  const supabase = await createClient()
  await supabase.from('properties').update({ active }).eq('id', id)
  revalidatePath('/admin/propiedades')
  revalidatePath(`/admin/propiedades/${id}`)
}

export async function deleteProperty(id: string) {
  if (!(await esAdministrador())) redirect('/admin/propiedades?error=' + encodeURIComponent('Solo la administración puede eliminar propiedades.'))
  const supabase = await createClient()
  await supabase.from('properties').delete().eq('id', id)
  revalidatePath('/admin/propiedades')
  redirect('/admin/propiedades')
}
