import { createClient } from '@/lib/supabase/server'
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
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: stays } = await supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, estimated_checkout, notes,
      guests(first_name, last_name_paterno),
      rooms(number, floor, properties(name, cities(name))),
      companies(name)
    `)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)]">Huéspedes activos</h1>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">
            {stays?.length ?? 0} estadía{stays?.length !== 1 ? 's' : ''} en curso
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

      {!stays?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">No hay huéspedes activos en este momento.</p>
          <Link href="/recepcion/checkin" className="inline-block mt-4 text-sm text-[var(--navy)] font-semibold hover:underline">
            Registrar primer check-in →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stays.map(stay => {
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
