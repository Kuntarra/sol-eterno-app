import { createAdminClient } from '@/lib/supabase/admin'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const ROOM_LABELS: Record<string, string> = {
  single:'Individual', double:'Doble', triple:'Triple', suite:'Suite', shared:'Compartido',
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; empresa?: string }>
}) {
  const params = await searchParams
  const now  = new Date()
  const anio = parseInt(params.anio ?? String(now.getFullYear()))
  const mes  = parseInt(params.mes  ?? String(now.getMonth() + 1))
  const filtroEmpresa = params.empresa ?? 'todas'

  const diasMes = new Date(anio, mes, 0).getDate()
  const desde   = new Date(anio, mes - 1, 1).toISOString()
  const hasta   = new Date(anio, mes, 1).toISOString()

  const admin = createAdminClient()

  // ── Datos ────────────────────────────────────────────────────
  const [{ data: staysRaw }, { data: allocsRaw }, { data: empresasRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name, cities(name))),
      companies(id, name)
    `)
    .lt('checked_in_at', hasta)
    .or(`checked_out_at.is.null,checked_out_at.gte.${desde}`)
    .order('checked_in_at', { ascending: true }),

    admin.from('allocations').select(`
      room_id, company_id,
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `),

    admin.from('companies').select('id, name').eq('active', true).order('name'),
  ])

  const allStays = staysRaw ?? []
  const allAllocs = allocsRaw ?? []

  // Filtrar por empresa si aplica
  const stays = filtroEmpresa === 'todas'
    ? allStays
    : allStays.filter(s => (s.companies as any)?.id === filtroEmpresa)

  const allocs = filtroEmpresa === 'todas'
    ? allAllocs
    : allAllocs.filter(a => (a.companies as any)?.id === filtroEmpresa)

  // ── Cálculo de noches por estadía (solo dentro del mes) ──────
  function noches(s: typeof allStays[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : new Date(hasta)
    const ini = entrada < new Date(desde) ? new Date(desde) : entrada
    const fin = salida  > new Date(hasta) ? new Date(hasta)  : salida
    return Math.max(0, Math.round((fin.getTime() - ini.getTime()) / 86400000))
  }

  // ── Métricas globales ────────────────────────────────────────
  const nochesUsadas    = stays.reduce((acc, s) => acc + noches(s), 0)
  const propiedadesSet  = new Set(allocs.map(a => (a.rooms as any)?.properties?.id).filter(Boolean))
  const nPropiedades    = propiedadesSet.size

  // Camas-noche disponibles = capacidad × días del mes para cada habitación asignada (única)
  const habitacionesAsignadas = new Map<string, number>() // room_id → capacity
  for (const a of allocs) {
    const r = a.rooms as any
    if (r?.id) habitacionesAsignadas.set(r.id, r.capacity ?? 1)
  }
  const camasDisponibles = [...habitacionesAsignadas.values()].reduce((acc, c) => acc + c, 0)
  const camasNocheTotal  = camasDisponibles * diasMes
  const camasNocheLibres = Math.max(0, camasNocheTotal - nochesUsadas)
  const ocupacionPct     = camasNocheTotal > 0
    ? Math.round((nochesUsadas / camasNocheTotal) * 100)
    : 0

  // ── Por propiedad ────────────────────────────────────────────
  const propMap = new Map<string, {
    nombre: string; ciudad: string
    camasNoche: number; nochesUsadas: number; estadias: number
  }>()

  for (const a of allocs) {
    const r = a.rooms as any
    const p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) {
      propMap.set(p.id, { nombre: p.name, ciudad: '', camasNoche: 0, nochesUsadas: 0, estadias: 0 })
    }
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * diasMes
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propMap.has(pid)) {
      propMap.get(pid)!.nochesUsadas += noches(s)
      propMap.get(pid)!.estadias++
    }
  }
  const porPropiedad = [...propMap.values()]
    .map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.nochesUsadas / p.camasNoche) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)

  // ── Por empresa ──────────────────────────────────────────────
  const empMap = new Map<string, { nombre: string; estadias: number; noches: number }>()
  for (const s of stays) {
    const c = s.companies as any
    if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++
    empMap.get(c.id)!.noches += noches(s)
  }
  const porEmpresa = [...empMap.values()].sort((a, b) => b.noches - a.noches)

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const years = [2024, 2025, 2026]
  const circ  = 2 * Math.PI * 54  // circunferencia del gauge (r=54)
  const dash  = (ocupacionPct / 100) * circ

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">

      {/* ── Hero header ── */}
      <div className="bg-[var(--navy)] text-white px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Reporte de ocupación</p>
            <h1 className="text-3xl font-bold">{MONTHS[mes - 1]} {anio}</h1>
            <p className="text-white/60 text-sm mt-1">{diasMes} días · {nPropiedades} propiedad{nPropiedades !== 1 ? 'es' : ''}</p>
          </div>

          {/* Selector */}
          <form method="GET" className="flex flex-wrap gap-2 items-center">
            <select name="empresa" defaultValue={filtroEmpresa}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none">
              <option value="todas">Todas las empresas</option>
              {(empresasRaw ?? []).map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <select name="mes" defaultValue={mes}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none">
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select name="anio" defaultValue={anio}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="submit"
              className="px-5 py-2 bg-[var(--amber)] text-[var(--navy)] text-sm font-bold rounded-lg hover:bg-amber-400 transition-colors">
              Ver
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* ── KPIs + gauge ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Gauge ocupación */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--gray-200)] p-6 flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-widest mb-4">Ocupación del mes</p>
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle cx="60" cy="60" r="54" fill="none"
                  stroke={ocupacionPct >= 80 ? '#059669' : ocupacionPct >= 50 ? '#f59e0b' : '#3b82f6'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--navy)]">{ocupacionPct}%</span>
                <span className="text-xs text-[var(--gray-500)]">ocupado</span>
              </div>
            </div>
            <p className="text-xs text-[var(--gray-500)] mt-4 text-center">
              {nochesUsadas} de {camasNocheTotal} camas-noche utilizadas
            </p>
          </div>

          {/* 4 métricas */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            <MetricCard
              icon="🌙" label="Noches totales" value={nochesUsadas}
              sub={`${camasNocheLibres} noches libres`}
              accent="navy"
            />
            <MetricCard
              icon="🛏️" label="Camas asignadas" value={camasDisponibles}
              sub={`${habitacionesAsignadas.size} habitacion${habitacionesAsignadas.size !== 1 ? 'es' : ''}`}
              accent="amber"
            />
            <MetricCard
              icon="🏨" label="Propiedades" value={nPropiedades}
              sub={`${stays.length} estadías`}
              accent="green"
            />
            <MetricCard
              icon="🏢" label="Empresas" value={porEmpresa.length}
              sub={`${stays.filter(s => !s.checked_out_at).length} huéspedes activos`}
              accent="gray"
            />
          </div>
        </div>

        {/* ── Ocupación por propiedad ── */}
        {porPropiedad.length > 0 && (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6">
            <h2 className="text-sm font-bold text-[var(--navy)] mb-5">Ocupación por propiedad</h2>
            <div className="space-y-4">
              {porPropiedad.map(p => (
                <div key={p.nombre}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--navy)]">{p.nombre}</span>
                    <div className="flex items-center gap-3 text-xs text-[var(--gray-600)]">
                      <span>{p.estadias} estadías · {p.nochesUsadas} noches</span>
                      <span className={`font-bold text-sm ${p.pct >= 80 ? 'text-emerald-600' : p.pct >= 50 ? 'text-amber-600' : 'text-[var(--navy)]'}`}>
                        {p.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-[var(--gray-100)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.pct >= 80 ? 'bg-emerald-500' : p.pct >= 50 ? 'bg-amber-400' : 'bg-[var(--navy)]'}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--gray-400)] mt-1">
                    {p.nochesUsadas} / {p.camasNoche} camas-noche
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Por empresa ── */}
        {porEmpresa.length > 0 && (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--gray-100)]">
              <h2 className="text-sm font-bold text-[var(--navy)]">Resumen por empresa</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Empresa</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Estadías</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Noches</th>
                  <th className="px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Distribución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {porEmpresa.map(e => {
                  const pct = nochesUsadas > 0 ? Math.round((e.noches / nochesUsadas) * 100) : 0
                  return (
                    <tr key={e.nombre} className="hover:bg-[var(--gray-50)]">
                      <td className="px-6 py-3.5 font-medium text-[var(--navy)]">{e.nombre}</td>
                      <td className="px-6 py-3.5 text-right text-[var(--gray-700)]">{e.estadias}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-[var(--navy)]">{e.noches}</td>
                      <td className="px-6 py-3.5 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[var(--gray-100)] rounded-full">
                            <div className="h-full bg-[var(--amber)] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[var(--gray-500)] w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <td className="px-6 py-3 text-xs font-semibold text-[var(--gray-600)]">Total</td>
                  <td className="px-6 py-3 text-right font-bold text-[var(--navy)]">{stays.length}</td>
                  <td className="px-6 py-3 text-right font-bold text-[var(--navy)]">{nochesUsadas}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Listado completo ── */}
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--navy)]">Listado completo de huéspedes</h2>
            <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2.5 py-1 rounded-full font-medium">
              {stays.length} registros
            </span>
          </div>

          {!stays.length ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--gray-500)]">
              No hay estadías para este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                    {['#','Huésped','RUT','Empresa','Propiedad','Hab.','Turno','Entrada','Salida','Noches','Estado'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-[var(--gray-600)] ${i === 9 ? 'text-right' : i === 10 ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {stays.map((stay, idx) => {
                    const g = stay.guests    as any
                    const r = stay.rooms     as any
                    const c = stay.companies as any
                    const n = noches(stay)
                    return (
                      <tr key={stay.id} className="hover:bg-[var(--gray-50)] transition-colors">
                        <td className="px-4 py-3 text-xs text-[var(--gray-400)] font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-[var(--navy)] whitespace-nowrap">
                          {g?.first_name} {g?.last_name_paterno}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--gray-500)] font-mono">{g?.rut ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--gray-700)]">{c?.name}</td>
                        <td className="px-4 py-3 text-[var(--gray-700)]">{r?.properties?.name}</td>
                        <td className="px-4 py-3 text-[var(--gray-600)]">
                          {r?.number}
                          {r?.type ? <span className="text-xs text-[var(--gray-400)] ml-1">· {ROOM_LABELS[r.type] ?? r.type}</span> : ''}
                        </td>
                        <td className="px-4 py-3 text-[var(--gray-600)]">{stay.shift_type ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[var(--gray-700)]">{fmt(stay.checked_in_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[var(--gray-700)]">
                          {stay.checked_out_at ? fmt(stay.checked_out_at) : <span className="text-emerald-600 font-medium">Activo</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-[var(--navy)]">{n}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stay.checked_out_at
                            ? <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">Completada</span>
                            : <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Activa</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <td colSpan={9} className="px-4 py-3 text-xs font-semibold text-[var(--gray-600)]">
                      Total — {stays.length} estadías
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--navy)]">{nochesUsadas}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-[var(--gray-400)]">
            Sol Eterno · Reporte generado el {new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}
          </p>
        </div>

      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: number; sub: string; accent: string
}) {
  const border =
    accent === 'navy'  ? 'border-t-[var(--navy)]' :
    accent === 'amber' ? 'border-t-[var(--amber)]' :
    accent === 'green' ? 'border-t-emerald-500' :
    'border-t-[var(--gray-300)]'

  return (
    <div className={`bg-white rounded-xl border border-[var(--gray-200)] border-t-4 ${border} p-5`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-[var(--navy)] mt-2">{value}</p>
      <p className="text-sm font-medium text-[var(--gray-700)] mt-0.5">{label}</p>
      <p className="text-xs text-[var(--gray-500)] mt-1">{sub}</p>
    </div>
  )
}
