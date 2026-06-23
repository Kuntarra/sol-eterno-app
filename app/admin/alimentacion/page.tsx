import { createClient } from '@/lib/supabase/server'
import { AlimentacionForm } from './_components/alimentacion-form'
import { puedeGestionar } from '@/lib/rbac'
import { UtensilsCrossed } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; aplicados?: string; modo?: string }> }

const POS_LABEL: Record<string, string> = { hotel: 'Hotel', faena: 'Faena', colacion: 'Colación', no: 'No' }

export default async function AlimentacionPage({ searchParams }: Props) {
  const { error, aplicados, modo } = await searchParams
  const supabase = await createClient()
  const [{ data: planes }, { data: dotacionesRaw }, { data: cuadrillasRaw }] = await Promise.all([
    supabase.from('plan_alimentacion').select('*, dotaciones(personas(nombres, apellido_paterno), proyectos(nombre))').order('fecha', { ascending: false }).limit(150),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }),
    supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre'),
  ])
  const puedeEscribir = await puedeGestionar('alimentacion')
  const dotaciones = (dotacionesRaw ?? []).map((d) => {
    const p = d.personas as { nombres: string; apellido_paterno: string } | null
    return { id: d.id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.id }
  })
  const cuadrillas = (cuadrillasRaw ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Alimentación</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Desayuno, almuerzo y cena por persona y día</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {aplicados !== undefined && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {modo === 'turno'
            ? <>Turno aplicado: <strong>{aplicados}</strong> {Number(aplicados) === 1 ? 'día-persona' : 'días-persona'} configurados.</>
            : <>Plan aplicado a <strong>{aplicados}</strong> {Number(aplicados) === 1 ? 'persona' : 'personas'}.</>}
        </div>}

        {puedeEscribir && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Planificar comidas de un día</h2>
          <AlimentacionForm dotaciones={dotaciones} cuadrillas={cuadrillas} />
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
                  const p = pl.dotaciones?.personas
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
