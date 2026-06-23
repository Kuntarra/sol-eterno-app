'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_USERS, DEMO_PASSWORD, DEMO_TENANTS } from '@/lib/demo'

const DEMO_TENANT_IDS: string[] = [DEMO_TENANTS.proyecto, DEMO_TENANTS.proveedor]

// Perfil de la sesión actual (real, sin impersonación).
async function currentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('role, is_super_admin, tenant_id')
    .eq('id', user.id)
    .single()
  return data ? { ...data, userId: user.id } : null
}

// El modo demo lo puede usar el super admin o un usuario que YA está en un
// tenant demo (para volver a saltar entre modalidades).
function puedeUsarDemo(p: { is_super_admin: boolean | null; tenant_id: string | null } | null): boolean {
  if (!p) return false
  return !!p.is_super_admin || (p.tenant_id != null && DEMO_TENANT_IDS.includes(p.tenant_id))
}

// Crea (idempotente) los usuarios demo de todas las modalidades.
export async function seedDemoUsers() {
  const p = await currentProfile()
  if (!p?.is_super_admin) redirect('/admin')

  const admin = createAdminClient()
  for (const u of DEMO_USERS) {
    const { data: existing } = await admin.from('user_profiles').select('id').eq('email', u.email).maybeSingle()
    let userId = existing?.id ?? null

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role: u.role, full_name: u.fullName, tenant_id: u.tenantId },
      })
      if (error || !data.user) continue
      userId = data.user.id
    }

    await admin.from('user_profiles').upsert({
      id: userId, role: u.role, full_name: u.fullName, email: u.email, tenant_id: u.tenantId,
    })

    // Permisos por módulo (service-role: tenant_id explícito, el trigger no aplica).
    if (u.modulos?.length) {
      await admin.from('user_modulos').delete().eq('user_id', userId).is('proyecto_id', null)
      await admin.from('user_modulos').insert(
        u.modulos.map((m) => ({ user_id: userId!, modulo: m.modulo, nivel: m.nivel, tenant_id: u.tenantId })),
      )
    }
  }

  revalidatePath('/admin')
  redirect('/admin?demo=sembrado')
}

// Login REAL como un usuario demo (vista 100% fiel: menú + RLS reales).
export async function quickLoginDemo(userId: string) {
  if (!puedeUsarDemo(await currentProfile())) redirect('/admin')

  const admin = createAdminClient()
  const { data: target } = await admin.from('user_profiles').select('email, tenant_id').eq('id', userId).maybeSingle()
  if (!target?.email || !target.tenant_id || !DEMO_TENANT_IDS.includes(target.tenant_id)) redirect('/admin')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: target.email, password: DEMO_PASSWORD })
  if (error) redirect('/admin?demo=error')

  revalidatePath('/', 'layout')
  redirect('/admin')
}

// Salir del modo demo: cierra sesión (la cuenta real del super admin nunca se
// swapea por clave, así que se vuelve a entrar manualmente).
export async function exitDemo() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
