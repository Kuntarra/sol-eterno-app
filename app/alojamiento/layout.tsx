import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { ClientSidebar } from './_components/client-sidebar'
import { stopImpersonate } from '@/app/actions/impersonate'

export default async function AlojamientoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = adminProfile?.role === 'admin'

  const cookieStore = await cookies()
  const impersonateId = isAdmin ? cookieStore.get('sol_impersonate')?.value : null
  const targetId = impersonateId ?? user.id

  if (!isAdmin && adminProfile?.role !== 'client') redirect('/login')

  const admin = createAdminClient()
  const tenantId = await getMyTenantId()

  const { data: targetProfile } = impersonateId
    ? await admin.from('user_profiles').select('role, full_name, company_id').eq('id', targetId).eq('tenant_id', tenantId).single()
    : await supabase.from('user_profiles').select('role, full_name, company_id').eq('id', targetId).single()

  const companyId = (targetProfile as any)?.company_id

  const { data: company } = companyId
    ? await admin.from('companies').select('name').eq('id', companyId).eq('tenant_id', tenantId).single()
    : { data: null }

  return (
    <div className="flex min-h-screen">
      {impersonateId && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-[var(--ink)] px-4 py-1.5 flex items-center justify-between text-xs font-semibold">
          <span>👁 Viendo como: <strong>{targetProfile?.full_name ?? 'Cliente'}</strong> — {company?.name}</span>
          <form action={stopImpersonate}>
            <button type="submit" className="underline hover:no-underline">Volver a admin →</button>
          </form>
        </div>
      )}
      <ClientSidebar
        companyName={company?.name ?? 'Mi empresa'}
        fullName={targetProfile?.full_name ?? user.email ?? 'Cliente'}
        impersonating={!!impersonateId}
      />
      <main className={`flex-1 overflow-auto bg-[var(--gray-100)] min-w-0 px-5 sm:px-8 pb-24 md:pb-8 ${impersonateId ? 'pt-24 md:pt-10' : 'pt-20 md:pt-8'}`}>
        {children}
      </main>
    </div>
  )
}
