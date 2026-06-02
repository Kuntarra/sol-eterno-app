'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function createReceptionist(formData: FormData) {
  const adminClient = createAdminClient()
  const supabase    = await createClient()

  const email     = formData.get('email') as string
  const password  = formData.get('password') as string
  const fullName  = formData.get('full_name') as string
  const propertyIds = formData.getAll('property_ids') as string[]

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'receptionist', full_name: fullName },
  })

  if (error) redirect('/admin/usuarios/nuevo-recepcionista?error=' + encodeURIComponent(error.message))

  const userId = data.user.id

  // Asignar propiedades
  if (propertyIds.length > 0) {
    await supabase.from('receptionist_properties').insert(
      propertyIds.map(pid => ({ user_id: userId, property_id: pid }))
    )
  }

  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios?success=recepcionista')
}

export async function createClientUser(formData: FormData) {
  const adminClient = createAdminClient()

  const email     = formData.get('email') as string
  const password  = formData.get('password') as string
  const fullName  = formData.get('full_name') as string
  const companyId = formData.get('company_id') as string

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'client', full_name: fullName },
  })

  if (error) redirect('/admin/usuarios/nuevo-cliente?error=' + encodeURIComponent(error.message))

  // Asociar a empresa
  await adminClient
    .from('user_profiles')
    .update({ company_id: companyId })
    .eq('id', data.user.id)

  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios?success=cliente')
}

export async function deleteUser(userId: string) {
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(userId)
  revalidatePath('/admin/usuarios')
  redirect('/admin/usuarios')
}

export async function updateReceptionistProperties(userId: string, formData: FormData) {
  const supabase = await createClient()
  const propertyIds = formData.getAll('property_ids') as string[]

  await supabase.from('receptionist_properties').delete().eq('user_id', userId)

  if (propertyIds.length > 0) {
    await supabase.from('receptionist_properties').insert(
      propertyIds.map(pid => ({ user_id: userId, property_id: pid }))
    )
  }

  revalidatePath('/admin/usuarios')
  redirect(`/admin/usuarios/${userId}?success=1`)
}
