'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendDigest } from '@/lib/email/digest'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')
  return supabase
}

export async function addRecipient(formData: FormData) {
  const supabase = await requireAdmin()
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const name  = ((formData.get('name') as string) ?? '').trim() || null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect('/admin/notificaciones?error=' + encodeURIComponent('Correo inválido.'))
  }
  const { error } = await supabase.from('digest_recipients').insert({ email, name })
  if (error) redirect('/admin/notificaciones?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/notificaciones')
  redirect('/admin/notificaciones?ok=' + encodeURIComponent('Destinatario agregado.'))
}

export async function toggleRecipient(id: string, active: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('digest_recipients').update({ active }).eq('id', id)
  revalidatePath('/admin/notificaciones')
}

export async function deleteRecipient(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('digest_recipients').delete().eq('id', id)
  revalidatePath('/admin/notificaciones')
}

export async function sendTestNow() {
  await requireAdmin()
  const result = await sendDigest()
  if (result.ok) {
    redirect('/admin/notificaciones?ok=' + encodeURIComponent(`Resumen enviado a ${result.sent} destinatario(s).`))
  }
  redirect('/admin/notificaciones?error=' + encodeURIComponent(result.reason ?? 'No se pudo enviar.'))
}
