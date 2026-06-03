import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function ClienteReportePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const now  = new Date()
  const anio = parseInt(params.anio ?? String(now.getFullYear()))
  const mes  = parseInt(params.mes  ?? String(now.getMonth() + 1))
  const dias = new Date(anio, mes, 0).getDate()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('user_profiles').select('role, company_id').eq('id', user.id).single()

  if (myProfile?.role !== 'client' && myProfile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()
  const cookieStore = await cookies()
  const impersonateId = myProfile?.role === 'admin' ? cookieStore.get('sol_impersonate')?.value : null
  const targetId = impersonateId ?? user.id

  const { data: profile } = impersonateId
    ? await admin.from('user_profiles').select('company_id').eq('id', targetId).single()
    : { data: myProfile }

  const companyId = (profile as any)?.company_id
  if (!companyId) redirect('/alojamiento')

  const desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
  const hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')

  const [{ data: staysRaw }, { data: allocsRaw }, { data: company }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(number, type, capacity, properties(name))
    `).eq('company_id', companyId).lte('checked_in_at', hastaStr + 'T23:59:59').order('checked_in_at'),
    admin.from('allocations').select('rooms(id, capacity, properties(name))').eq('company_id', companyId),
    admin.from('companies').select('name').eq('id', companyId).single(),
  ])

  const stays = (staysRaw ?? []).filter(s => {
    const co = s.checked_out_at ? new Date(s.checked_out_at) : null
    return !co || co >= periodoInicio
  })

  function noches(s: typeof stays[0]) {
    const ini = Math.max(new Date(s.checked_in_at).getTime(), periodoInicio.getTime())
    const fin = Math.min((s.checked_out_at ? new Date(s.checked_out_at) : periodoFin).getTime(), periodoFin.getTime())
    return Math.max(0, Math.round((fin - ini) / 86400000))
  }

  const camasUsadas = stays.reduce((a, s) => a + noches(s), 0)
  const camasDisp   = (allocsRaw ?? []).reduce((a, al) => a + ((al.rooms as any)?.capacity ?? 1), 0)
  const camasTotal  = camasDisp * dias
  const camasLibres = Math.max(0, camasTotal - camasUsadas)
  const ocupPct     = camasTotal > 0 ? Math.round((camasUsadas / camasTotal) * 100) : 0

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const years = Array.from({ length: now.getFullYear() - 2023 }, (_, i) => 2024 + i)

  const circ = 2 * Math.PI * 45
  const dash = (ocupPct / 100) * circ

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Reporte de ocupación</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{company?.name} · {MONTHS[mes-1]} {anio}</p>
        </div>
        <form method="GET" className="flex gap-2">
          <select name="mes" defaultValue={mes}
            className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
            {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
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

      {/* Gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--gray-200)] p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-widest mb-4">Ocupación del mes</p>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
              <circle cx="50" cy="50" r="45" fill="none"
                stroke={ocupPct >= 80 ? '#059669' : ocupPct >= 50 ? '#f59e0b' : '#1B3A5C'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[var(--navy)]">{ocupPct}%</span>
              <span className="text-xs text-[var(--gray-500)]">ocupado</span>
            </div>
          </div>
          <div className="mt-4 w-full space-y-1.5 text-xs text-[var(--gray-600)]">
            <div className="flex justify-between">
              <span>Camas-mes disponibles</span>
              <span className="font-semibold text-[var(--navy)]">{camasTotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span>Camas-mes usadas</span>
              <span className="font-semibold text-emerald-600">{camasUsadas.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span>Camas-mes sin usar</span>
              <span className="font-semibold text-[var(--gray-400)]">{camasLibres.toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {[
            { label:'Camas usadas',     value: camasUsadas,   sub:`${camasDisp} camas × ${dias} días = ${camasTotal} disponibles`, border:'border-t-[var(--navy)]' },
            { label:'Camas sin usar',   value: camasLibres,   sub:`${100-ocupPct}% de capacidad libre`, border:'border-t-[var(--amber)]' },
            { label:'Estadías del mes', value: stays.length,  sub:`${stays.filter(s=>!s.checked_out_at).length} activas al cierre`, border:'border-t-emerald-500' },
            { label:'Días del período', value: dias,          sub:`${MONTHS[mes-1]} ${anio}`, border:'border-t-[var(--gray-300)]' },
          ].map(k => (
            <div key={k.label} className={`bg-white rounded-xl border border-[var(--gray-200)] border-t-4 ${k.border} p-5`}>
              <p className="text-2xl font-bold text-[var(--navy)]">{k.value.toLocaleString('es-CL')}</p>
              <p className="text-sm font-medium text-[var(--gray-700)] mt-1">{k.label}</p>
              <p className="text-xs text-[var(--gray-500)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Listado del mes */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--navy)]">Estadías del mes — {stays.length} registros</h2>
        </div>
        {!stays.length ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--gray-500)]">No hay estadías para este período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                {['Nombre','RUT','Propiedad','Hab.','Turno','Ingreso','Salida','Noches','Estado'].map((h,i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-[var(--gray-600)] ${i===7?'text-right':'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {stays.map(s => {
                const g = s.guests as any
                const r = s.rooms  as any
                const n = noches(s)
                return (
                  <tr key={s.id} className="hover:bg-[var(--gray-50)]">
                    <td className="px-4 py-3 font-semibold text-[var(--navy)] whitespace-nowrap">{g?.first_name} {g?.last_name_paterno}</td>
                    <td className="px-4 py-3 text-xs text-[var(--gray-500)] font-mono">{g?.rut ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-[var(--gray-700)]">{r?.properties?.name}</td>
                    <td className="px-4 py-3 text-[var(--gray-600)]">{r?.number}</td>
                    <td className="px-4 py-3 text-[var(--gray-600)]">{s.shift_type ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(s.checked_in_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{s.checked_out_at ? fmt(s.checked_out_at) : '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--navy)]">{n}</td>
                    <td className="px-4 py-3">
                      {s.checked_out_at
                        ? <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">Completada</span>
                        : <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Activa</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
