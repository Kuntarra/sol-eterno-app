import { createClient } from '@/lib/supabase/server'
import { toggleColacionEntregada } from '@/app/actions/modulos'
import { ColacionesForm } from './_components/colaciones-form'
import { puedeGestionar } from '@/lib/rbac'
import { Package, Check } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; generadas?: string }> }

const PUNTO_LABEL: Record<string, string> = {
  origen: 'Origen', aeropuerto_llegada: 'Aeropuerto llegada', transporte_ida: 'Transporte ida',
  hotel: 'Hotel', transporte_vuelta: 'Transporte vuelta', aeropuerto_salida: 'Aeropuerto salida', otro: 'Otro',
}

export default async function ColacionesPage({ searchParams }: Props) {
  const { error, generadas } = await searchParams
  const supabase = await createClient()
  const [{ data: colaciones }, { data: dotacionesRaw }, { data: cuadrillasRaw }] = await Promise.all([
    supabase.from('colaciones').select('*, proyectos(nombre), dotaciones(personas(nombres, apellido_paterno))').order('fecha', { ascending: false }).limit(150),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }),
    supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre'),
  ])
  const puedeEscribir = await puedeGestionar('colaciones')
  const dotaciones = (dotacionesRaw ?? []).map((d) => {
    const p = d.personas as { nombres: string; apellido_paterno: string } | null
    return { id: d.id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.id }
  })
  const cuadrillas = (cuadrillasRaw ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Colaciones frías</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Entregas en cualquier punto del ciclo</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {generadas !== undefined && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Generadas <strong>{generadas}</strong> {Number(generadas) === 1 ? 'colación' : 'colaciones'}.</div>}

        {puedeEscribir && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Generar colaciones</h2>
          <ColacionesForm dotaciones={dotaciones} cuadrillas={cuadrillas} />
        </div>
        )}

        {!colaciones?.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
            <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><Package size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
            <p className="text-sm text-[var(--gray-600)]">Sin colaciones registradas</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Punto</th>
                  <th className="px-5 py-3 font-semibold">Sentido</th>
                  <th className="px-5 py-3 font-semibold">Cant.</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {colaciones.map((c) => {
                  const toggle = toggleColacionEntregada.bind(null, c.id, !c.entregada)
                  return (
                    <tr key={c.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3.5 tabular-nums text-[var(--gray-600)]">{c.fecha ?? '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--navy)]">{(() => { const p = (c.dotaciones as { personas: { nombres: string; apellido_paterno: string } | null } | null)?.personas; return p ? `${p.nombres} ${p.apellido_paterno}` : '—' })()}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{PUNTO_LABEL[c.punto_entrega] ?? c.punto_entrega}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{c.sentido}</td>
                      <td className="px-5 py-3.5 tabular-nums font-medium text-[var(--navy)]">{c.cantidad}</td>
                      <td className="px-5 py-3.5">
                        {puedeEscribir ? (
                          <form action={toggle}>
                            <button className={`badge ${c.entregada ? 'badge-green' : 'badge-gray'} hover:opacity-80`}>
                              {c.entregada ? <span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} /> Entregada</span> : 'Marcar entregada'}
                            </button>
                          </form>
                        ) : (
                          <span className={`badge ${c.entregada ? 'badge-green' : 'badge-gray'}`}>{c.entregada ? 'Entregada' : 'Pendiente'}</span>
                        )}
                      </td>
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
