'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super'

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'operador'
}

// Crea un operador (tenant) nuevo + su primer usuario administrador.
export async function createTenant(formData: FormData) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const name          = (formData.get('name') as string)?.trim()
  const rut           = (formData.get('rut') as string)?.trim() || null
  const contactName   = (formData.get('contact_name') as string)?.trim() || null
  const contactEmail  = (formData.get('contact_email') as string)?.trim() || null
  const contactPhone  = (formData.get('contact_phone') as string)?.trim() || null
  const billingDay    = formData.get('billing_day') ? Number(formData.get('billing_day')) : null
  const monthlyAmount = formData.get('monthly_amount') ? Number(formData.get('monthly_amount')) : null
  const adminEmail    = (formData.get('admin_email') as string)?.trim()
  const adminPassword = (formData.get('admin_password') as string)
  const adminName     = (formData.get('admin_name') as string)?.trim() || contactName || name

  if (!name)        redirect('/super/nuevo?error=' + encodeURIComponent('El nombre del operador es obligatorio.'))
  if (!adminEmail || !adminPassword)
    redirect('/super/nuevo?error=' + encodeURIComponent('El correo y la contraseña del administrador son obligatorios.'))

  // Slug único
  let slug = slugify(name)
  const { data: exists } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  // 1) Crear el tenant
  const { data: tenant, error: tErr } = await admin.from('tenants').insert({
    name, slug, rut, contact_name: contactName, contact_email: contactEmail,
    contact_phone: contactPhone, billing_day: billingDay, monthly_amount: monthlyAmount,
  }).select('id').single()
  if (tErr || !tenant) redirect('/super/nuevo?error=' + encodeURIComponent(tErr?.message ?? 'No se pudo crear el operador.'))

  // 2) Crear su primer usuario administrador (tenant_id viaja en metadata para el trigger)
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true,
    user_metadata: { role: 'admin', full_name: adminName, tenant_id: tenant.id },
  })
  if (uErr || !created.user) {
    // Rollback del tenant si el usuario falla
    await admin.from('tenants').delete().eq('id', tenant.id)
    redirect('/super/nuevo?error=' + encodeURIComponent(uErr?.message ?? 'No se pudo crear el administrador.'))
  }

  await admin.from('user_profiles').upsert({
    id: created.user.id, role: 'admin', full_name: adminName, email: adminEmail, tenant_id: tenant.id,
  })

  revalidatePath('/super')
  redirect('/super?success=creado')
}

// Actualiza datos y facturación de un operador.
export async function updateTenant(id: string, formData: FormData) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const payment = (formData.get('payment_status') as string) || 'al_dia'
  await admin.from('tenants').update({
    name:           (formData.get('name') as string)?.trim(),
    rut:            (formData.get('rut') as string)?.trim() || null,
    contact_name:   (formData.get('contact_name') as string)?.trim() || null,
    contact_email:  (formData.get('contact_email') as string)?.trim() || null,
    contact_phone:  (formData.get('contact_phone') as string)?.trim() || null,
    billing_day:    formData.get('billing_day') ? Number(formData.get('billing_day')) : null,
    monthly_amount: formData.get('monthly_amount') ? Number(formData.get('monthly_amount')) : null,
    payment_status: ['al_dia', 'pendiente', 'moroso'].includes(payment) ? payment : 'al_dia',
    notes:          (formData.get('notes') as string)?.trim() || null,
  }).eq('id', id)

  revalidatePath('/super')
  revalidatePath(`/super/${id}`)
  redirect(`/super/${id}?success=guardado`)
}

// Suspende o reactiva un operador (corta/restaura el acceso de toda su gente).
export async function toggleTenantActive(id: string, active: boolean) {
  await requireSuperAdmin()
  const admin = createAdminClient()
  await admin.from('tenants').update({ active }).eq('id', id)
  revalidatePath('/super')
  revalidatePath(`/super/${id}`)
}

// Marca el cobro del mes como pagado (al día hasta fin del mes en curso).
export async function markTenantPaid(id: string) {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const now = new Date()
  const finDeMes = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  await admin.from('tenants').update({
    payment_status: 'al_dia',
    paid_until: finDeMes.toISOString().slice(0, 10),
  }).eq('id', id)
  revalidatePath('/super')
  revalidatePath(`/super/${id}`)
}
