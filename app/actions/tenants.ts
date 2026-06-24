'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super'
import { MODULO_KEYS } from '@/lib/modulos'

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'operador'
}

// Cupo de personas: entero entre 1 y 10.000 (tope duro del sistema).
function clampLimite(raw: FormDataEntryValue | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 100
  return Math.min(10000, Math.max(1, Math.round(n)))
}

export type CrearOperadorResult = { error?: string } | null

// Traduce los errores de Supabase Auth a mensajes claros en español.
function traducirErrorAuth(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('already been registered') || m.includes('already registered') || m.includes('already exists'))
    return 'Ya existe un usuario con ese correo. Usa otro correo, o revisa si este operador ya fue creado.'
  if (m.includes('password')) return 'La contraseña no es válida (mínimo 6 caracteres).'
  if (m.includes('email') && m.includes('invalid')) return 'El correo del administrador no es válido.'
  return 'No se pudo crear el administrador. Revisa los datos e inténtalo de nuevo.'
}

// Crea un operador (tenant) nuevo + su primer usuario administrador.
// Usada con useActionState: devuelve { error } SIN recargar (preserva el
// formulario); en éxito redirige al panel.
export async function createTenant(_prev: CrearOperadorResult, formData: FormData): Promise<CrearOperadorResult> {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const name          = (formData.get('name') as string)?.trim()
  const rut           = (formData.get('rut') as string)?.trim() || null
  const contactPhone  = (formData.get('contact_phone') as string)?.trim() || null
  const billingDay    = formData.get('billing_day') ? Number(formData.get('billing_day')) : null
  const monthlyAmount = formData.get('monthly_amount') ? Number(formData.get('monthly_amount')) : null
  const limitePersonas = clampLimite(formData.get('limite_personas'))
  const adminEmail    = (formData.get('admin_email') as string)?.trim().toLowerCase()
  const adminPassword = (formData.get('admin_password') as string)
  const adminName     = (formData.get('admin_name') as string)?.trim() || name
  // El contacto suele ser la misma persona del administrador: si se deja en
  // blanco, se hereda del administrador (evita duplicar el dato).
  const contactName   = (formData.get('contact_name') as string)?.trim() || adminName || null
  const contactEmail  = (formData.get('contact_email') as string)?.trim() || adminEmail || null

  if (!name) return { error: 'El nombre del operador es obligatorio.' }
  if (!adminEmail || !adminPassword)
    return { error: 'El correo y la contraseña del administrador son obligatorios.' }
  if (adminPassword.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  // Pre-chequeo: ¿ya existe un usuario con ese correo? (evita crear y revertir)
  const { data: yaExiste } = await admin.from('user_profiles').select('id').eq('email', adminEmail).maybeSingle()
  if (yaExiste) return { error: 'Ya existe un usuario con ese correo. Usa otro correo, o revisa si este operador ya fue creado.' }

  // Slug único
  let slug = slugify(name)
  const { data: exists } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  // 1) Crear el tenant
  const { data: tenant, error: tErr } = await admin.from('tenants').insert({
    name, slug, rut, contact_name: contactName, contact_email: contactEmail,
    contact_phone: contactPhone, billing_day: billingDay, monthly_amount: monthlyAmount,
    limite_personas: limitePersonas,
  }).select('id').single()
  if (tErr || !tenant) return { error: 'No se pudo crear el operador. Inténtalo de nuevo.' }

  // 2) Crear su primer usuario administrador (tenant_id viaja en metadata para el trigger)
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true,
    user_metadata: { role: 'admin', full_name: adminName, tenant_id: tenant.id },
  })
  if (uErr || !created.user) {
    // Rollback del tenant si el usuario falla (no dejar operador huérfano)
    await admin.from('tenants').delete().eq('id', tenant.id)
    return { error: traducirErrorAuth(uErr?.message ?? '') }
  }

  await admin.from('user_profiles').upsert({
    id: created.user.id, role: 'admin', full_name: adminName, email: adminEmail, tenant_id: tenant.id,
  })

  // Por defecto la empresa nace con todos los módulos activos; el super-admin
  // los ajusta luego (y elige tipo proveedor) en la ficha de la empresa.
  await admin.from('tenant_modulos').insert(
    MODULO_KEYS.map((m) => ({ tenant_id: tenant.id, modulo: m, activo: true })),
  )

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
    limite_personas: formData.get('limite_personas') != null ? clampLimite(formData.get('limite_personas')) : undefined,
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

// Guarda el TIPO de empresa (empresa_proyecto | proveedor) y los MÓDULOS
// contratados. Define qué ve el admin de esa empresa (y sus sub-usuarios).
export async function updateTenantModulos(id: string, formData: FormData) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const tipo = (formData.get('tipo') as string) || 'empresa_proyecto'
  await admin.from('tenants')
    .update({ tipo: ['empresa_proyecto', 'proveedor'].includes(tipo) ? tipo : 'empresa_proyecto' })
    .eq('id', id)

  // Upsert por módulo: marcado = activo, desmarcado = inactivo (no se borra,
  // así conserva historial/configuración del módulo si vuelve a activarse).
  const rows = MODULO_KEYS.map((m) => ({
    tenant_id: id,
    modulo: m,
    activo: formData.get(`mod_${m}`) === 'on',
  }))
  await admin.from('tenant_modulos').upsert(rows, { onConflict: 'tenant_id,modulo' })

  revalidatePath('/super')
  revalidatePath(`/super/${id}`)
  redirect(`/super/${id}?success=modulos`)
}

// Convierte un Invitado en SOCIO (cliente pleno): le fija el plan (cupo, monto,
// día de cobro), deja de ser invitado y todos sus vínculos pasan de stub→activo
// (= ★ Socio Dotia para los Mandantes). Es el cierre del embudo.
export async function convertirEnSocio(id: string, formData: FormData) {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const patch: Record<string, unknown> = {
    es_invitado: false,
    solicito_socio_at: null,
    payment_status: 'al_dia',
    monthly_amount: formData.get('monthly_amount') ? Number(formData.get('monthly_amount')) : null,
    billing_day: formData.get('billing_day') ? Number(formData.get('billing_day')) : null,
  }
  if (formData.get('limite_personas') != null) patch.limite_personas = clampLimite(formData.get('limite_personas'))
  await admin.from('tenants').update(patch as never).eq('id', id)
  await admin.from('proyecto_proveedores').update({ estado: 'activo' }).eq('tenant_proveedor_id', id).eq('estado', 'stub')
  revalidatePath('/super')
  revalidatePath(`/super/${id}`)
  redirect(`/super/${id}?success=socio`)
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
