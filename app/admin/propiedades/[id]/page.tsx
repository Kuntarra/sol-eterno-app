import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  City, Room, Services,
  PROPERTY_TYPE_LABELS, PROPERTY_TYPE_COLORS,
  ROOM_TYPE_LABELS, SERVICE_LABELS,
} from '@/lib/types'
import { updateProperty, togglePropertyActive, deleteProperty } from '@/app/actions/properties'
import { createRoom, deleteRoom } from '@/app/actions/rooms'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function PropiedadDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*, cities(id, name), rooms(*)')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const { data: cities } = await supabase.from('cities').select('*').order('name')

  const rooms = (property.rooms ?? []) as Room[]
  const services = (property.services ?? {}) as Services
  const city = property.cities as City | null

  const updateWithId = updateProperty.bind(null, id)
  const createRoomWithId = createRoom.bind(null, id)
  const toggleActive = togglePropertyActive.bind(null, id, !property.active)
  const deleteWithId = deleteProperty.bind(null, id)

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/propiedades" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--navy)]">{property.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROPERTY_TYPE_COLORS[property.type as keyof typeof PROPERTY_TYPE_COLORS]}`}>
                {PROPERTY_TYPE_LABELS[property.type as keyof typeof PROPERTY_TYPE_LABELS]}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                property.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-200)] text-[var(--gray-600)]'
              }`}>
                {property.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p className="text-sm text-[var(--gray-600)]">{city?.name}</p>
          </div>
        </div>

        {/* Acciones destructivas */}
        <div className="flex items-center gap-2">
          <form action={toggleActive}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors">
              {property.active ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <form action={deleteWithId} onSubmit={(e) => { if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) e.preventDefault() }}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Propiedad {success} correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Formulario editar propiedad */}
      <form action={updateWithId} className="space-y-6 mb-10">
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Información general</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className={LABEL}>Nombre *</label>
              <input id="name" name="name" type="text" required defaultValue={property.name} className={INPUT} />
            </div>

            <div>
              <label htmlFor="type" className={LABEL}>Tipo *</label>
              <select id="type" name="type" required defaultValue={property.type} className={INPUT}>
                <option value="hotel">Hotel</option>
                <option value="hostal">Hostal</option>
                <option value="departamento">Departamento</option>
                <option value="oficina">Oficina</option>
              </select>
            </div>

            <div>
              <label htmlFor="city_id" className={LABEL}>Ciudad *</label>
              <select id="city_id" name="city_id" required defaultValue={property.city_id} className={INPUT}>
                {(cities as City[])?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className={LABEL}>Dirección</label>
              <input id="address" name="address" type="text" defaultValue={property.address ?? ''} className={INPUT} />
            </div>

            <div>
              <label htmlFor="floors" className={LABEL}>Pisos</label>
              <input id="floors" name="floors" type="number" min="1" defaultValue={property.floors ?? ''} className={INPUT} />
            </div>

            <div>
              <label htmlFor="icon_url" className={LABEL}>URL ícono / foto</label>
              <input id="icon_url" name="icon_url" type="url" defaultValue={property.icon_url ?? ''} className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Servicios incluidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(SERVICE_LABELS) as [keyof Services, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={services[key] ?? false}
                  className="w-4 h-4 rounded border-[var(--gray-200)] accent-[var(--navy)] cursor-pointer"
                />
                <span className="text-sm text-[var(--gray-900)]">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <button type="submit" className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Habitaciones */}
      <div id="habitaciones">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Habitaciones
            <span className="ml-2 text-sm font-normal text-[var(--gray-600)]">
              ({rooms.length} registradas · {rooms.reduce((s, r) => s + r.capacity, 0)} cupos)
            </span>
          </h2>
        </div>

        {rooms.length > 0 ? (
          <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Piso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider">Capacidad</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {rooms.map((room) => {
                  const deleteRoomAction = deleteRoom.bind(null, room.id, id)
                  return (
                    <tr key={room.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-4 py-3 font-medium text-[var(--navy)]">{room.number}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">
                        {room.type ? ROOM_TYPE_LABELS[room.type as keyof typeof ROOM_TYPE_LABELS] : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{room.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">{room.capacity}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteRoomAction}>
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
            <p className="text-sm text-[var(--gray-600)]">No hay habitaciones registradas.</p>
          </div>
        )}

        {/* Agregar habitación */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
          <h3 className="text-sm font-semibold text-[var(--navy)] mb-4">Agregar habitación</h3>
          <form action={createRoomWithId}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className={LABEL}>Número *</label>
                <input name="number" type="text" required placeholder="101" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Tipo</label>
                <select name="type" className={INPUT}>
                  <option value="">—</option>
                  <option value="single">Individual</option>
                  <option value="double">Doble</option>
                  <option value="triple">Triple</option>
                  <option value="suite">Suite</option>
                  <option value="shared">Compartido</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Piso</label>
                <input name="floor" type="number" min="1" placeholder="1" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Capacidad *</label>
                <input name="capacity" type="number" min="1" required defaultValue="1" className={INPUT} />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
              + Agregar habitación
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
