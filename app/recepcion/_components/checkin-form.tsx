'use client'

import { useState, useRef, useEffect } from 'react'
import { checkIn } from '@/app/actions/stays'
import { isValidRut, formatRut } from '@/lib/rut'

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

const INPUT = 'input-premium disabled:opacity-40'
const LABEL = 'block text-sm font-semibold text-[var(--navy)] mb-1.5'

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

  // Documento de identidad: RUT chileno o documento extranjero
  const [docType, setDocType] = useState<'rut' | 'foreign'>('rut')
  const [docValue, setDocValue] = useState('')
  const docRef = useRef<HTMLInputElement>(null)

  const docInvalid =
    docType === 'rut'
      ? docValue.trim() !== '' && !isValidRut(docValue)
      : false

  // Mantener la validación nativa sincronizada (bloquea el submit si no cumple)
  useEffect(() => {
    const el = docRef.current
    if (!el) return
    if (docType === 'rut') {
      el.setCustomValidity(isValidRut(docValue) ? '' : 'Ingresa un RUT chileno válido (con dígito verificador).')
    } else {
      el.setCustomValidity(docValue.trim() ? '' : 'Ingresa el número de documento.')
    }
  }, [docType, docValue])

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
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--gray-500)] mb-4">Asignación</h2>
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
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--gray-500)] mb-4">Datos del huésped</h2>
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
          <div className="sm:col-span-2">
            <label className={LABEL}>Documento de identidad *</label>
            <div className="flex gap-1.5 mb-2 p-1 bg-[var(--gray-100)] rounded-lg w-fit">
              {([['rut', 'RUT chileno'], ['foreign', 'Extranjero']] as const).map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setDocType(val)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    docType === val
                      ? 'bg-white text-[var(--navy)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--gray-600)] hover:text-[var(--navy)]'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
            {/* doc_type informa al servidor qué validación aplicar */}
            <input type="hidden" name="doc_type" value={docType} />
            <input
              ref={docRef}
              name="rut"
              type="text"
              required
              value={docValue}
              onChange={e => setDocValue(e.target.value)}
              onBlur={() => { if (docType === 'rut' && isValidRut(docValue)) setDocValue(formatRut(docValue)) }}
              placeholder={docType === 'rut' ? '12.345.678-9' : 'N° de pasaporte o documento'}
              aria-invalid={docInvalid}
              className={`${INPUT} ${docInvalid ? '!border-red-300 !bg-red-50' : ''}`}
            />
            {docInvalid && (
              <p className="text-xs text-red-600 mt-1.5">RUT inválido — revisa el número y el dígito verificador.</p>
            )}
            {docType === 'foreign' && (
              <p className="text-xs text-[var(--gray-500)] mt-1.5">Para extranjeros: ingresa el número de pasaporte o documento de su país.</p>
            )}
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input name="phone" type="text" placeholder="+56 9 1234 5678" className={INPUT} />
          </div>
        </div>
      </div>

      {/* Estadía */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--gray-500)] mb-4">Estadía</h2>
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

      <button type="submit" className="btn-primary w-full justify-center py-3 text-sm">
        Registrar check-in
      </button>
    </form>
  )
}
