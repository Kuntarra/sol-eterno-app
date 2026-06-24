'use client'

import { useState } from 'react'
import { asignarPlanilla } from '@/app/actions/modulos'
import { UserPlus, X, Minus, Plus } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

type Opt = { id: string; nombre: string }
type Item = { id: string; nombre: string }

interface Props {
  planillaId: string
  items: Item[]
  dotaciones: Opt[]
  nextRota: Record<string, string>
}

export function AsignarPlanilla({ planillaId, items, dotaciones, nextRota }: Props) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [abierto, setAbierto] = useState(false)
  const [dotacion, setDotacion] = useState('')
  const [sigRot, setSigRot] = useState('')
  const [cant, setCant] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, 1])))

  const onPersona = (id: string) => { setDotacion(id); setSigRot(nextRota[id] ?? '') }
  const set = (id: string, v: number) => setCant((c) => ({ ...c, [id]: Math.max(0, v) }))

  if (!items.length) {
    return <p className="text-[11px] text-[var(--gray-500)] mt-3">Agrega ítems a la planilla para poder asignarla.</p>
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--navy)]/30 text-[var(--navy)] text-sm font-semibold hover:bg-[var(--navy)]/5">
        <UserPlus size={15} strokeWidth={2} /> Asignar a una persona
      </button>
    )
  }

  return (
    <form action={asignarPlanilla} className="mt-4 pt-4 border-t border-[var(--gray-200)] space-y-4">
      <input type="hidden" name="planilla_id" value={planillaId} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--navy)]">Asignar a una persona</span>
        <button type="button" onClick={() => setAbierto(false)} className="text-[var(--gray-500)] hover:text-[var(--gray-700)]"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Persona</label>
          <select name="dotacion_id" required value={dotacion} onChange={(e) => onPersona(e.target.value)} className={`${INPUT} w-full`}>
            <option value="" disabled>Selecciona…</option>
            {dotaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Fecha de entrega</label>
          <input type="date" name="fecha_entrega" defaultValue={hoy} className={`${INPUT} w-full`} />
        </div>
        <div>
          <label className={LABEL}>Siguiente rotación</label>
          <input type="date" name="fecha_siguiente_rotacion" value={sigRot} onChange={(e) => setSigRot(e.target.value)} className={`${INPUT} w-full`} />
          <p className="text-[11px] text-[var(--gray-500)] mt-1">Se calcula del turno; confírmala con el huésped.</p>
        </div>
      </div>

      <div>
        <label className={LABEL}>Cantidades de la bolsa</label>
        <div className="rounded-xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-[var(--gray-700)]">{it.nombre}</span>
              <input type="hidden" name="item_nombre" value={it.nombre} />
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => set(it.id, (cant[it.id] ?? 0) - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"><Minus size={14} /></button>
                <input name="item_cantidad" type="number" min={0} value={cant[it.id] ?? 0} onChange={(e) => set(it.id, parseInt(e.target.value || '0', 10))} className={`${INPUT} w-16 text-center`} />
                <button type="button" onClick={() => set(it.id, (cant[it.id] ?? 0) + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Grabar asignación</button>
    </form>
  )
}
