'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSubscription, type Subscription } from '@/lib/email/digest'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')
  return supabase
}

const back = (q: string) => redirect('/admin/notificaciones?' + q)

export async function addSubscription(formData: FormData) {
  const supabase = await requireAdmin()

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const name  = ((formData.get('name') as string) ?? '').trim() || null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back('error=' + encodeURIComponent('Correo inválido.'))

  const scope_type = (formData.get('scope_type') as string) || 'all'
  const report_type = (formData.get('report_type') as string) === 'full' ? 'full' : 'movements'
  const company_id = scope_type === 'company' ? ((formData.get('company_id') as string) || null) : null
  const project_id = scope_type === 'project' ? ((formData.get('project_id') as string) || null) : null
  const property_ids = scope_type === 'property' ? (formData.getAll('property_ids') as string[]) : null
  const frequency = (formData.get('frequency') as string) || 'daily'
  const weekdays = frequency === 'weekly' ? (formData.getAll('weekdays') as string[]).map(Number) : null
  const monthday = frequency === 'monthly' ? Number(formData.get('monthday') || 1) : null
  const send_hour = Number(formData.get('send_hour') || 8)

  if (scope_type === 'company' && !company_id) back('error=' + encodeURIComponent('Selecciona una empresa.'))
  if (scope_type === 'project' && !project_id) back('error=' + encodeURIComponent('Selecciona un proyecto.'))
  if (scope_type === 'property' && (!property_ids || property_ids.length === 0)) back('error=' + encodeURIComponent('Selecciona al menos una propiedad.'))
  if (frequency === 'weekly' && (!weekdays || weekdays.length === 0)) back('error=' + encodeURIComponent('Selecciona al menos un día de la semana.'))

  const { error } = await supabase.from('report_subscriptions').insert({
    email, name, scope_type, report_type, company_id, project_id, property_ids, frequency, weekdays, monthday, send_hour,
  })
  if (error) back('error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/notificaciones')
  back('ok=' + encodeURIComponent('Suscripción creada.'))
}

export async function toggleSubscription(id: string, active: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('report_subscriptions').update({ active }).eq('id', id)
  revalidatePath('/admin/notificaciones')
}

export async function deleteSubscription(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('report_subscriptions').delete().eq('id', id)
  revalidatePath('/admin/notificaciones')
}

export async function sendTestSubscription(id: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: sub } = await admin.from('report_subscriptions').select('*').eq('id', id).single()
  if (!sub) back('error=' + encodeURIComponent('Suscripción no encontrada.'))
  const res = await sendSubscription(sub as Subscription, { test: true })
  if (res.ok) back('ok=' + encodeURIComponent(`Prueba enviada a ${(sub as Subscription).email}.`))
  back('error=' + encodeURIComponent(res.reason ?? 'No se pudo enviar.'))
}
