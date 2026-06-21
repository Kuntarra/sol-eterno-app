import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { RecepcionSidebar } from './_components/recepcion-sidebar'
import { stopImpersonate } from '@/app/actions/impersonate'

export default async function RecepcionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = adminProfile?.role === 'admin'

  // Verificar si el admin está impersonando a un recepcionista
  const cookieStore = await cookies()
  const impersonateId = isAdmin ? cookieStore.get('sol_impersonate')?.value : null

  // Determinar qué usuario usar para los datos
  const targetUserId   = impersonateId ?? user.id
  const targetIsAdmin  = !impersonateId && isAdmin

  if (!targetIsAdmin && adminProfile?.role !== 'receptionist' && !impersonateId) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()

  // Perfil del usuario objetivo
  const { data: targetProfile } = impersonateId
    ? await admin.from('user_profiles').select('role, full_name').eq('id', targetUserId).eq('tenant_id', tenantId).single()
    : { data: adminProfile }

  if (!impersonateId && adminProfile?.role !== 'receptionist' && adminProfile?.role !== 'admin') {
    redirect('/login')
  }

  // Propiedades asignadas al usuario objetivo
  const { data: rpRows } = await admin
    .from('receptionist_properties')
    .select('properties(name, cities(name))')
    .eq('user_id', targetUserId)
    .eq('tenant_id', tenantId)

  const properties = (rpRows ?? []).map(row => {
    const p = row.properties as unknown as { name: string; cities: { name: string } | null } | null
    return { name: p?.name ?? '', city: p?.cities?.name ?? '' }
  }).filter(p => p.name)

  return (
    <div className="flex min-h-screen">
      {/* Banner de impersonación */}
      {impersonateId && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-[var(--navy)] px-4 py-1.5 flex items-center justify-between text-xs font-semibold">
          <span>
            👁 Viendo como: <strong>{targetProfile?.full_name ?? 'Recepcionista'}</strong>
          </span>
          <form action={stopImpersonate}>
            <button type="submit" className="underline hover:no-underline">
              Volver a admin →
            </button>
          </form>
        </div>
      )}
      <RecepcionSidebar
        fullName={targetProfile?.full_name ?? 'Recepcionista'}
        properties={properties}
        impersonating={!!impersonateId}
      />
      <main className={`flex-1 overflow-auto bg-[var(--gray-100)] min-w-0 px-5 sm:px-8 pb-28 md:pb-8 ${impersonateId ? 'pt-28 md:pt-8' : 'pt-20 md:pt-8'}`}>
        {children}
      </main>
    </div>
  )
}
