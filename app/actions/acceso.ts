'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { MODULO_KEYS } from '@/lib/modulos'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') redirect('/admin')
}

// Crea el login (correo/clave) ligado a la ficha persona.
export async function crearAccesoPersona(personaId: string, formData: FormData) {
  await requireAdmin()
  const back = `/admin/personal/${personaId}`
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = (formData.get('password') as string) || ''
  if (!email || password.length < 6) {
    redirect(back + '?error=' + encodeURIComponent('Ingresa un correo y una clave de al menos 6 caracteres.'))
  }

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const { data: p } = await admin.from('personas').select('nombres, apellido_paterno').eq('id', personaId).maybeSingle()
  const fullName = p ? `${p.nombres} ${p.apellido_paterno}` : email

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'modulo', full_name: fullName, tenant_id: tenantId, persona_id: personaId },
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))

  revalidatePath(back)
  redirect(back + '?success=acceso')
}

// Guarda los permisos por módulo (checkbox + nivel) del login de la persona.
export async function guardarPermisos(personaId: string, formData: FormData) {
  await requireAdmin()
  const back = `/admin/personal/${personaId}`
  const supabase = await createClient()

  const { data: prof } = await supabase.from('user_profiles').select('id').eq('persona_id', personaId).maybeSingle()
  if (!prof) redirect(back + '?error=' + encodeURIComponent('Primero crea el acceso de la persona.'))
  const userId = prof.id

  // Reemplaza en bloque las asignaciones de alcance general (proyecto nulo):
  // un solo DELETE de todos los módulos + un solo INSERT de los marcados,
  // en vez de un par de viajes a la base por cada módulo.
  await supabase
    .from('user_modulos')
    .delete()
    .eq('user_id', userId)
    .is('proyecto_id', null)
    .in('modulo', [...MODULO_KEYS])

  const filas = MODULO_KEYS.filter((m) => formData.get(`mod_${m}`) === 'on').map((m) => ({
    user_id: userId,
    modulo: m,
    nivel: (formData.get(`nivel_${m}`) as string) || 'visor',
  }))
  if (filas.length) {
    await supabase.from('user_modulos').insert(filas)
  }

  revalidatePath(back)
  redirect(back + '?success=permisos')
}
