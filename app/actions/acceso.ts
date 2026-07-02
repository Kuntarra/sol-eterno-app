'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { MODULO_KEYS } from '@/lib/modulos'
import { requireTitular } from '@/lib/rbac'
import { registrarActividad } from './_log'

// Crea el login (correo/clave) ligado a la ficha persona.
// Alta de usuarios: solo el Titular (hoy, todo admin existente ya lo es).
export async function crearAccesoPersona(personaId: string, formData: FormData) {
  await requireTitular()
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

  await registrarActividad('acceso', personaId, 'crear', { email })

  revalidatePath(back)
  redirect(back + '?success=acceso')
}

// Guarda los permisos por módulo (checkbox + nivel) del login de la persona.
// Baja/ajuste de accesos: solo el Titular.
export async function guardarPermisos(personaId: string, formData: FormData) {
  await requireTitular()
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

  await registrarActividad('acceso', personaId, 'editar_permisos', {
    modulos: filas.map((f) => ({ modulo: f.modulo, nivel: f.nivel })),
  })

  revalidatePath(back)
  redirect(back + '?success=permisos')
}

// Marca el rol de cuenta de un usuario: Titular, Planificador y el opt-in
// ve_costos. Solo el Titular puede tocar estos flags (evita que un
// planificador se auto-ascienda).
export async function actualizarRolCuenta(userId: string, formData: FormData) {
  await requireTitular()
  const supabase = await createClient()
  const nuevos = {
    es_titular: formData.get('es_titular') === 'on',
    es_planificador: formData.get('es_planificador') === 'on',
    ve_costos: formData.get('ve_costos') === 'on',
  }
  const { error } = await supabase
    .from('user_profiles')
    .update(nuevos)
    .eq('id', userId)
    .eq('tenant_id', await getMyTenantId())
  if (error) redirect('/admin/roles?error=' + encodeURIComponent(error.message))
  await registrarActividad('acceso', userId, 'cambiar_rol', nuevos)
  revalidatePath('/admin/roles')
  redirect('/admin/roles?success=rol')
}
