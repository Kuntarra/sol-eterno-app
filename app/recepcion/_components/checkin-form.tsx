'use client'

import { useState } from 'react'
import { checkIn } from '@/app/actions/stays'

interface Room { id: string; number: string; type: string | null; capacity: number; floor: number | null }
interface Company { id: string; name: string; rooms: Room[] }
interface Project { id: string; name: string }
interface PropertyData {
  id: string
  name: string
  city: string
  companies: Company[]
}

interface Props {
  properties: PropertyData[]
  error?: string
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow disabled:opacity-50'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

const ROOM_LABELS: Record<string, string> = {
  single: 'Individual', double: 'Doble', triple: 'Triple', suite: 'Suite', shared: 'Compartido'
}

const SHIFT_OPTIONS = [
  { value: 'dia',   label: 'Día' },
  { value: 'noche', label: 'Noche' },
  { value: '7x7',   label: '7x7' },
  { value: '14x14', label: '14x14' },
  { value: '4x3',   label: '4x3' },
  { value: 'otro',  label: 'Otro…' },
]

export function CheckinForm({ properties, error }: Props) {
  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : '')
  const [companyId, setCompanyId]   = useState('')
  const [shiftType, setShiftType]   = useState('')

  const property = properties.find(p => p.id === propertyId)
  const companies = property?.companies ?? []
  const company = companies.find(c => c.id === companyId)
  const rooms = company?.rooms ?? []

  return (
    <form action={checkIn} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Propiedad / Empresa / Habitación */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Asignación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {properties.length > 1 && (
            <div>
              <label className={LABEL}>Propiedad *</label>
              <select name="property_display" value={propertyId}
                onChange={e => { setPropertyId(e.target.value); setCompanyId('') }}
                className={INPUT} required>
                <option value="">Seleccionar…</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL}>Empresa *</label>
            <select name="company_id" value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              disabled={!propertyId} required className={INPUT}>
              <option value="">{propertyId ? 'Seleccionar…' : 'Primero elige propiedad'}</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Habitación *</label>
            <select name="room_id" disabled={!companyId} required className={INPUT}>
              <option value="">{companyId ? 'Seleccionar…' : 'Primero elige empresa'}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Hab. {r.number}
                  {r.type ? ` — ${ROOM_LABELS[r.type] ?? r.type}` : ''}
                  {` · ${r.capacity} cupo${r.capacity !== 1 ? 's' : ''}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Datos del huésped */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Datos del huésped</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input name="first_name" type="text" required placeholder="Juan" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Apellido paterno *</label>
            <input name="last_name_paterno" type="text" required placeholder="González" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Apellido materno</label>
            <input name="last_name_materno" type="text" placeholder="Pérez" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>RUT</label>
            <input name="rut" type="text" placeholder="12.345.678-9" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input name="phone" type="text" placeholder="+56 9 1234 5678" className={INPUT} />
          </div>
        </div>
      </div>

      {/* Estadía */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Estadía</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tipo de turno *</label>
            <select name="shift_type" required value={shiftType}
              onChange={e => setShiftType(e.target.value)} className={INPUT}>
              <option value="">Seleccionar…</option>
              {SHIFT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {shiftType === 'otro' && (
            <div>
              <label className={LABEL}>Especificar turno *</label>
              <input name="shift_type_other" type="text" required placeholder="Ej: 5x2" className={INPUT} />
            </div>
          )}

          <div>
            <label className={LABEL}>Fecha check-out estimada</label>
            <input name="estimated_checkout" type="date" className={INPUT} />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL}>Observaciones</label>
            <textarea name="notes" rows={2} placeholder="Cualquier información adicional…"
              className={`${INPUT} resize-none`} />
          </div>
        </div>
      </div>

      <button type="submit"
        className="w-full py-3 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white font-semibold rounded-xl transition-colors">
        Registrar check-in
      </button>
    </form>
  )
}
