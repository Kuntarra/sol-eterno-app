'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createAllocation(companyId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('allocations').insert({
    company_id: companyId,
    room_id:    formData.get('room_id') as string,
    start_date: formData.get('start_date') as string,
    end_date:   (formData.get('end_date') as string) || null,
    created_by: user?.id,
  })

  if (error) redirect(`/admin/clientes/${companyId}?error=` + encodeURIComponent(error.message))

  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#asignaciones`)
}

export async function deleteAllocation(allocationId: string, companyId: string) {
  const supabase = await createClient()
  await supabase.from('allocations').delete().eq('id', allocationId)
  revalidatePath(`/admin/clientes/${companyId}`)
  redirect(`/admin/clientes/${companyId}#asignaciones`)
}
