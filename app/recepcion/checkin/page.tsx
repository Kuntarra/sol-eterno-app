import { createClient } from '@/lib/supabase/server'
import { CheckinForm } from '../_components/checkin-form'

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Traer todas las allocations visibles para este usuario (RLS filtra por propiedad asignada)
  const { data: allocs } = await supabase
    .from('allocations')
    .select(`
      company_id,
      companies(id, name),
      rooms(id, number, type, capacity, floor,
        properties(id, name, cities(name))
      )
    `)

  // Construir estructura: propiedad → empresa → habitaciones
  const propertyMap = new Map<string, {
    id: string
    name: string
    city: string
    companies: Map<string, { id: string; name: string; rooms: { id: string; number: string; type: string | null; capacity: number; floor: number | null }[] }>
  }>()

  for (const alloc of allocs ?? []) {
    const room = alloc.rooms as unknown as { id: string; number: string; type: string | null; capacity: number; floor: number | null; properties: { id: string; name: string; cities: { name: string } | null } | null } | null
    if (!room?.properties) continue

    const prop = room.properties
    const city = prop.cities?.name ?? ''
    const company = alloc.companies as unknown as { id: string; name: string } | null
    if (!company) continue

    if (!propertyMap.has(prop.id)) {
      propertyMap.set(prop.id, { id: prop.id, name: prop.name, city, companies: new Map() })
    }
    const propEntry = propertyMap.get(prop.id)!

    if (!propEntry.companies.has(company.id)) {
      propEntry.companies.set(company.id, { id: company.id, name: company.name, rooms: [] })
    }
    propEntry.companies.get(company.id)!.rooms.push({
      id: room.id,
      number: room.number,
      type: room.type,
      capacity: room.capacity,
      floor: room.floor,
    })
  }

  const properties = Array.from(propertyMap.values()).map(p => ({
    ...p,
    companies: Array.from(p.companies.values()),
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--navy)] mb-6">Nuevo check-in</h1>
      <CheckinForm properties={properties} error={params.error} />
    </div>
  )
}
