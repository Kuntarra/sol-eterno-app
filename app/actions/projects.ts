'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProject(companyId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('projects').insert({
    company_id:  companyId,
    name:        formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    active:      true,
  })

  if (error) redirect(`/admin/clientes/${companyId}?error=` + encodeURIComponent(error.message))

  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#proyectos`)
}

export async function toggleProjectActive(projectId: string, companyId: string, active: boolean) {
  const supabase = await createClient()
  await supabase.from('projects').update({ active }).eq('id', projectId)
  revalidatePath(`/admin/clientes/${companyId}`)
}

export async function deleteProject(projectId: string, companyId: string) {
  const supabase = await createClient()
  await supabase.from('projects').delete().eq('id', projectId)
  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#proyectos`)
}
