'use client'

import { useState } from 'react'
import { addSubscription } from '@/app/actions/digest'
import { Plus } from 'lucide-react'

const HOURS = [6, 7, 8, 9, 12, 13, 18, 20, 21]
const WEEKDAYS: [number, string][] = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [7, 'Dom']]

const INPUT = 'input-premium'
const LABEL = 'block text-sm font-semibold text-[var(--navy)] mb-1.5'

export function SubscriptionForm({
  companies, properties, projects,
}: {
  companies: { id: string; name: string }[]
  properties: { id: string; name: string }[]
  projects: { id: string; name: string; company: string }[]
}) {
  const [scope, setScope] = useState<'all' | 'company' | 'property' | 'project' | 'each_project'>('all')
  const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [reportType, setReportType] = useState<'movements' | 'full'>('movements')

  return (
    <form action={addSubscription} className="space-y-5">
      {/* Destinatario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Correo *</label>
          <input name="email" type="email" required placeholder="correo@empresa.cl" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Nombre</label>
          <input name="name" type="text" placeholder="Nombre (opcional)" className={INPUT} />
        </div>
      </div>

      {/* Tipo de reporte */}
      <div>
        <label className={LABEL}>Tipo de reporte</label>
        <input type="hidden" name="report_type" value={reportType} />
        <div className="flex gap-1.5 p-1 bg-[var(--gray-100)] rounded-lg w-fit">
          {([['movements', 'Movimientos'], ['full', 'Completo (KPIs + ocupación)']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setReportType(v)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                reportType === v ? 'bg-white text-[var(--navy)] shadow-[var(--shadow-xs)]' : 'text-[var(--gray-600)] hover:text-[var(--navy)]'
              }`}>{l}</button>
          ))}
        </div>
        <p className="text-xs text-[var(--gray-500)] mt-1.5">
          {reportType === 'movements'
            ? 'Solo check-in y check-out del período.'
            : 'KPIs, ocupación actual por hostal (con listados) y movimientos del período.'}
        </p>
      </div>

      {/* Alcance */}
      <div>
        <label className={LABEL}>¿Qué cubre este reporte?</label>
        <input type="hidden" name="scope_type" value={scope} />
        <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--gray-100)] rounded-lg w-fit">
          {([['all', 'Toda la operación'], ['each_project', 'Cada proyecto'], ['project', 'Un proyecto'], ['company', 'Una empresa'], ['property', 'Propiedades']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setScope(v)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                scope === v ? 'bg-white text-[var(--navy)] shadow-[var(--shadow-xs)]' : 'text-[var(--gray-600)] hover:text-[var(--navy)]'
              }`}>{l}</button>
          ))}
        </div>
        {scope === 'each_project' && (
          <p className="text-xs text-[var(--gray-500)] mt-2">
            Envía <strong>un correo por cada proyecto activo</strong> (3 proyectos → 3 correos), cada uno con el reporte de ese proyecto. Ideal para administración.
          </p>
        )}

        {scope === 'project' && (
          <select name="project_id" className={`${INPUT} mt-3`} defaultValue="">
            <option value="" disabled>Selecciona un proyecto…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.company}</option>)}
          </select>
        )}

        {scope === 'company' && (
          <select name="company_id" className={`${INPUT} mt-3`} defaultValue="">
            <option value="" disabled>Selecciona una empresa…</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {scope === 'property' && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)]">
            {properties.map(p => (
              <label key={p.id} className="flex items-center gap-2.5 text-sm text-[var(--gray-700)] cursor-pointer">
                <input type="checkbox" name="property_ids" value={p.id} className="w-4 h-4 rounded accent-[var(--navy)]" />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Frecuencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Frecuencia</label>
          <input type="hidden" name="frequency" value={freq} />
          <div className="flex gap-1.5 p-1 bg-[var(--gray-100)] rounded-lg w-fit">
            {([['daily', 'Diario'], ['weekly', 'Semanal'], ['monthly', 'Mensual']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setFreq(v)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  freq === v ? 'bg-white text-[var(--navy)] shadow-[var(--shadow-xs)]' : 'text-[var(--gray-600)] hover:text-[var(--navy)]'
                }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={LABEL}>Hora de envío</label>
          <select name="send_hour" className={INPUT} defaultValue={8}>
            {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </div>
      </div>

      {freq === 'weekly' && (
        <div>
          <label className={LABEL}>Días de la semana</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(([v, l]) => (
              <label key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm cursor-pointer has-[:checked]:border-[var(--navy)] has-[:checked]:bg-[var(--navy-5)]">
                <input type="checkbox" name="weekdays" value={v} className="w-4 h-4 rounded accent-[var(--navy)]" />
                {l}
              </label>
            ))}
          </div>
        </div>
      )}

      {freq === 'monthly' && (
        <div className="max-w-[200px]">
          <label className={LABEL}>Día del mes (1–28)</label>
          <input name="monthday" type="number" min={1} max={28} defaultValue={1} className={INPUT} />
        </div>
      )}

      <button type="submit" className="btn-primary">
        <Plus size={15} strokeWidth={2} />
        Crear suscripción
      </button>
    </form>
  )
}
