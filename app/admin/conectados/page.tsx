import { createClient } from '@/lib/supabase/server'
import { formatRut } from '@/lib/rut'
import { puedeGestionar } from '@/lib/rbac'
import { registrarEvento } from '@/app/actions/bitacora'
import { Link2, Users, Plane } from 'lucide-react'

// Vista del PROVEEDOR: proyectos conectados por match. RLS acota a personas/
// dotaciones/rotaciones de esos proyectos. El recorte por CAMPO (need-to-know)
// y el registro de eventos (bitácora compartida) viven en esta capa.
type Rotacion = {
  numero: number
  fecha_inicio: string | null
  fecha_fin_esperada: string | null
  vuelo_ida_numero: string | null
  vuelo_ida_fecha: string | null
  vuelo_ida_hora: string | null
  vuelo_ida_aeropuerto: string | null
  vuelo_vuelta_numero: string | null
  vuelo_vuelta_fecha: string | null
  vuelo_vuelta_hora: string | null
}

const COLUMNAS: Record<string, string[]> = {
  transporte: ['Persona', 'Turno', 'Vuelo ida', 'Vuelo vuelta'],
  colaciones: ['Persona', 'Vuelo ida', 'Aeropuerto'],
  hotel: ['Persona', 'Turno', 'Período'],
  alimentacion: ['Persona', 'Turno', 'Período'],
  lavanderia: ['Persona', 'Turno'],
  default: ['Persona', 'Turno', 'Próximo vuelo'],
}

// Eventos que cada módulo puede registrar sobre una persona del proyecto.
const EVENTOS_MODULO: Record<string, { tipo: string; label: string }[]> = {
  transporte: [{ tipo: 'subio', label: 'Subió' }, { tipo: 'dejado', label: 'Dejó' }, { tipo: 'no_show', label: 'No se presentó' }],
  hotel: [{ tipo: 'check_in', label: 'Check-in' }, { tipo: 'check_out', label: 'Check-out' }],
  alimentacion: [{ tipo: 'entregada', label: 'Comida entregada' }],
  colaciones: [{ tipo: 'entregada', label: 'Colación entregada' }],
  lavanderia: [{ tipo: 'recepcionada', label: 'Recepcionada' }, { tipo: 'entregada', label: 'Entregada' }],
  default: [{ tipo: 'nota', label: 'Registrar nota' }],
}

const EVENTO_LABEL: Record<string, string> = {
  subio: 'Subió', dejado: 'Dejó', no_show: 'No se presentó', check_in: 'Check-in', check_out: 'Check-out',
  entregada: 'Entregada', recepcionada: 'Recepcionada', nota: 'Nota',
}

function vuelo(r: Rotacion | undefined, dir: 'ida' | 'vuelta') {
  if (!r) return '—'
  const num = dir === 'ida' ? r.vuelo_ida_numero : r.vuelo_vuelta_numero
  const fecha = dir === 'ida' ? r.vuelo_ida_fecha : r.vuelo_vuelta_fecha
  const hora = dir === 'ida' ? r.vuelo_ida_hora : r.vuelo_vuelta_hora
  if (!fecha && !num) return '—'
  return `${num ?? 'Vuelo'} · ${fecha ?? '—'}${hora ? ` ${hora}` : ''}`
}

