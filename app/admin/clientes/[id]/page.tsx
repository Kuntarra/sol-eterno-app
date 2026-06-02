import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Property, Room, PROPERTY_TYPE_LABELS } from '@/lib/types'
import { updateCompany, toggleCompanyActive, deleteCompany } from '@/app/actions/companies'
import { createAllocation, deleteAllocation } from '@/app/actions/allocations'
import { AllocationForm } from '../_components/allocation-form'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function ClienteDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (!company) notFound()

  const { data: allocations } = await supabase
    .from('allocations')
    .select('*, rooms(id, number, type, floor, capacity, property_id, properties(id, name, type, city_id, cities(name)))')
    .eq('company_id', id)
    .order('start_date', { ascending: false })

  const { data: properties } = await supabase
    .from('properties')
    .select('*, cities(name), rooms(*)')
    .eq('active', true)
    .order('name')

  const updateWithId      = updateCompany.bind(null, id)
  const toggleActive      = toggleCompanyActive.bind(null, id, !company.active)
  const deleteWithId      = deleteCompany.bind(null, id)
  const createAllocWithId = createAllocation.bind(null, id)

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-CL') : '—'

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/clientes" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[var(--amber)] flex items-center justify-center shrink-0">
            <span className="text-[var(--navy)] text-xs font-black uppercase">{company.name.slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--navy)]">{company.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                company.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-200)] text-[var(--gray-600)]'
              }`}>
                {company.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            {company.rut && <p className="text-sm text-[var(--gray-600)]">RUT {company.rut}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <form action={toggleActive}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors">
              {company.active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <form action={deleteWithId} onSubmit={undefined}>
            <button
              type="submit"
              onClick={(e) => { if (!confirm('¿Eliminar esta empresa?')) e.preventDefault() }}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          </form>
        </div>
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Empresa {success} correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Formulario edición */}
      <form action={updateWithId} className="space-y-6 mb-10">
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Datos de la empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className={LABEL}>Nombre *</label>
              <input id="name" name="name" type="text" required defaultValue={company.name} className={INPUT} />
            </div>
            <div>
              <label htmlFor="rut" className={LABEL}>RUT empresa</label>
              <input id="rut" name="rut" type="text" defaultValue={company.rut ?? ''} placeholder="76.543.210-K" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="contact_name" className={LABEL}>Nombre del contacto</label>
              <input id="contact_name" name="contact_name" type="text" defaultValue={company.contact_name ?? ''} className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_phone" className={LABEL}>Teléfono</label>
              <input id="contact_phone" name="contact_phone" type="text" defaultValue={company.contact_phone ?? ''} className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_email" className={LABEL}>Correo electrónico</label>
              <input id="contact_email" name="contact_email" type="email" defaultValue={company.contact_email ?? ''} className={INPUT} />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Asignaciones */}
      <div id="asignaciones">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Asignaciones de habitaciones
            <span className="ml-2 text-sm font-normal text-[var(--gray-600)]">
              ({allocations?.length ?? 0})
            </span>
          </h2>
        </div>

        {allocations && allocations.length > 0 ? (
          <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Habitación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Período</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {allocations.map((alloc) => {
                  const room = alloc.rooms as (Room & { properties: (Property & { cities: { name: string } }) | null }) | null
                  const prop = room?.properties
                  const deleteAllocAction = deleteAllocation.bind(null, alloc.id, id)

                  return (
                    <tr key={alloc.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--navy)]">{prop?.name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)]">
                          {(prop?.cities as { name: string } | null)?.name}
                          {prop?.type ? ` · ${PROPERTY_TYPE_LABELS[prop.type as keyof typeof PROPERTY_TYPE_LABELS]}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--navy)]">Hab. {room?.number ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)]">{room?.capacity} cupo{(room?.capacity ?? 0) !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)] text-xs">
                        <span>{formatDate(alloc.start_date)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatDate(alloc.end_date)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteAllocAction}>
                          <button type="submit" className="text-xs text-red-500 hover:text-red-700 transition-colors">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--gray-200)] p-8 text-center mb-4">
            <p className="text-sm text-[var(--gray-600)]">No hay habitaciones asignadas a esta empresa.</p>
          </div>
        )}

        {/* Agregar asignación */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
          <h3 className="text-sm font-semibold text-[var(--navy)] mb-4">Asignar habitación</h3>
          <AllocationForm
            action={createAllocWithId}
            properties={properties as unknown as Parameters<typeof AllocationForm>[0]['properties']}
          />
        </div>
      </div>
    </div>
  )
}
