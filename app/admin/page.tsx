import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function relativeTime(iso: string | null) {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const tod = now.toDateString()
  const yes = new Date(Date.now() - 86400000).toDateString()
  const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === tod) return `Hoy, ${time}`
  if (d.toDateString() === yes) return `Ayer, ${time}`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const now             = new Date()
  const thisMonthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { count: propertiesCount },
    { count: companiesCount },
    { count: activeStaysCount },
    { count: guestsCount },
    { count: checkinsThisMonth },
    { count: checkinsLastMonth },
    { count: guestsThisMonth },
    { count: guestsLastMonth },
    { data: recentCheckins },
    { data: recentCheckouts },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('stays').select('*', { count: 'exact', head: true }).is('checked_out_at', null),
    supabase.from('guests').select('*', { count: 'exact', head: true }),
    supabase.from('stays').select('*', { count: 'exact', head: true }).gte('checked_in_at', thisMonthStart),
    supabase.from('stays').select('*', { count: 'exact', head: true }).gte('checked_in_at', lastMonthStart).lte('checked_in_at', lastMonthEnd),
    supabase.from('guests').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    supabase.from('guests').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    supabase.from('stays')
      .select('id, checked_in_at, guests(first_name, last_name_paterno), rooms(number, properties(name)), companies(name)')
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(4),
    supabase.from('stays')
      .select('id, checked_out_at, guests(first_name, last_name_paterno), rooms(number, properties(name)), companies(name)')
      .not('checked_out_at', 'is', null)
      .order('checked_out_at', { ascending: false })
      .limit(4),
  ])

  // Calcular tendencias
  function trend(current: number | null, previous: number | null): { pct: number; up: boolean; label: string } {
    const c = current ?? 0
    const p = previous ?? 0
    if (p === 0) return { pct: 0, up: true, label: 'Estable' }
    const pct = Math.round(((c - p) / p) * 100)
    return { pct: Math.abs(pct), up: pct >= 0, label: pct === 0 ? 'Estable' : `${pct > 0 ? '+' : ''}${pct}%` }
  }

  const trendCheckins = trend(checkinsThisMonth, checkinsLastMonth)
  const trendGuests   = trend(guestsThisMonth, guestsLastMonth)

  // Combinar actividad reciente
  type Act = {
    id: string
    type: 'checkin' | 'checkout'
    time: string
    guest: string
    company: string
    room: string
    property: string
  }

  const activity: Act[] = [
    ...(recentCheckins ?? []).map(s => {
      const g = s.guests as any
      const r = s.rooms  as any
      const c = s.companies as any
      return {
        id: s.id,
        type: 'checkin' as const,
        time: s.checked_in_at,
        guest: `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim(),
        company: c?.name ?? '',
        room: r?.number ?? '',
        property: r?.properties?.name ?? '',
      }
    }),
    ...(recentCheckouts ?? []).map(s => {
      const g = s.guests as any
      const r = s.rooms  as any
      const c = s.companies as any
      return {
        id: s.id + '-out',
        type: 'checkout' as const,
        time: s.checked_out_at!,
        guest: `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim(),
        company: c?.name ?? '',
        room: r?.number ?? '',
        property: r?.properties?.name ?? '',
      }
    }),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)

  const hora   = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fecha  = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="px-8 py-8 space-y-8">

      {/* ── Saludo ── */}
      <div>
        <span className="section-label">Panel de administración</span>
        <h1 className="text-[1.75rem] font-bold text-[var(--navy)] leading-tight tracking-tight">{saludo}</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1 capitalize">
          Resumen operativo de hoy, {fecha}.
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Propiedades activas"
          value={propertiesCount ?? 0}
          href="/admin/propiedades"
          color="navy"
          trendLabel="Estable"
          trendUp={true}
          icon={<BuildingIcon />}
        />
        <KpiCard
          label="Empresas clientes"
          value={companiesCount ?? 0}
          href="/admin/clientes"
          color="amber"
          trendLabel="Estable"
          trendUp={true}
          icon={<BriefcaseIcon />}
        />
        <KpiCard
          label="Huéspedes activos"
          value={activeStaysCount ?? 0}
          href="/admin/estadias?filter=activas"
          color="green"
          trendLabel={trendCheckins.label}
          trendUp={trendCheckins.up}
          icon={<UsersIcon />}
        />
        <KpiCard
          label="Personas registradas"
          value={guestsCount ?? 0}
          href="/admin/estadias?filter=todas"
          color="neutral"
          trendLabel={trendGuests.label}
          trendUp={trendGuests.up}
          icon={<PersonIcon />}
        />
      </div>

      {/* ── Cuerpo en dos columnas ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Acciones rápidas */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[var(--gray-200)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="section-label !mb-0">Acciones rápidas</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amber)"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/admin/propiedades/nueva" label="Nueva propiedad"    icon={<BuildingIcon />} />
            <QuickLink href="/admin/clientes/nuevo"    label="Nuevo cliente"      icon={<BriefcaseIcon />} />
            <QuickLink href="/admin/usuarios"          label="Gestionar usuarios" icon={<UsersIcon />} />
            <QuickLink href="/admin/estadias"          label="Gestionar estadías" icon={<CalendarIcon />} />
          </div>

          {/* Estado del sistema */}
          <div className="mt-5 rounded-xl bg-[var(--navy)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amber)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-xs font-semibold leading-tight">Estado del sistema</p>
                <p className="text-white/50 text-[11px] mt-1 leading-snug">
                  Sistema operativo · {now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
            <div>
              <span className="section-label !mb-0">Actividad reciente</span>
              <p className="text-[11px] text-[var(--gray-500)] mt-0.5">Últimos movimientos registrados</p>
            </div>
            <Link href="/admin/estadias" className="text-xs text-[var(--navy)] font-semibold hover:underline">
              Ver todo →
            </Link>
          </div>

          {!activity.length ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-[var(--gray-500)]">Sin actividad reciente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-100)]">
                    <th className="text-left px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gray-500)]">Acción</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gray-500)]">Huésped</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gray-500)]">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gray-500)]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {activity.map(act => (
                    <tr key={act.id} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                            ${act.type === 'checkin' ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--gray-100)] text-[var(--gray-500)]'}`}>
                            {act.type === 'checkin' ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--navy)] truncate">
                              {act.type === 'checkin' ? 'Nueva estadía' : 'Checkout'}
                            </p>
                            <p className="text-[10px] text-[var(--gray-500)] truncate">
                              Hab. {act.room}{act.property ? ` · ${act.property}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-[var(--navy)] truncate max-w-[120px]">{act.guest}</p>
                        {act.company && <p className="text-[10px] text-[var(--gray-500)] truncate max-w-[120px]">{act.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--gray-500)] whitespace-nowrap">
                        {relativeTime(act.time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${act.type === 'checkin' ? 'badge-green' : 'badge-gray'}`}>
                          {act.type === 'checkin' ? 'Alojado' : 'Salió'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── KPI Card ── */
function KpiCard({ label, value, href, color, trendLabel, trendUp, icon }: {
  label: string; value: number; href: string; color: string
  trendLabel: string; trendUp: boolean; icon: React.ReactNode
}) {
  const num     = color === 'green' ? 'text-emerald-600' : color === 'amber' ? 'text-[var(--amber-dark)]' : color === 'navy' ? 'text-[var(--navy)]' : 'text-[var(--gray-700)]'
  const iconBg  = color === 'green' ? 'bg-emerald-50 text-emerald-600' : color === 'amber' ? 'bg-[var(--amber)]/10 text-[var(--amber-dark)]' : color === 'navy' ? 'bg-[var(--navy-5)] text-[var(--navy)]' : 'bg-[var(--gray-100)] text-[var(--gray-600)]'
  const isStable = trendLabel === 'Estable'
  const trendColor = isStable ? 'text-[var(--gray-500)] bg-[var(--gray-100)]' : trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'

  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-[var(--gray-200)] p-5
                 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]
                 hover:-translate-y-0.5 transition-all duration-200 group block">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trendColor}`}>
          {!isStable && (trendUp ? '↑ ' : '↓ ')}{trendLabel}
        </span>
      </div>
      <p className={`text-[2.5rem] font-black leading-none data-number ${num}`}>
        {value.toLocaleString('es-CL')}
      </p>
      <p className="text-sm font-medium text-[var(--navy)] mt-2 group-hover:text-[var(--navy-light)] transition-colors leading-snug">
        {label}
      </p>
    </Link>
  )
}

/* ── Quick Link ── */
function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href}
      className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[var(--gray-200)]
                 hover:border-[var(--navy)]/20 hover:bg-[var(--navy-5)]
                 hover:-translate-y-px transition-all duration-150 group text-center">
      <div className="w-9 h-9 rounded-xl bg-[var(--gray-100)] group-hover:bg-[var(--navy)] group-hover:text-white
                      flex items-center justify-center text-[var(--navy)] transition-all duration-150">
        {icon}
      </div>
      <p className="text-xs font-semibold text-[var(--navy)] leading-tight">{label}</p>
    </Link>
  )
}

const BuildingIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6"/></svg>
const BriefcaseIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
const UsersIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const PersonIcon    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const CalendarIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
