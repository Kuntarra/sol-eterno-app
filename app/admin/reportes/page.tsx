import { createAdminClient } from '@/lib/supabase/admin'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const ROOM_LABELS: Record<string, string> = {
  single: 'Individual', double: 'Doble', triple: 'Triple',
  suite: 'Suite', shared: 'Compartido',
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const now  = new Date()
  const anio = parseInt(params.anio ?? String(now.getFullYear()))
  const mes  = parseInt(params.mes  ?? String(now.getMonth() + 1))

  const desde = new Date(anio, mes - 1, 1).toISOString()
  const hasta = new Date(anio, mes, 1).toISOString()

  const adminClient = createAdminClient()

  const { data: stays } = await adminClient
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(number, type, properties(name, cities(name))),
      companies(name)
    `)
    .lt('checked_in_at', hasta)
    .or(`checked_out_at.is.null,checked_out_at.gte.${desde}`)
    .order('checked_in_at', { ascending: true })

  const rows = stays ?? []

  function noches(s: typeof rows[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : new Date(hasta)
    const ini = entrada < new Date(desde) ? new Date(desde) : entrada
    const fin = salida  > new Date(hasta) ? new Date(hasta)  : salida
    return Math.max(0, Math.round((fin.getTime() - ini.getTime()) / 86400000))
  }

  const totalNoches      = rows.reduce((acc, s) => acc + noches(s), 0)
  const activas          = rows.filter(s => !s.checked_out_at).length
  const empresasSet      = new Set(rows.map(s => (s.companies as any)?.name))
  const propiedadesSet   = new Set(rows.map(s => (s.rooms as any)?.properties?.name))

  const porEmpresa = rows.reduce<Record<string, { estadias: number; noches: number }>>((acc, s) => {
    const k = (s.companies as any)?.name ?? '—'
    if (!acc[k]) acc[k] = { estadias: 0, noches: 0 }
    acc[k]!.estadias++
    acc[k]!.noches += noches(s)
    return acc
  }, {})

  const porPropiedad = rows.reduce<Record<string, { estadias: number; noches: number }>>((acc, s) => {
    const k = (s.rooms as any)?.properties?.name ?? '—'
    if (!acc[k]) acc[k] = { estadias: 0, noches: 0 }
    acc[k]!.estadias++
    acc[k]!.noches += noches(s)
    return acc
  }, {})

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const years = [2024, 2025, 2026]

  return (
    <div className="p-8">
      {/* Header + selector */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Reporte mensual</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{MONTHS[mes - 1]} {anio}</p>
        </div>
        <form method="GET" className="flex gap-2">
          <select name="mes" defaultValue={mes}
            className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select name="anio" defaultValue={anio}
            className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-dark)] transition-colors">
            Ver
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KPI label="Estadías en el mes"  value={rows.length}          accent="navy" />
        <KPI label="Noches totales"       value={totalNoches}          accent="amber" />
        <KPI label="Activas al cierre"    value={activas}              accent="green" />
        <KPI label="Propiedades activas"  value={propiedadesSet.size}  accent="gray" />
      </div>

      {/* Resumen por empresa + propiedad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SummaryTable
          title="Por empresa"
          rows={Object.entries(porEmpresa).map(([nombre, d]) => ({ nombre, ...d }))}
        />
        <SummaryTable
          title="Por propiedad"
          rows={Object.entries(porPropiedad).map(([nombre, d]) => ({ nombre, ...d }))}
        />
      </div>

      {/* Detalle */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--navy)]">
            Detalle — {rows.length} estadías
          </h2>
          <span className="text-xs text-[var(--gray-500)]">{empresasSet.size} empresa{empresasSet.size !== 1 ? 's' : ''}</span>
        </div>

        {!rows.length ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--gray-500)]">
            No hay estadías para este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  {['Huésped','RUT','Empresa','Propiedad / Hab.','Turno','Entrada','Salida','Noches','Estado'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-[var(--gray-600)] ${h === 'Noches' ? 'text-right' : h === 'Estado' ? 'text-center' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {rows.map(stay => {
                  const g = stay.guests   as any
                  const r = stay.rooms    as any
                  const c = stay.companies as any
                  const n = noches(stay)

                  return (
                    <tr key={stay.id} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--navy)] whitespace-nowrap">
                        {g?.first_name} {g?.last_name_paterno}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--gray-500)]">{g?.rut ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--gray-700)]">{c?.name}</td>
                      <td className="px-4 py-3 text-[var(--gray-700)]">
                        <span className="font-medium">{r?.properties?.name}</span>
                        <span className="text-[var(--gray-500)] ml-1 text-xs">
                          Hab.{r?.number}{r?.type ? ` · ${ROOM_LABELS[r.type] ?? r.type}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{stay.shift_type ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--gray-700)]">{fmt(stay.checked_in_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--gray-700)]">
                        {stay.checked_out_at ? fmt(stay.checked_out_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--navy)]">{n}</td>
                      <td className="px-4 py-3 text-center">
                        {stay.checked_out_at
                          ? <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-600)] px-2 py-0.5 rounded-full">Completada</span>
                          : <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Activa</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <td colSpan={7} className="px-4 py-3 text-xs font-semibold text-[var(--gray-600)]">
                    Total — {rows.length} estadías · {empresasSet.size} empresa{empresasSet.size !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--navy)]">{totalNoches}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, accent }: { label: string; value: number; accent: string }) {
  const border =
    accent === 'navy'  ? 'border-l-[var(--navy)]' :
    accent === 'amber' ? 'border-l-[var(--amber)]' :
    accent === 'green' ? 'border-l-emerald-500' :
    'border-l-[var(--gray-300)]'
  return (
    <div className={`bg-white rounded-xl border border-[var(--gray-200)] border-l-4 ${border} p-5`}>
      <p className="text-3xl font-bold text-[var(--navy)]">{value}</p>
      <p className="text-sm text-[var(--gray-600)] mt-1">{label}</p>
    </div>
  )
}

function SummaryTable({ title, rows }: { title: string; rows: { nombre: string; estadias: number; noches: number }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--gray-100)]">
        <h2 className="text-sm font-semibold text-[var(--navy)]">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-[var(--gray-600)]">Nombre</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-[var(--gray-600)]">Estadías</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-[var(--gray-600)]">Noches</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--gray-100)]">
          {rows.length ? rows.map(r => (
            <tr key={r.nombre}>
              <td className="px-5 py-3 font-medium text-[var(--navy)]">{r.nombre}</td>
              <td className="px-5 py-3 text-right text-[var(--gray-700)]">{r.estadias}</td>
              <td className="px-5 py-3 text-right font-semibold text-[var(--navy)]">{r.noches}</td>
            </tr>
          )) : (
            <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-[var(--gray-500)]">Sin datos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
