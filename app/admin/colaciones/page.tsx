import { createClient } from '@/lib/supabase/server'
import { toggleColacionEntregada, generarColacionesSalida } from '@/app/actions/modulos'
import { ColacionesForm } from './_components/colaciones-form'
import { SugerenciaFecha } from './_components/sugerencia-fecha'
import { puedeGestionar } from '@/lib/rbac'
import { Package, Check, Sparkles } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; generadas?: string; sugfecha?: string }> }

const PUNTO_LABEL: Record<string, string> = {
  origen: 'Origen', aeropuerto_llegada: 'Aeropuerto llegada', transporte_ida: 'Transporte ida',
  hotel: 'Hotel', transporte_vuelta: 'Transporte vuelta', aeropuerto_salida: 'Aeropuerto salida', otro: 'Otro',
}

export default async function ColacionesPage({ searchParams }: Props) {
  const { error, generadas, sugfecha } = await searchParams
  const supabase = await createClient()
  const sugFecha = sugfecha || new Date().toISOString().slice(0, 10)
  const { data: sugCount } = await supabase.rpc('generar_colaciones_salida' as never, { p_fecha: sugFecha, p_generar: false } as never)
  const cuentaSalida = Number(sugCount) || 0
  const sugLabel = new Date(sugFecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'short' })
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

        {/* Sugerencia automática: colación de salida para quienes egresan con bus de vuelta */}
        {puedeEscribir && (
        <div className="bg-gradient-to-br from-[var(--navy)]/[0.04] to-white rounded-xl border border-[var(--navy)]/15 p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} strokeWidth={2} className="text-[var(--amber-dark)]" />
            <h2 className="text-sm font-semibold text-[var(--navy)]">Sugerencia automática · colación de salida</h2>
          </div>
          <p className="text-xs text-[var(--gray-600)] mb-4">Personas que terminan su turno y ya tienen bus de vuelta asignado. El sistema calcula el total; tú lo apruebas con un clic.</p>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <span className="block text-xs font-medium text-[var(--gray-600)] mb-1">Fecha de egreso</span>
              <SugerenciaFecha fecha={sugFecha} />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm text-[var(--gray-700)] leading-snug">
                <strong className="font-display text-2xl text-[var(--navy)] align-middle">{cuentaSalida}</strong>{' '}
                <span className="capitalize">{cuentaSalida === 1 ? 'persona termina' : 'personas terminan'} turno con transporte de vuelta el {sugLabel}.</span>
              </p>
            </div>
            {cuentaSalida > 0 && (
              <form action={generarColacionesSalida}>
                <input type="hidden" name="fecha" value={sugFecha} />
                <button type="submit" className="px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg whitespace-nowrap">
                  Generar {cuentaSalida} colaciones de salida
                </button>
              </form>
            )}
          </div>
        </div>
        )}

        {puedeEscribir && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Generar colaciones manualmente</h2>
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
