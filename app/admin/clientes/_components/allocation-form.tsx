'use client'

import { useState } from 'react'
import { Property, Room, PROPERTY_TYPE_LABELS, ROOM_TYPE_LABELS } from '@/lib/types'

interface PropertyWithRooms extends Omit<Property, 'cities'> {
  rooms: Room[]
  cities: { name: string }
}

interface Props {
  action: (formData: FormData) => Promise<void>
  properties: PropertyWithRooms[]
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1.5'

export function AllocationForm({ action, properties }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const rooms = selectedProperty?.rooms ?? []

  return (
    <form action={action}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={LABEL}>Propiedad *</label>
          <select
            name="property_id"
            required
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            className={INPUT}
          >
            <option value="">Seleccionar propiedad…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {(p.cities as { name: string })?.name} ({PROPERTY_TYPE_LABELS[p.type]})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Habitación *</label>
          <select name="room_id" required disabled={!selectedPropertyId} className={INPUT}>
            <option value="">
              {selectedPropertyId ? 'Seleccionar habitación…' : 'Primero elige una propiedad'}
            </option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                Hab. {r.number}
                {r.type ? ` — ${ROOM_TYPE_LABELS[r.type]}` : ''}
                {` · ${r.capacity} cupo${r.capacity !== 1 ? 's' : ''}`}
                {r.floor ? ` · Piso ${r.floor}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Fecha inicio *</label>
          <input name="start_date" type="date" required className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Fecha fin estimada</label>
          <input name="end_date" type="date" className={INPUT} />
        </div>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
      >
        + Agregar asignación
      </button>
    </form>
  )
}
