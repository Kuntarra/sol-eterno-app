import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
  searchParams: Promise<{ success?: string; filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter ?? 'activas'
  const supabase = await createClient()

  let query = supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, checked_out_at, estimated_checkout, notes,
      guests(first_name, last_name_paterno),
      rooms(number, properties(name)),
      companies(name)
    `)
    .order('checked_in_at', { ascending: false })
    .limit(100)

  if (filter === 'activas') query = query.is('checked_out_at', null)
  else if (filter === 'completadas') query = query.not('checked_out_at', 'is', null)

  const { data: stays } = await query

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Estadías</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">Gestión y corrección de registros</p>
        </div>
      </div>

      {params.success === '1' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          Estadía actualizada correctamente.
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {(['activas', 'completadas', 'todas'] as const).map(f => (
          <Link
            key={f}
            href={`/admin/estadias?filter=${f}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-[var(--navy)] text-white'
                : 'bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--navy)]'
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      {!stays?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">No hay estadías en esta categoría.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Huésped</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Habitación</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Entrada</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Salida</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {stays.map(stay => {
                const guest = stay.guests as unknown as { first_name: string; last_name_paterno: string } | null
                const room = stay.rooms as unknown as { number: string; properties: { name: string } | null } | null
                const company = stay.companies as unknown as { name: string } | null

                return (
                  <tr key={stay.id} className="hover:bg-[var(--gray-50)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--navy)]">
                      {guest?.first_name} {guest?.last_name_paterno}
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-700)]">
                      Hab. {room?.number}
                      <span className="text-xs text-[var(--gray-500)] ml-1">{room?.properties?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-700)]">{company?.name}</td>
                    <td className="px-4 py-3 text-[var(--gray-700)]">{formatDate(stay.checked_in_at)}</td>
                    <td className="px-4 py-3 text-[var(--gray-700)]">
                      {stay.checked_out_at
                        ? formatDate(stay.checked_out_at)
                        : <span className="text-emerald-600 font-medium">Activo</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/estadias/${stay.id}/editar`}
                        className="text-xs font-semibold text-[var(--navy)] hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
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
