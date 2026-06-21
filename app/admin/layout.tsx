import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTenantId } from '@/lib/tenant'
import { AdminSidebar } from './_components/admin-sidebar'
import { AdminTopBar } from './_components/admin-topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const fullName = profile?.full_name ?? user.email ?? 'Admin'

  // ── Notificaciones derivadas de datos ──────────────────────────
  const admin = createAdminClient()
  const tenantId = await getMyTenantId()
  const nowISO = new Date().toISOString()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const [{ data: overdue }, { count: checkinsHoy }] = await Promise.all([
    admin.from('stays')
      .select('id, estimated_checkout, guests(first_name, last_name_paterno), rooms(number, properties(name))')
      .eq('tenant_id', tenantId)
      .is('checked_out_at', null)
      .not('estimated_checkout', 'is', null)
      .lt('estimated_checkout', nowISO)
      .order('estimated_checkout', { ascending: true })
      .limit(6),
    admin.from('stays').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('checked_in_at', todayStart.toISOString()),
  ])

  const fmtD = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : ''

  const notifications: { title: string; detail: string; href: string; kind: 'alert' | 'info' }[] = []
  if (checkinsHoy) {
    notifications.push({
      kind: 'info',
      title: `${checkinsHoy} check-in${checkinsHoy !== 1 ? 's' : ''} hoy`,
      detail: 'Movimientos registrados en el día',
      href: '/admin/estadias?filter=todas',
    })
  }
  for (const s of overdue ?? []) {
    const g = s.guests as any
    const r = s.rooms as any
    notifications.push({
      kind: 'alert',
      title: `Estadía vencida · ${`${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim() || '—'}`,
      detail: `Hab. ${r?.number ?? '—'}${r?.properties?.name ? ` · ${r.properties.name}` : ''} · checkout est. ${fmtD(s.estimated_checkout)}`,
      href: '/admin/estadias?filter=activas',
    })
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar fullName={fullName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopBar fullName={fullName} notifications={notifications} />
        <main className="flex-1 overflow-auto bg-[var(--gray-100)] pt-16 pb-16 md:pt-0 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
