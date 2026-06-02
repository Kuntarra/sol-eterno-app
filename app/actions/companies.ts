'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name:          formData.get('name') as string,
      rut:           (formData.get('rut') as string)           || null,
      contact_name:  (formData.get('contact_name') as string)  || null,
      contact_phone: (formData.get('contact_phone') as string) || null,
      contact_email: (formData.get('contact_email') as string) || null,
      active: true,
    })
    .select()
    .single()

  if (error) redirect('/admin/clientes/nuevo?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${data.id}?success=creado`)
}

export async function updateCompany(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('companies')
    .update({
      name:          formData.get('name') as string,
      rut:           (formData.get('rut') as string)           || null,
      contact_name:  (formData.get('contact_name') as string)  || null,
      contact_phone: (formData.get('contact_phone') as string) || null,
      contact_email: (formData.get('contact_email') as string) || null,
    })
    .eq('id', id)

  if (error) redirect(`/admin/clientes/${id}?error=` + encodeURIComponent(error.message))

  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${id}`)
  redirect(`/admin/clientes/${id}?success=guardado`)
}

export async function toggleCompanyActive(id: string, active: boolean) {
  const supabase = await createClient()
  await supabase.from('companies').update({ active }).eq('id', id)
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${id}`)
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()
  await supabase.from('companies').delete().eq('id', id)
  revalidatePath('/admin/clientes')
  redirect('/admin/clientes')
}
