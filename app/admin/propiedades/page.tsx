import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Property, PROPERTY_TYPE_LABELS } from '@/lib/types'
import { PropertyIcon } from '@/app/admin/_components/property-icon'

export default async function PropiedadesPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*, cities(id, name), rooms(id, capacity)')
    .order('name')

  const grouped = (properties ?? []).reduce<Record<string, Property[]>>((acc, p) => {
    const city = (p.cities as { name: string } | null)?.name ?? 'Sin ciudad'
    if (!acc[city]) acc[city] = []
    acc[city].push(p as unknown as Property)
    return acc
  }, {})

  const totalProps = properties?.length ?? 0
  const totalCapacity = (properties ?? []).reduce((sum, p) => {
    const rooms = p.rooms as { capacity: number }[] | null ?? []
    return sum + rooms.reduce((s, r) => s + r.capacity, 0)
  }, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Propiedades</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {totalProps} propiedades · {totalCapacity} cupos totales
          </p>
        </div>
        <Link
          href="/admin/propiedades/nueva"
          className="px-4 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Nueva propiedad
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6" />
            </svg>
          </div>
          <p className="text-[var(--gray-600)] text-sm font-medium mb-1">No hay propiedades registradas</p>
          <p className="text-[var(--gray-600)] text-xs mb-4">Comienza agregando tu primera propiedad</p>
          <Link href="/admin/propiedades/nueva" className="text-[var(--navy)] text-sm font-semibold hover:underline">
            Crear primera propiedad →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([city, props]) => (
            <div key={city}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-bold text-[var(--gray-600)] uppercase tracking-widest">{city}</h2>
                <div className="flex-1 h-px bg-[var(--gray-200)]" />
                <span className="text-xs text-[var(--gray-600)]">{props.length} propiedades</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {props.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PropertyCard({ property: p }: { property: Property & { rooms?: { capacity: number }[]; cities?: { name: string } } }) {
  const rooms = (p.rooms ?? []) as { capacity: number }[]
  const capacity = rooms.reduce((s, r) => s + r.capacity, 0)

  return (
    <Link
      href={`/admin/propiedades/${p.id}`}
      className="group bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden hover:border-[var(--navy)]/30 hover:shadow-md transition-all duration-200"
    >
      {/* Banner superior con icono */}
      <div className="px-6 pt-6 pb-4 flex items-start gap-4">
        <PropertyIcon type={p.type} size="md" />
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider mb-0.5">
            {PROPERTY_TYPE_LABELS[p.type]}
          </p>
          <h3 className="text-base font-bold text-[var(--navy)] group-hover:text-[var(--navy-light)] leading-tight truncate transition-colors">
            {p.name}
          </h3>
          {p.address && (
            <p className="text-xs text-[var(--gray-600)] mt-0.5 truncate">{p.address}</p>
          )}
        </div>
        <span className={`shrink-0 mt-1 w-2 h-2 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-[var(--gray-200)]'}`} title={p.active ? 'Activa' : 'Inactiva'} />
      </div>

      {/* Stats */}
      <div className="px-6 py-3 border-t border-[var(--gray-100)] flex items-center gap-5">
        <Stat label="Hab." value={rooms.length} />
        <Stat label="Cupos" value={capacity} />
        {p.floors ? <Stat label="Pisos" value={p.floors} /> : null}
        <div className="ml-auto">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--gray-100)] text-[var(--gray-600)]'
          }`}>
            {p.active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-[var(--navy)]">{value}</p>
      <p className="text-xs text-[var(--gray-600)]">{label}</p>
    </div>
  )
}
