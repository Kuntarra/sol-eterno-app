import { createClient } from '@/lib/supabase/server'
import { createPlanilla, addPlanillaItem, deletePlanillaItem, deletePlanilla } from '@/app/actions/modulos'
import { AsignarPlanilla } from './_components/asignar-planilla'
import { ResumenLavanderia, type GrupoResumen, type EstadoLav } from './_components/resumen'
import { puedeGestionar } from '@/lib/rbac'
import { Plus, X, Trash2, Printer, ClipboardList } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; success?: string; asignada?: string }> }

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const SIN_PROP = 'Sin alojamiento asignado'

function addDays(fecha: string, dias: number) {
  const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export default async function LavanderiaPage({ searchParams }: Props) {
  const { error, success, asignada } = await searchParams
  const supabase = await createClient()
  const hoy = new Date().toISOString().slice(0, 10)
  const [{ data: planillas }, { data: dotacionesRaw }, { data: rotaciones }, { data: bolsas }, { data: stays }] = await Promise.all([
    supabase.from('lavanderia_planillas').select('id, nombre, lavanderia_planilla_items(id, nombre, orden)').eq('activa', true).order('created_at', { ascending: false }),
    supabase.from('dotaciones').select('id, turno_dias_descanso, personas(nombres, apellido_paterno)').eq('estado', 'activa').order('created_at', { ascending: false }),
    supabase.from('rotaciones').select('dotacion_id, fecha_inicio, fecha_fin_esperada'),
    supabase.from('lavanderia_bolsas').select('id, dotacion_id, estado, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('stays').select('dotacion_id, rooms(properties(name))').is('checked_out_at', null),
  ])
  const puedeEscribir = await puedeGestionar('lavanderia')

  const dotaciones = (dotacionesRaw ?? []).map((d) => {
    const p = d.personas as { nombres: string; apellido_paterno: string } | null
    return { id: d.id, nombre: p ? `${p.nombres} ${p.apellido_paterno}` : d.id }
  })

  // ── Fechas automáticas (defaults editables de la boleta) ──
  // Ciclo real: la ropa se entrega a lavandería el ÚLTIMO día del turno y se
  // devuelve el PRIMER día del turno siguiente.
  //   fecha de entrega   → fin del turno vigente (último día) / último fin.
  //   siguiente rotación → próximo inicio futuro (devolución); si no hay
  //                        rotación futura cargada, se deriva = fin + descanso.
  const finVigente: Record<string, string> = {}
  const proximoInicio: Record<string, string> = {}
  const ultimoFin: Record<string, string> = {}
  for (const r of rotaciones ?? []) {
    const id = r.dotacion_id as string
    const ini = r.fecha_inicio as string | null
    const fin = r.fecha_fin_esperada as string | null
    if (ini && fin && ini <= hoy && hoy <= fin && (!finVigente[id] || fin < finVigente[id])) finVigente[id] = fin
    if (ini && ini > hoy && (!proximoInicio[id] || ini < proximoInicio[id])) proximoInicio[id] = ini
    if (fin && (!ultimoFin[id] || fin > ultimoFin[id])) ultimoFin[id] = fin
  }
  const descanso: Record<string, number> = {}
  for (const d of dotacionesRaw ?? []) descanso[d.id] = (d.turno_dias_descanso as number) ?? 0
  const entregaMap: Record<string, string> = {}
  const sigRotMap: Record<string, string> = {}
  for (const d of dotaciones) {
    const fin = finVigente[d.id] ?? ultimoFin[d.id]
    if (fin) entregaMap[d.id] = fin
    if (proximoInicio[d.id]) sigRotMap[d.id] = proximoInicio[d.id]
    else if (fin && descanso[d.id]) sigRotMap[d.id] = addDays(fin, descanso[d.id])
  }

  // ── Resumen del proyecto: estado de lavandería por persona / propiedad ──
  const latestBolsa: Record<string, { id: string; estado: string }> = {}
  for (const b of bolsas ?? []) {
    const id = b.dotacion_id as string | null
    if (id && !latestBolsa[id]) latestBolsa[id] = { id: b.id, estado: b.estado }
  }
  const propByDot: Record<string, string> = {}
  for (const s of stays ?? []) {
    const id = s.dotacion_id as string | null
    const name = (s.rooms as { properties: { name: string } | null } | null)?.properties?.name
    if (id && !propByDot[id]) propByDot[id] = name ?? SIN_PROP
  }
  const estadoDe = (id: string): EstadoLav => {
    const b = latestBolsa[id]
    if (!b) return 'sin_bolsa'
    return b.estado === 'entregada' ? 'entregada' : 'en_proceso'
  }
  const gruposMap = new Map<string, GrupoResumen>()
  for (const d of dotaciones) {
    const prop = propByDot[d.id] ?? SIN_PROP
    if (!gruposMap.has(prop)) gruposMap.set(prop, { propiedad: prop, personas: [] })
    gruposMap.get(prop)!.personas.push({ dotacionId: d.id, nombre: d.nombre, estado: estadoDe(d.id), bolsaId: latestBolsa[d.id]?.id ?? null })
  }
  const grupos = [...gruposMap.values()].sort((a, b) =>
    a.propiedad === SIN_PROP ? 1 : b.propiedad === SIN_PROP ? -1 : a.propiedad.localeCompare(b.propiedad),
  )

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
            <a href={`/print/lavanderia/${asignada}`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white text-xs font-semibold hover:bg-[var(--navy-dark)]"><Printer size={13} /> Imprimir boleta</a>
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
                    <AsignarPlanilla planillaId={pl.id} items={items.map((i) => ({ id: i.id, nombre: i.nombre }))} dotaciones={dotaciones} entregaMap={entregaMap} sigRotMap={sigRotMap} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
        )}

        {/* Resumen del estado de lavandería */}
        <ResumenLavanderia grupos={grupos} />
      </div>
    </div>
  )
}
