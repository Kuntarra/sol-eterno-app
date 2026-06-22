'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function assignModulo(formData: FormData) {
  const supabase = await createClient()
  const userId = formData.get('user_id') as string
  const modulo = formData.get('modulo') as string
  const nivel = (formData.get('nivel') as string) || 'visor'
  const proyectoId = (formData.get('proyecto_id') as string) || null
  if (!userId || !modulo) redirect('/admin/roles?error=' + encodeURIComponent('Faltan datos.'))

  const { error } = await supabase.from('user_modulos').upsert(
    { user_id: userId, modulo, nivel, proyecto_id: proyectoId },
    { onConflict: 'user_id,modulo,proyecto_id' }
  )
  if (error) redirect('/admin/roles?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/roles')
  redirect('/admin/roles?success=1')
}

export async function removeModulo(id: string) {
  const supabase = await createClient()
  await supabase.from('user_modulos').delete().eq('id', id)
  revalidatePath('/admin/roles')
}
