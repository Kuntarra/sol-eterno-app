import { createClient } from '@/lib/supabase/server'
import { createPlanilla, addPlanillaItem, deletePlanillaItem, deletePlanilla, avanzarBolsa } from '@/app/actions/modulos'
import { AsignarPlanilla } from './_components/asignar-planilla'
import { puedeGestionar } from '@/lib/rbac'
import { Shirt, ArrowRight, Plus, X, Trash2, Printer, ClipboardList } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; success?: string; asignada?: string }> }

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const ESTADO_LABEL: Record<string, string> = {
  recepcionada: 'Recepcionada', en_lavanderia: 'En lavandería', en_proceso: 'En proceso', entregada: 'Entregada',
}
const ESTADO_BADGE: Record<string, string> = {
  recepcionada: 'badge-gray', en_lavanderia: 'badge-amber', en_proceso: 'badge-amber', entregada: 'badge-green',
}

function fmtFecha(d: string | null) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default async function LavanderiaPage({ searchParams }: Props) {
  const { error, success, asignada } = await searchParams
  const supabase = await createClient()
  const hoy = new Date().toISOString().slice(0, 10)
  const [{ data: planillas }, { data: dotacionesRaw }, { data: rotaciones }, { data: bolsas }] = await Promise.all([
    supabase.from('lavanderia_planillas').select('id, nombre, lavanderia_planilla_items(id, nombre, orden)').eq('activa', true).order('created_at', { ascending: false }),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').eq('estado', 'activa').order('created_at', { ascending: false }),
    supabase.from('rotaciones').select('dotacion_id, fecha_inicio, fecha_fin_esperada'),
    supabase.from('lavanderia_bolsas').select('*, personas(nombres, apellido_paterno), lavanderia_planillas(nombre)').order('created_at', { ascending: false }).limit(150),
  ])
  const puedeEscribir = await puedeGestionar('lavanderia')

  const dotaciones = (dotacionesRaw ?? []).map((d) => {
    const p = d.personas as { nombres: string; apellido_paterno: string } | null
    return { id: d.id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.id }
  })

  // Siguiente rotación por dotación (default editable de la boleta). Prioridad:
  // 1) fin del turno VIGENTE (cuando sale a descanso) si hoy cae dentro de él;
  // 2) si está en descanso, el próximo inicio futuro (cuando vuelve a entrar);
  // 3) respaldo: el último fin conocido.
  const vigente: Record<string, string> = {}
  const futuro: Record<string, string> = {}
  const ultimoFin: Record<string, string> = {}
  for (const r of rotaciones ?? []) {
    const id = r.dotacion_id as string
    const ini = r.fecha_inicio as string | null
    const fin = r.fecha_fin_esperada as string | null
    if (ini && fin && ini <= hoy && hoy <= fin && (!vigente[id] || fin < vigente[id])) vigente[id] = fin
    if (ini && ini > hoy && (!futuro[id] || ini < futuro[id])) futuro[id] = ini
    if (fin && (!ultimoFin[id] || fin > ultimoFin[id])) ultimoFin[id] = fin
  }
  const nextRota: Record<string, string> = {}
  for (const id of new Set([...Object.keys(vigente), ...Object.keys(futuro), ...Object.keys(ultimoFin)])) {
    nextRota[id] = vigente[id] ?? futuro[id] ?? ultimoFin[id]
  }

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Lavandería</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Planillas de ropa reutilizables, asignación por persona e impresión</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {success && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Guardado.</div>}
        {asignada && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between gap-3">
            <span>Asignación grabada.</span>
            <a href={`/print/lavanderia/${asignada}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white text-xs font-semibold hover:bg-[var(--navy-dark)]"><Printer size={13} /> Imprimir</a>
          </div>
        )}

        {/* Planillas de ropa */}
        {puedeEscribir && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} strokeWidth={2} className="text-[var(--navy)]" />
              <h2 className="text-base font-semibold text-[var(--navy)]">Planillas de ropa</h2>
            </div>
            <form action={createPlanilla} className="flex gap-2">
              <input name="nombre" placeholder="Planilla 14x14, Planilla verano…" className={`${INPUT} w-64`} required />
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg whitespace-nowrap"><Plus size={15} strokeWidth={2.5} /> Generar planilla</button>
            </form>
          </div>

          {!planillas?.length ? (
            <div className="bg-white rounded-2xl border border-dashed border-[var(--gray-300)] p-10 text-center">
              <p className="text-sm text-[var(--gray-600)]">Aún no hay planillas. Crea una estándar de ropa y agrégale los ítems uno a uno.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {planillas.map((pl) => {
                const items = ((pl.lavanderia_planilla_items as { id: string; nombre: string; orden: number }[]) ?? []).sort((a, b) => a.orden - b.orden)
                const eliminarPlanilla = deletePlanilla.bind(null, pl.id)
                return (
                  <div key={pl.id} className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--navy)]">{pl.nombre}</h3>
                        <p className="text-[11px] text-[var(--gray-500)]">{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</p>
                      </div>
                      <form action={eliminarPlanilla}><button className="text-[var(--gray-400)] hover:text-red-600" title="Eliminar planilla"><Trash2 size={15} /></button></form>
                    </div>

                    {/* Ítems */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {items.map((it) => {
                        const eliminar = deletePlanillaItem.bind(null, it.id)
                        return (
                          <span key={it.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-[var(--gray-100)] text-xs text-[var(--gray-700)]">
                            {it.nombre}
                            <form action={eliminar}><button className="text-[var(--gray-400)] hover:text-red-600" title="Quitar"><X size={12} strokeWidth={2.5} /></button></form>
                          </span>
                        )
                      })}
                      {!items.length && <span className="text-[11px] text-[var(--gray-500)]">Sin ítems todavía.</span>}
                    </div>

                    {/* Agregar ítem 1x1 */}
                    <form action={addPlanillaItem} className="flex gap-2">
                      <input type="hidden" name="planilla_id" value={pl.id} />
                      <input name="nombre" placeholder="Sábana, toalla, polera…" className={`${INPUT} flex-1`} required />
                      <button type="submit" className="px-3 py-2 bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-semibold rounded-lg hover:bg-[var(--gray-100)]"><Plus size={15} strokeWidth={2.5} /></button>
                    </form>

                    {/* Asignar a una persona */}
                    <AsignarPlanilla planillaId={pl.id} items={items.map((i) => ({ id: i.id, nombre: i.nombre }))} dotaciones={dotaciones} nextRota={nextRota} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
        )}

        {/* Bolsas asignadas */}
        <h2 className="text-base font-semibold text-[var(--navy)] mb-4">Bolsas asignadas</h2>
        {!bolsas?.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
            <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><Shirt size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
            <p className="text-sm text-[var(--gray-600)]">Sin bolsas registradas</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Planilla</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                  <th className="px-5 py-3 font-semibold">Sig. rotación</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Avanzar</th>
                  <th className="px-5 py-3 font-semibold text-right">Boleta</th>
                </tr>
              </thead>
              <tbody>
                {bolsas.map((b) => {
                  const p = b.personas as { nombres: string; apellido_paterno: string } | null
                  const pl = b.lavanderia_planillas as { nombre: string } | null
                  const avanzar = avanzarBolsa.bind(null, b.id, b.estado)
                  return (
                    <tr key={b.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3.5 font-medium text-[var(--navy)]">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{pl?.nombre ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] text-xs">{fmtFecha(b.fecha_entrega ?? (b.created_at ? b.created_at.slice(0, 10) : null))}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] text-xs">{fmtFecha(b.fecha_siguiente_rotacion)}</td>
                      <td className="px-5 py-3.5"><span className={`badge ${ESTADO_BADGE[b.estado]}`}>{ESTADO_LABEL[b.estado]}</span></td>
                      <td className="px-5 py-3.5">
                        {b.estado === 'entregada' ? (
                          <span className="text-xs text-[var(--gray-600)]">Completada</span>
                        ) : puedeEscribir ? (
                          <form action={avanzar}>
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white text-xs font-semibold hover:bg-[var(--navy-dark)]">
                              {ESTADO_LABEL[b.estado === 'recepcionada' ? 'en_lavanderia' : b.estado === 'en_lavanderia' ? 'en_proceso' : 'entregada']}
                              <ArrowRight size={12} strokeWidth={2.5} />
                            </button>
                          </form>
                        ) : <span className="text-xs text-[var(--gray-600)]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <a href={`/print/lavanderia/${b.id}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--gray-200)] text-[var(--navy)] text-xs font-semibold hover:bg-[var(--gray-100)]"><Printer size={13} /> Imprimir</a>
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
