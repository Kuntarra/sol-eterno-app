import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getMyTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { CheckinForm } from '../_components/checkin-form'
import { AlertCircle } from 'lucide-react'

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const effectiveId = await getEffectiveUserId()
  const tenantId = await getMyTenantId()
  const supabase = createAdminClient()

  // Verificar si el recepcionista tiene propiedades asignadas
  const { data: assignedProps } = await supabase
    .from('receptionist_properties')
    .select('property_id')
    .eq('user_id', effectiveId)
    .eq('tenant_id', tenantId)

  const noPropertiesAssigned = !assignedProps?.length

  // Traer allocations de las propiedades asignadas al usuario efectivo
  const propIds = (assignedProps ?? []).map(r => r.property_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allocs } = await (supabase as any)
    .from('allocations')
    .select(`
      company_id,
      companies(id, name),
      rooms(id, number, type, capacity, floor,
        properties(id, name, cities(name))
      )
    `)
    .eq('tenant_id', tenantId)
    .in('rooms.property_id' as any, propIds.length ? propIds : ['00000000-0000-0000-0000-000000000000'])

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
        <div className="mb-6">
          <span className="section-label">Recepción</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Nuevo check-in</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4" size={40} strokeWidth={1.5} stroke="#d97706" />
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
        <div className="mb-6">
          <span className="section-label">Recepción</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Nuevo check-in</h1>
        </div>
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
      <div className="mb-6">
        <span className="section-label">Recepción</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Nuevo check-in</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Registrar ingreso de huésped</p>
      </div>
      <CheckinForm properties={properties} error={params.error} />
    </div>
  )
}
