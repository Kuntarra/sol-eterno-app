'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { requireSuperAdmin } from '@/lib/super'

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg',
}

// Sube el archivo al bucket público 'logos' (vía service role) y guarda la URL
// pública en tenants.logo_url. Devuelve {url} o {error}.
async function subir(tenantId: string, file: File): Promise<{ url?: string; error?: string }> {
  if (file.size > 2_000_000) return { error: 'La imagen supera 2 MB. Usa una más liviana.' }
  const ext = EXT[file.type]
  if (!ext) return { error: 'Formato no soportado. Usa PNG, JPG, WEBP o SVG.' }
  const admin = createAdminClient()
  const path = `tenant-${tenantId}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage.from('logos').upload(path, buf, { contentType: file.type, upsert: true })
  if (error) return { error: error.message }
  const { data } = admin.storage.from('logos').getPublicUrl(path)
  const url = `${data.publicUrl}?v=${Date.now()}`
  await admin.from('tenants').update({ logo_url: url }).eq('id', tenantId)
  return { url }
}

// El admin de la empresa sube el logo de SU empresa.
export async function subirLogo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('user_profiles').select('role, is_super_admin, tenant_id').eq('id', user.id).single()
  if (prof?.role !== 'admin' && !prof?.is_super_admin) redirect('/admin?error=' + encodeURIComponent('Solo la administración puede cambiar el logo.'))
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) redirect('/admin?error=' + encodeURIComponent('Selecciona una imagen.'))
  const tenantId = prof.tenant_id ?? (await getMyTenantId())
  const r = await subir(tenantId, file)
  if (r.error) redirect('/admin?error=' + encodeURIComponent(r.error))
  revalidatePath('/admin', 'layout')
  redirect('/admin?logo=1')
}

// El super admin sube el logo de cualquier empresa desde /super.
export async function subirLogoSuper(tenantId: string, formData: FormData) {
  await requireSuperAdmin()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) redirect(`/super/${tenantId}?error=` + encodeURIComponent('Selecciona una imagen.'))
  const r = await subir(tenantId, file)
  if (r.error) redirect(`/super/${tenantId}?error=` + encodeURIComponent(r.error))
  revalidatePath(`/super/${tenantId}`)
  redirect(`/super/${tenantId}?success=logo`)
}
