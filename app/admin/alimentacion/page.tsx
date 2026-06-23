import { createClient } from '@/lib/supabase/server'
import { createPlanAlimentacion } from '@/app/actions/modulos'
import { puedeGestionar } from '@/lib/rbac'
import { UtensilsCrossed } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; success?: string }> }

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const POS_LABEL: Record<string, string> = { hotel: 'Hotel', faena: 'Faena', colacion: 'Colación', no: 'No' }

function MealSelect({ name, def }: { name: string; def: string }) {
  return (
    <select name={name} className={`${INPUT} w-full`} defaultValue={def}>
      {Object.entries(POS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export default async function AlimentacionPage({ searchParams }: Props) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const [{ data: planes }, { data: dotaciones }] = await Promise.all([
    supabase.from('plan_alimentacion').select('*, dotaciones(personas(nombres, apellido_paterno), proyectos(nombre))').order('fecha', { ascending: false }).limit(150),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }),
  ])
  const puedeEscribir = await puedeGestionar('alimentacion')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Alimentación</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Desayuno, almuerzo y cena por persona y día</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {success && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Plan guardado.</div>}

        {puedeEscribir && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Planificar comidas de un día</h2>
          <form action={createPlanAlimentacion} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="col-span-2">
              <label htmlFor="dotacion_id" className={LABEL}>Persona</label>
              <select id="dotacion_id" name="dotacion_id" required className={`${INPUT} w-full`} defaultValue="">
                <option value="" disabled>Selecciona…</option>
                {(dotaciones ?? []).map((d) => {
                  const p = d.personas as unknown as { nombres: string; apellido_paterno: string } | null
                  return <option key={d.id} value={d.id}>{p ? `${p.nombres} ${p.apellido_paterno}` : d.id}</option>
                })}
              </select>
            </div>
            <div>
              <label htmlFor="fecha" className={LABEL}>Fecha</label>
              <input id="fecha" name="fecha" type="date" required className={`${INPUT} w-full`} />
            </div>
            <div><label className={LABEL}>Desayuno</label><MealSelect name="desayuno" def="hotel" /></div>
            <div><label className={LABEL}>Almuerzo</label><MealSelect name="almuerzo" def="faena" /></div>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><label className={LABEL}>Cena</label><MealSelect name="cena" def="hotel" /></div>
            </div>
            <div className="col-span-2 md:col-span-6">
              <button type="submit" className="px-5 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Guardar plan</button>
            </div>
          </form>
          <p className="text-xs text-[var(--gray-600)] mt-2">Cada comida puede ser en hotel, faena, reemplazada por colación, o ninguna.</p>
        </div>
        )}

        {!planes?.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
            <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><UtensilsCrossed size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
            <p className="text-sm text-[var(--gray-600)]">Sin planes de alimentación</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Desayuno</th>
                  <th className="px-5 py-3 font-semibold">Almuerzo</th>
                  <th className="px-5 py-3 font-semibold">Cena</th>
                </tr>
              </thead>
              <tbody>
                {planes.map((pl) => {
                  const dot = pl.dotaciones as unknown as { personas: { nombres: string; apellido_paterno: string } | null } | null
                  const p = dot?.personas
                  return (
                    <tr key={pl.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3.5 tabular-nums text-[var(--gray-600)]">{pl.fecha}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--navy)]">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{POS_LABEL[pl.desayuno]}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{POS_LABEL[pl.almuerzo]}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{POS_LABEL[pl.cena]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
