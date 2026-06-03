import { createClient } from '@/lib/supabase/server'
import { CheckoutButton } from '../_components/checkout-button'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export default async function CheckoutPage() {
  const supabase = await createClient()

  const { data: stays } = await supabase
    .from('stays')
    .select(`
      id, shift_type, checked_in_at, estimated_checkout, notes,
      guests(first_name, last_name_paterno, rut),
      rooms(number, floor, properties(name)),
      companies(name)
    `)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--navy)]">Check-out</h1>
        <p className="text-sm text-[var(--gray-600)] mt-0.5">
          {stays?.length ?? 0} huésped{stays?.length !== 1 ? 'es' : ''} pendiente{stays?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {!stays?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-sm text-[var(--gray-600)]">No hay huéspedes activos para hacer check-out.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stays.map(stay => {
            const guest = stay.guests as unknown as { first_name: string; last_name_paterno: string; rut: string | null } | null
            const room = stay.rooms as unknown as { number: string; floor: number | null; properties: { name: string } | null } | null
            const company = stay.companies as unknown as { name: string } | null

            const isOverdue = stay.estimated_checkout
              ? new Date(stay.estimated_checkout) < new Date()
              : false

            return (
              <div
                key={stay.id}
                className={`bg-white rounded-xl border p-4 flex items-start sm:items-center justify-between gap-4 ${
                  isOverdue ? 'border-red-200 bg-red-50/40' : 'border-[var(--gray-200)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--navy)]">
                      {guest?.first_name} {guest?.last_name_paterno}
                    </p>
                    {isOverdue && (
                      <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                        Vencido
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-xs text-[var(--gray-600)]">Hab. {room?.number}</span>
                    <span className="text-xs text-[var(--gray-600)]">{company?.name}</span>
                    {stay.shift_type && (
                      <span className="text-xs text-[var(--gray-600)]">Turno {stay.shift_type}</span>
                    )}
                    {guest?.rut && (
                      <span className="text-xs text-[var(--gray-500)]">RUT {guest.rut}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--gray-500)] mt-1">
                    Ingresó {formatDate(stay.checked_in_at)} · {daysAgo(stay.checked_in_at)}
                    {stay.estimated_checkout && (
                      <> · Salida estimada: {new Date(stay.estimated_checkout).toLocaleDateString('es-CL')}</>
                    )}
                  </p>
                  {stay.notes && (
                    <p className="text-xs text-[var(--gray-500)] italic mt-0.5 truncate">{stay.notes}</p>
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
