import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import Link from 'next/link'
import { CheckoutButton } from './_components/checkout-button'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function RecepcionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; property?: string }>
}) {
  const params = await searchParams
  const effectiveId = await getEffectiveUserId()
  const supabase = createAdminClient()

  // Propiedades asignadas al recepcionista
  const { data: rpRows } = await supabase
    .from('receptionist_properties')
    .select('property_id, properties(id, name)')
    .eq('user_id', effectiveId)

  const myProperties = (rpRows ?? []).map(r => {
    const p = r.properties as unknown as { id: string; name: string } | null
    return { id: p?.id ?? r.property_id, name: p?.name ?? r.property_id }
  })

  const selectedPropertyId = params.property ?? null
  const showFilter = myProperties.length > 1

  // Query de estadías activas, filtrada por propiedad si se seleccionó
  let query = supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, estimated_checkout, notes,
      guests(first_name, last_name_paterno),
      rooms(number, floor, property_id, properties(id, name, cities(name))),
      companies(name)
    `)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })

  const { data: stays } = await query

  // Filtrar por propiedad en JS para evitar join anidado en .eq()
  const filtered = selectedPropertyId
    ? (stays ?? []).filter(s => {
        const room = s.rooms as unknown as { property_id: string } | null
        return room?.property_id === selectedPropertyId
      })
    : (stays ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)]">Huéspedes activos</h1>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">
            {filtered.length} estadía{filtered.length !== 1 ? 's' : ''} en curso
          </p>
        </div>
        <Link
          href="/recepcion/checkin"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--navy-dark)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo check-in
        </Link>
      </div>

      {/* Filtro por propiedad — solo aparece si tiene más de una */}
      {showFilter && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/recepcion"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !selectedPropertyId
                ? 'bg-[var(--navy)] text-white'
                : 'bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--navy)]'
            }`}
          >
            Todos
          </Link>
          {myProperties.map(p => (
            <Link
              key={p.id}
              href={`/recepcion?property=${p.id}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPropertyId === p.id
                  ? 'bg-[var(--navy)] text-white'
                  : 'bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--navy)]'
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {params.success === '1' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          Check-in registrado correctamente.
        </div>
      )}
      {params.success === 'checkout' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
          Check-out completado.
        </div>
      )}

      {!filtered.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">
            {selectedPropertyId ? 'No hay huéspedes activos en esta propiedad.' : 'No hay huéspedes activos en este momento.'}
          </p>
          {!selectedPropertyId && (
            <Link href="/recepcion/checkin" className="inline-block mt-4 text-sm text-[var(--navy)] font-semibold hover:underline">
              Registrar primer check-in →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(stay => {
            const guest = stay.guests as unknown as { first_name: string; last_name_paterno: string } | null
            const room = stay.rooms as unknown as { number: string; floor: number | null; properties: { name: string; cities: { name: string } | null } | null } | null
            const company = stay.companies as unknown as { name: string } | null

            return (
              <div key={stay.id} className="bg-white rounded-xl border border-[var(--gray-200)] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--navy)] truncate">
                    {guest?.first_name} {guest?.last_name_paterno}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-xs text-[var(--gray-600)]">
                      Hab. {room?.number}
                      {room?.floor != null ? ` · Piso ${room.floor}` : ''}
                    </span>
                    {/* Mostrar propiedad solo si se ven todas */}
                    {!selectedPropertyId && room?.properties?.name && (
                      <span className="text-xs text-[var(--gray-500)]">{room.properties.name}</span>
                    )}
                    <span className="text-xs text-[var(--gray-600)]">{company?.name}</span>
                    {stay.shift_type && (
                      <span className="text-xs text-[var(--gray-600)]">Turno {stay.shift_type}</span>
                    )}
                    <span className="text-xs text-[var(--gray-500)]">Ingresó {formatDate(stay.checked_in_at)}</span>
                  </div>
                  {stay.notes && (
                    <p className="text-xs text-[var(--gray-500)] mt-1 italic truncate">{stay.notes}</p>
                  )}
                </div>
                <CheckoutButton stayId={stay.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
