import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { SearchBar } from './_components/search-bar'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function EstadiasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; filter?: string; q?: string }>
}) {
  const params = await searchParams
  const q      = params.q?.trim() ?? ''
  const filter = q ? 'todas' : (params.filter ?? 'activas')

  const supabase = await createClient()
  const admin    = createAdminClient()

  // Mini KPIs: check-ins hoy y activos totales
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)

  const [
    { count: checkinsHoy },
    { count: checkinsAyer },
    { count: totalActivos },
  ] = await Promise.all([
    supabase.from('stays').select('*', { count: 'exact', head: true }).gte('checked_in_at', todayStart.toISOString()),
    supabase.from('stays').select('*', { count: 'exact', head: true }).gte('checked_in_at', yesterdayStart.toISOString()).lt('checked_in_at', todayStart.toISOString()),
    supabase.from('stays').select('*', { count: 'exact', head: true }).is('checked_out_at', null),
  ])

  const diffCheckins = (checkinsHoy ?? 0) - (checkinsAyer ?? 0)

  // Ocupación: total camas de todas las allocations
  const { data: allocsData } = await supabase.from('allocations').select('rooms(capacity)')
  const totalCamas = (allocsData ?? []).reduce((sum, a) => {
    const r = a.rooms as unknown as { capacity: number } | null
    return sum + (r?.capacity ?? 0)
  }, 0)
  const ocupacionPct = totalCamas > 0
    ? Math.min(100, Math.round(((totalActivos ?? 0) / totalCamas) * 100))
    : 0

  // Si hay búsqueda, primero encontrar guest_ids que coincidan
  let guestIds: string[] | null = null
  if (q) {
    const { data: guests } = await admin
      .from('guests')
      .select('id')
      .or(`first_name.ilike.%${q}%,last_name_paterno.ilike.%${q}%,rut.ilike.%${q}%`)
      .limit(200)

    guestIds = (guests ?? []).map(g => g.id)
  }

  // Construir query de estadías
  let query = supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at, estimated_checkout, notes,
      guests(id, first_name, last_name_paterno, rut, phone),
      rooms(number, type, properties(name)),
      companies(name)
    `)
    .order('checked_in_at', { ascending: false })
    .limit(200)

  if (guestIds !== null) {
    if (guestIds.length === 0) {
      // Búsqueda sin resultados — forzar vacío
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('guest_id', guestIds)
    }
  } else {
    // Sin búsqueda: aplicar filtro de estado
    if (filter === 'activas')     query = query.is('checked_out_at', null)
    else if (filter === 'completadas') query = query.not('checked_out_at', 'is', null)
  }

  const { data: stays } = await query

  const FILTER_LABELS = { activas: 'Activas', completadas: 'Completadas', todas: 'Todas' }

  return (
    <div>
      {/* ── Header + mini KPIs ── */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span className="section-label">Registros</span>
            <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Estadías</h1>
            <p className="text-sm text-[var(--gray-600)] mt-1">Gestión y corrección de registros</p>
          </div>
          <div className="flex gap-4 shrink-0">
            {/* Check-ins hoy */}
            <div className="bg-white rounded-xl border border-[var(--gray-200)] px-5 py-3.5 shadow-[var(--shadow-xs)] min-w-[130px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gray-500)] mb-1">Check-ins hoy</p>
              <p className="font-display text-[1.9rem] font-semibold text-[var(--navy)] leading-none data-number">{checkinsHoy ?? 0}</p>
              {diffCheckins !== 0 && (
                <p className={`text-[11px] mt-1 font-medium ${diffCheckins > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {diffCheckins > 0 ? `+${diffCheckins}` : diffCheckins} vs ayer
                </p>
              )}
            </div>
            {/* Ocupación */}
            <div className="bg-white rounded-xl border border-[var(--gray-200)] px-5 py-3.5 shadow-[var(--shadow-xs)] min-w-[150px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gray-500)] mb-1">Ocupación</p>
              <p className={`font-display text-[1.9rem] font-semibold leading-none data-number ${ocupacionPct >= 80 ? 'text-emerald-600' : ocupacionPct >= 50 ? 'text-[var(--amber-dark)]' : 'text-[var(--navy)]'}`}>
                {ocupacionPct}%
              </p>
              <div className="mt-2 h-1.5 bg-[var(--gray-100)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ocupacionPct >= 80 ? 'bg-emerald-500' : ocupacionPct >= 50 ? 'bg-[var(--amber)]' : 'bg-[var(--navy)]'}`}
                  style={{ width: `${ocupacionPct}%` }}
                />
              </div>
              <p className="text-[11px] mt-1 text-[var(--gray-500)]">{totalActivos ?? 0} de {totalCamas} camas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8">

      {params.success === '1' && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Estadía actualizada correctamente.
        </div>
      )}

      {/* Buscador + filtros + acciones */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchBar defaultValue={q || undefined} />

        {!q && (
          <div className="flex gap-1.5 bg-white border border-[var(--gray-200)] rounded-xl p-1">
            {(['activas', 'completadas', 'todas'] as const).map(f => (
              <Link key={f} href={`/admin/estadias?filter=${f}`}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-[var(--navy)] text-white shadow-[var(--shadow-xs)]'
                    : 'text-[var(--gray-600)] hover:text-[var(--navy)] hover:bg-[var(--gray-50)]'
                }`}>
                {FILTER_LABELS[f]}
              </Link>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--gray-200)]
                             bg-white text-[var(--gray-600)] text-xs font-semibold hover:border-[var(--navy)]/30
                             hover:text-[var(--navy)] transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
            </svg>
            Filtros
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--gray-200)]
                             bg-white text-[var(--gray-600)] text-xs font-semibold hover:border-[var(--navy)]/30
                             hover:text-[var(--navy)] transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar
          </button>
        </div>

        {q && (
          <p className="text-sm text-[var(--gray-600)]">
            {stays?.length ?? 0} resultado{stays?.length !== 1 ? 's' : ''} para
            <span className="font-semibold text-[var(--navy)] ml-1">"{q}"</span>
          </p>
        )}
      </div>

      {!stays?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">
            {q
              ? `No se encontró ningún huésped con "${q}".`
              : 'No hay estadías en esta categoría.'}
          </p>
          {q && (
            <Link href="/admin/estadias" className="mt-3 inline-block text-sm text-[var(--navy)] font-medium hover:underline">
              Ver todas las estadías
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-xs)]">
          <div className="px-5 py-3.5 border-b border-[var(--gray-100)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--gray-600)]">
              {stays.length} registro{stays.length !== 1 ? 's' : ''}
              {!q && <span className="text-[var(--gray-400)] font-normal"> · {FILTER_LABELS[filter as keyof typeof FILTER_LABELS]}</span>}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Huésped</th><th>RUT</th><th>Teléfono</th><th>Habitación</th>
                  <th>Empresa</th><th>Entrada</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {stays.map(stay => {
                  const guest   = stay.guests   as unknown as { id: string; first_name: string; last_name_paterno: string; rut: string | null; phone?: string } | null
                  const room    = stay.rooms    as unknown as { number: string; type: string | null; properties: { name: string } | null } | null
                  const company = stay.companies as unknown as { name: string } | null
                  const nombre  = `${guest?.first_name ?? ''} ${guest?.last_name_paterno ?? ''}`.trim()
                  const initials = nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
                  const av = avatarStyle(nombre)

                  return (
                    <tr key={stay.id}>
                      <td className="pl-4 pr-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: av.bg, color: av.text }}>
                          {initials || '?'}
                        </div>
                      </td>
                      <td className="font-semibold text-[var(--navy)] whitespace-nowrap">
                        {q ? <Highlight text={nombre} q={q} /> : nombre}
                      </td>
                      <td className="text-[var(--gray-500)] font-mono text-[12px]">
                        {guest?.rut ? (q ? <Highlight text={guest.rut} q={q} /> : guest.rut) : '—'}
                      </td>
                      <td className="text-[var(--gray-500)] text-[12px] whitespace-nowrap">
                        {guest?.phone ?? '—'}
                      </td>
                      <td>
                        <span className="font-medium text-[var(--navy)]">Hab. {room?.number}</span>
                        <span className="text-[11px] text-[var(--gray-500)] ml-1.5">{room?.properties?.name}</span>
                      </td>
                      <td>{company?.name}</td>
                      <td className="whitespace-nowrap text-[var(--gray-600)]">{formatDate(stay.checked_in_at)}</td>
                      <td className="whitespace-nowrap">
                        {stay.checked_out_at
                          ? <div>
                              <span className="badge badge-gray">Salió</span>
                              <p className="text-[11px] text-[var(--gray-500)] mt-0.5">{formatDate(stay.checked_out_at)}</p>
                            </div>
                          : <span className="badge badge-green">Alojado</span>}
                      </td>
                      <td className="text-right">
                        <Link href={`/admin/estadias/${stay.id}/editar`}
                          className="text-[var(--navy)] text-xs font-semibold hover:text-[var(--navy-light)] hover:underline">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Color de avatar determinista por nombre
function avatarStyle(name: string): { bg: string; text: string } {
  const PALETTES = [
    { bg: '#dcfce7', text: '#166534' },   // green
    { bg: '#fef9c3', text: '#854d0e' },   // amber
    { bg: '#dbeafe', text: '#1e40af' },   // blue
    { bg: '#f3e8ff', text: '#6b21a8' },   // purple
    { bg: '#fee2e2', text: '#991b1b' },   // red
    { bg: '#ccfbf1', text: '#115e59' },   // teal
    { bg: '#ffedd5', text: '#9a3412' },   // orange
    { bg: '#e0e7ff', text: '#3730a3' },   // indigo
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]!
}

// Resalta el término buscado dentro del texto
function Highlight({ text, q }: { text: string; q: string }) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--amber)]/40 text-[var(--navy)] rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
