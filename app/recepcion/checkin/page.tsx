import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckinForm } from '../_components/checkin-form'

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verificar si el recepcionista tiene propiedades asignadas
  const { data: assignedProps } = await supabase
    .from('receptionist_properties')
    .select('property_id')
    .eq('user_id', user!.id)

  const noPropertiesAssigned = !assignedProps?.length

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

  if (noPropertiesAssigned) {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] mb-6">Nuevo check-in</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-semibold text-amber-800 mb-1">Sin propiedades asignadas</p>
          <p className="text-sm text-amber-700">
            Tu cuenta no tiene propiedades asignadas. Contacta al administrador para que configure tu acceso en
            <strong> Usuarios → tu perfil → Propiedades asignadas</strong>.
          </p>
        </div>
      </div>
    )
  }

  if (!properties.length) {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)] mb-6">Nuevo check-in</h1>
        <div className="bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">Sin habitaciones configuradas</p>
          <p className="text-sm text-[var(--gray-600)]">
            Tus propiedades asignadas aún no tienen empresas ni habitaciones configuradas con allocations.
            El administrador debe crear las asignaciones en cada propiedad.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--navy)] mb-6">Nuevo check-in</h1>
      <CheckinForm properties={properties} error={params.error} />
    </div>
  )
}
