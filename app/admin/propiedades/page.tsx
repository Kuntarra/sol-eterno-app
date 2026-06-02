import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Property, PROPERTY_TYPE_LABELS, PROPERTY_TYPE_COLORS } from '@/lib/types'

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
            {properties?.length ?? 0} propiedades · {totalCapacity} cupos totales
          </p>
        </div>
        <Link
          href="/admin/propiedades/nueva"
          className="px-4 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Nueva propiedad
        </Link>
      </div>

      {/* Grupos por ciudad */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
          <p className="text-[var(--gray-600)] text-sm">No hay propiedades registradas.</p>
          <Link href="/admin/propiedades/nueva" className="text-[var(--navy)] text-sm font-medium mt-2 inline-block hover:underline">
            Crear la primera propiedad →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([city, props]) => (
            <div key={city}>
              <h2 className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider mb-3">{city}</h2>
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

function PropertyCard({ property: p }: { property: Property & { rooms?: { capacity: number }[] } }) {
  const rooms = (p.rooms ?? []) as { capacity: number }[]
  const capacity = rooms.reduce((s, r) => s + r.capacity, 0)
  const typeColor = PROPERTY_TYPE_COLORS[p.type]
  const typeLabel = PROPERTY_TYPE_LABELS[p.type]

  return (
    <Link
      href={`/admin/propiedades/${p.id}`}
      className="bg-white rounded-xl border border-[var(--gray-200)] p-5 hover:border-[var(--navy)]/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${typeColor} mb-2`}>
            {typeLabel}
          </span>
          <h3 className="text-sm font-semibold text-[var(--navy)] group-hover:underline leading-tight">
            {p.name}
          </h3>
          {p.address && (
            <p className="text-xs text-[var(--gray-600)] mt-0.5 truncate">{p.address}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-200)] text-[var(--gray-600)]'
        }`}>
          {p.active ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--gray-600)] pt-3 border-t border-[var(--gray-100)]">
        <span>{rooms.length} hab.</span>
        <span>{capacity} cupos</span>
        {p.floors && <span>{p.floors} pisos</span>}
      </div>
    </Link>
  )
}
