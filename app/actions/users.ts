'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createReceptionist(formData: FormData) {
  const adminClient = createAdminClient()

  const email       = formData.get('email') as string
  const password    = formData.get('password') as string
  const fullName    = formData.get('full_name') as string
  const propertyIds = formData.getAll('property_ids') as string[]

  // 1. Crear usuario en auth
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'receptionist', full_name: fullName },
  })

  if (error) redirect('/admin/usuarios/nuevo-recepcionista?error=' + encodeURIComponent(error.message))

  const userId = data.user.id

  // 2. Crear perfil explícitamente (no dependemos solo del trigger)
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert({ id: userId, role: 'receptionist', full_name: fullName, email })

  if (profileError) redirect('/admin/usuarios/nuevo-recepcionista?error=' + encodeURIComponent(profileError.message))

  // 3. Asignar propiedades
  if (propertyIds.length > 0) {
    await adminClient.from('receptionist_properties').insert(
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

  // 1. Crear usuario en auth
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'client', full_name: fullName },
  })

  if (error) redirect('/admin/usuarios/nuevo-cliente?error=' + encodeURIComponent(error.message))

  const userId = data.user.id

  // 2. Crear perfil explícitamente con empresa
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert({ id: userId, role: 'client', full_name: fullName, email, company_id: companyId })

  if (profileError) redirect('/admin/usuarios/nuevo-cliente?error=' + encodeURIComponent(profileError.message))

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
  const adminClient = createAdminClient()
  const propertyIds = formData.getAll('property_ids') as string[]

  await adminClient.from('receptionist_properties').delete().eq('user_id', userId)

  if (propertyIds.length > 0) {
    await adminClient.from('receptionist_properties').insert(
      propertyIds.map(pid => ({ user_id: userId, property_id: pid }))
    )
  }

  revalidatePath('/admin/usuarios')
  redirect(`/admin/usuarios/${userId}?success=1`)
}
