import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function AlojamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'client' && myProfile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()
  const cookieStore = await cookies()
  const impersonateId = myProfile?.role === 'admin' ? cookieStore.get('sol_impersonate')?.value : null
  const targetId = impersonateId ?? user.id

  const { data: profile } = impersonateId
    ? await admin.from('user_profiles').select('role, full_name, company_id').eq('id', targetId).single()
    : { data: myProfile }

  const companyId = (profile as any)?.company_id
  if (!companyId) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--gray-600)]">Tu cuenta no tiene empresa asociada. Contacta al administrador.</p>
      </div>
    )
  }

  const [{ data: company }, { data: stays }, { data: allocs }] = await Promise.all([
    admin.from('companies').select('name, rut, contact_name, contact_email, contact_phone').eq('id', companyId).single(),
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at, estimated_checkout,
      guests(first_name, last_name_paterno, rut),
      rooms(number, type, capacity, properties(name, cities(name)))
    `).eq('company_id', companyId).order('checked_in_at', { ascending: false }).limit(50),
    admin.from('allocations').select(`
      rooms(number, type, capacity, properties(name))
    `).eq('company_id', companyId),
  ])

  const activos    = (stays ?? []).filter(s => !s.checked_out_at)
  const recientes  = (stays ?? []).filter(s =>  s.checked_out_at).slice(0, 5)
  const totalCamas = (allocs ?? []).reduce((acc, a) => acc + ((a.rooms as any)?.capacity ?? 1), 0)
  const habitaciones = (allocs ?? []).length

  return (
    <div className="p-8 max-w-5xl">
      {/* Bienvenida */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--navy)]">{company?.name}</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Portal de alojamiento · Sol Eterno</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Huéspedes activos',  value: activos.length,    accent: 'green',  icon: '🟢' },
          { label: 'Habitaciones asig.', value: habitaciones,       accent: 'navy',   icon: '🏨' },
          { label: 'Camas asignadas',    value: totalCamas,         accent: 'amber',  icon: '🛏️' },
          { label: 'Estadías históricas',value: stays?.length ?? 0, accent: 'gray',   icon: '📋' },
        ].map(k => {
          const border = k.accent === 'navy' ? 'border-l-[var(--navy)]' : k.accent === 'amber' ? 'border-l-[var(--amber)]' : k.accent === 'green' ? 'border-l-emerald-500' : 'border-l-[var(--gray-300)]'
          return (
            <div key={k.label} className={`bg-white rounded-xl border border-[var(--gray-200)] border-l-4 ${border} p-5`}>
              <p className="text-3xl font-bold text-[var(--navy)]">{k.value}</p>
              <p className="text-sm text-[var(--gray-600)] mt-1">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Huéspedes activos */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--navy)]">Huéspedes activos ahora</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">{activos.length} en alojamiento</span>
        </div>
        {!activos.length ? (
          <p className="px-6 py-8 text-sm text-[var(--gray-500)] text-center">No hay huéspedes activos en este momento.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                {['Nombre','RUT','Propiedad / Hab.','Turno','Ingreso','Salida estimada'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[var(--gray-600)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {activos.map(s => {
                const g = s.guests as any
                const r = s.rooms  as any
                return (
                  <tr key={s.id} className="hover:bg-[var(--gray-50)]">
                    <td className="px-5 py-3 font-semibold text-[var(--navy)]">{g?.first_name} {g?.last_name_paterno}</td>
                    <td className="px-5 py-3 text-xs text-[var(--gray-500)] font-mono">{g?.rut ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">
                      <span className="font-medium">{r?.properties?.name}</span>
                      <span className="text-[var(--gray-400)] ml-1 text-xs">Hab.{r?.number}</span>
                    </td>
                    <td className="px-5 py-3 text-[var(--gray-600)]">{s.shift_type ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">{fmt(s.checked_in_at)}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">{s.estimated_checkout ? fmt(s.estimated_checkout) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Últimas salidas */}
      {recientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--navy)]">Últimas salidas</h2>
            <Link href="/alojamiento/historial" className="text-xs text-[var(--navy)] font-semibold hover:underline">Ver todo →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                {['Nombre','Propiedad / Hab.','Turno','Ingreso','Salida'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[var(--gray-600)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {recientes.map(s => {
                const g = s.guests as any
                const r = s.rooms  as any
                return (
                  <tr key={s.id} className="hover:bg-[var(--gray-50)]">
                    <td className="px-5 py-3 font-medium text-[var(--navy)]">{g?.first_name} {g?.last_name_paterno}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">
                      <span className="font-medium">{r?.properties?.name}</span>
                      <span className="text-[var(--gray-400)] ml-1 text-xs">Hab.{r?.number}</span>
                    </td>
                    <td className="px-5 py-3 text-[var(--gray-600)]">{s.shift_type ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">{fmt(s.checked_in_at)}</td>
                    <td className="px-5 py-3 text-[var(--gray-700)]">{s.checked_out_at ? fmt(s.checked_out_at) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