export default async function ConectadosPage() {
  const supabase = await createClient()

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, nombre, faena, fecha_inicio, fecha_fin_estimada')
    .order('created_at', { ascending: false })

  const { data: vinculos } = await supabase
    .from('proyecto_proveedores')
    .select('proyecto_id, modulo, estado')
    .eq('estado', 'activo')
  const moduloPorProyecto = new Map((vinculos ?? []).map((v) => [v.proyecto_id, v.modulo]))

  const { data: dotaciones } = await supabase
    .from('dotaciones')
    .select('id, proyecto_id, turno_dias_trabajo, turno_dias_descanso, personas(id, nombres, apellido_paterno, tipo_documento, numero_documento), rotaciones(numero, fecha_inicio, fecha_fin_esperada, vuelo_ida_numero, vuelo_ida_fecha, vuelo_ida_hora, vuelo_ida_aeropuerto, vuelo_vuelta_numero, vuelo_vuelta_fecha, vuelo_vuelta_hora)')

  // Último evento por dotación (bitácora compartida). Se acota a los eventos
  // recientes: la bitácora es append-only y crece sin tope, así que traerla
  // entera escalaría mal. Con orden desc + cap basta para el "último evento".
  const { data: eventos } = await supabase
    .from('eventos_bitacora')
    .select('dotacion_id, tipo, detalle, autor_nombre, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)
  const ultimoEvento = new Map<string, NonNullable<typeof eventos>[number]>()
  for (const e of eventos ?? []) {
    if (e.dotacion_id && !ultimoEvento.has(e.dotacion_id)) ultimoEvento.set(e.dotacion_id, e)
  }

  const dotsPorProyecto = new Map<string, NonNullable<typeof dotaciones>>()
  for (const d of dotaciones ?? []) {
    if (!d.proyecto_id) continue
    const arr = dotsPorProyecto.get(d.proyecto_id) ?? []
    arr.push(d)
    dotsPorProyecto.set(d.proyecto_id, arr)
  }

  // ¿Puedo registrar eventos en cada módulo presente? (admin/actuador sí; visor no)
  const modulosPresentes = [...new Set((vinculos ?? []).map((v) => v.modulo))]
  const canWrite: Record<string, boolean> = {}
  await Promise.all(modulosPresentes.map(async (m) => { canWrite[m] = await puedeGestionar(m) }))

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--navy)] flex items-center justify-center">
          <Link2 size={18} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">Proyectos conectados</h1>
          <p className="text-sm text-[var(--gray-600)]">Personal de los proyectos donde te contrataron · registra tu servicio sobre cada persona</p>
        </div>
      </div>

      {!proyectos?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center mt-6">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Link2 size={24} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-sm text-[var(--gray-600)]">Todavía no estás conectado a ningún proyecto.</p>
          <p className="text-xs text-[var(--gray-500)] mt-1">Cuando una empresa de proyecto te vincule por tu RUT, aquí verás su personal.</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {proyectos.map((p) => {
            const dots = dotsPorProyecto.get(p.id) ?? []
            const modulo = moduloPorProyecto.get(p.id) ?? 'default'
            const cols = COLUMNAS[modulo] ?? COLUMNAS.default
            const escribir = canWrite[modulo] ?? false
            const acciones = EVENTOS_MODULO[modulo] ?? EVENTOS_MODULO.default
            const headers = escribir ? [...cols, 'Registrar'] : cols
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--navy)]">{p.nombre}</h2>
                    <p className="text-xs text-[var(--gray-600)]">
                      {[p.faena, p.fecha_inicio && `${p.fecha_inicio} → ${p.fecha_fin_estimada ?? '—'}`].filter(Boolean).join(' · ') || 'Sin faena'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-amber capitalize">{modulo === 'default' ? 'Servicio' : modulo}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--gray-600)]"><Users size={13} strokeWidth={2} /> {dots.length}</span>
                  </div>
                </div>

                {dots.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-[var(--gray-600)] text-center">Sin personal cargado todavía.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                        {headers.map((c) => <th key={c} className="px-5 py-2.5 font-semibold">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dots.map((d) => {
                        const per = d.personas
                        const turno = d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'
                        const rots = ((d.rotaciones as Rotacion[]) ?? []).slice().sort((a, b) => (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? ''))
                        const prox = rots.find((r) => r.vuelo_ida_fecha) ?? rots[0]
                        const nombre = per ? `${per.nombres} ${per.apellido_paterno}` : '—'
                        const doc = per?.tipo_documento === 'rut' ? formatRut(per.numero_documento) : per?.numero_documento
                        const ev = ultimoEvento.get(d.id)

                        const personaCell = (
                          <td className="px-5 py-3">
                            <p className="font-medium text-[var(--navy)]">{nombre}</p>
                            <p className="text-xs text-[var(--gray-600)] tabular-nums">{doc}</p>
                            {ev && <p className="text-[11px] text-emerald-700 mt-0.5">✓ {EVENTO_LABEL[ev.tipo] ?? ev.tipo}{ev.detalle ? ` · ${ev.detalle}` : ''}</p>}
                          </td>
                        )
                        const turnoCell = <td className="px-5 py-3 text-[var(--gray-600)]">{turno}</td>
                        const vueloIdaCell = (
                          <td className="px-5 py-3 text-[var(--gray-600)]">
                            {prox?.vuelo_ida_fecha ? <span className="inline-flex items-center gap-1.5"><Plane size={13} strokeWidth={2} className="text-[var(--gray-500)]" />{vuelo(prox, 'ida')}</span> : '—'}
                          </td>
                        )

                        let celdas: React.ReactNode
                        if (modulo === 'transporte') {
                          celdas = <>{personaCell}{turnoCell}{vueloIdaCell}<td className="px-5 py-3 text-[var(--gray-600)]">{vuelo(prox, 'vuelta')}</td></>
                        } else if (modulo === 'colaciones') {
                          celdas = <>{personaCell}{vueloIdaCell}<td className="px-5 py-3 text-[var(--gray-600)]">{prox?.vuelo_ida_aeropuerto ?? '—'}</td></>
                        } else if (modulo === 'hotel' || modulo === 'alimentacion') {
                          celdas = <>{personaCell}{turnoCell}<td className="px-5 py-3 text-[var(--gray-600)] tabular-nums">{prox?.fecha_inicio ?? '—'} → {prox?.fecha_fin_esperada ?? '—'}</td></>
                        } else if (modulo === 'lavanderia') {
                          celdas = <>{personaCell}{turnoCell}</>
                        } else {
                          celdas = <>{personaCell}{turnoCell}{vueloIdaCell}</>
                        }

                        return (
                          <tr key={d.id} className="border-b border-[var(--gray-100)] last:border-0">
                            {celdas}
                            {escribir && (
                              <td className="px-5 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {acciones.map((a) => (
                                    <form key={a.tipo} action={registrarEvento}>
                                      <input type="hidden" name="proyecto_id" value={p.id} />
                                      <input type="hidden" name="dotacion_id" value={d.id} />
                                      <input type="hidden" name="persona_id" value={per?.id ?? ''} />
                                      <input type="hidden" name="modulo" value={modulo} />
                                      <input type="hidden" name="tipo" value={a.tipo} />
                                      <input type="hidden" name="back" value="/admin/conectados" />
                                      <button className="px-2.5 py-1 rounded-lg bg-[var(--gray-100)] text-[var(--navy)] text-xs font-semibold hover:bg-[var(--gray-200)]">{a.label}</button>
                                    </form>
                                  ))}
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
