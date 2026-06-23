'use client'

import { useState } from 'react'
import { aplicarAlimentacion } from '@/app/actions/modulos'
import { User, Users, UsersRound, ChevronUp, ChevronDown } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const POS = [['hotel', 'Hotel'], ['faena', 'Faena'], ['colacion', 'Colación'], ['no', 'No']] as const

type Opt = { id: string; nombre: string }
type Scope = 'persona' | 'cuadrilla' | 'todos'

const SCOPES: { v: Scope; label: string; Icon: typeof User }[] = [
  { v: 'persona', label: 'Una persona', Icon: User },
  { v: 'cuadrilla', label: 'Una cuadrilla', Icon: UsersRound },
  { v: 'todos', label: 'Todos en faena', Icon: Users },
]

function Meal({ name, def }: { name: string; def: string }) {
  return (
    <select name={name} className={`${INPUT} w-full`} defaultValue={def}>
      {POS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export function AlimentacionForm({ dotaciones, cuadrillas }: { dotaciones: Opt[]; cuadrillas: Opt[] }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [scope, setScope] = useState<Scope>('persona')
  const [ref, setRef] = useState('')
  const [fecha, setFecha] = useState(hoy)

  const moverDia = (dias: number) => {
    const d = new Date(fecha + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setFecha(d.toISOString().slice(0, 10))
  }
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <form action={aplicarAlimentacion} className="space-y-4">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="ref" value={scope === 'todos' ? '' : ref} />
      <input type="hidden" name="fecha" value={fecha} />

      {/* Alcance */}
      <div>
        <span className={LABEL}>Aplicar a</span>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(({ v, label, Icon }) => (
            <button type="button" key={v} onClick={() => { setScope(v); setRef('') }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${scope === v ? 'bg-[var(--navy)] text-white border-[var(--navy)]' : 'bg-white text-[var(--gray-700)] border-[var(--gray-200)] hover:bg-[var(--gray-100)]'}`}>
              <Icon size={15} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        {/* Selector según alcance */}
        {scope === 'persona' && (
          <div className="col-span-2">
            <label className={LABEL}>Persona</label>
            <select required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
        )}
        {scope === 'cuadrilla' && (
          <div className="col-span-2">
            <label className={LABEL}>Cuadrilla</label>
            <select required value={ref} onChange={(e) => setRef(e.target.value)} className={`${INPUT} w-full`}>
              <option value="" disabled>Selecciona…</option>
              {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {!cuadrillas.length && <p className="text-[11px] text-[var(--gray-500)] mt-1">No hay cuadrillas creadas.</p>}
          </div>
        )}
        {scope === 'todos' && (
          <div className="col-span-2">
            <label className={LABEL}>Alcance</label>
            <div className="px-3 py-2 rounded-lg bg-[var(--navy)]/5 text-sm text-[var(--navy)] font-medium">Todas las personas en faena ese día</div>
          </div>
        )}

        {/* Fecha con flechas (hoy por defecto) */}
        <div>
          <label className={LABEL}>Fecha</label>
          <div className="flex items-center gap-1.5">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} className={`${INPUT} flex-1`} />
            <div className="flex flex-col">
              <button type="button" onClick={() => moverDia(1)} title="Día siguiente" className="px-1.5 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-white hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={13} strokeWidth={2.5} /></button>
              <button type="button" onClick={() => moverDia(-1)} title="Día anterior" className="px-1.5 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-white hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={13} strokeWidth={2.5} /></button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--gray-500)] mt-1 capitalize">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</p>
        </div>

        <div><label className={LABEL}>Desayuno</label><Meal name="desayuno" def="hotel" /></div>
        <div><label className={LABEL}>Almuerzo</label><Meal name="almuerzo" def="faena" /></div>
        <div><label className={LABEL}>Cena</label><Meal name="cena" def="hotel" /></div>
      </div>

      <button type="submit" className="px-5 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Aplicar plan</button>
      <p className="text-xs text-[var(--gray-600)]">Cada comida puede ser en hotel, faena, reemplazada por colación, o ninguna. "Todos en faena" asigna de una vez a quienes están en su turno ese día.</p>
    </form>
  )
}
