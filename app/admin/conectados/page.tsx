import { createClient } from '@/lib/supabase/server'
import { formatRut } from '@/lib/rut'
import { Link2, Users, Plane } from 'lucide-react'

// Vista del PROVEEDOR: proyectos a los que está conectado por match.
// El aislamiento lo aplica RLS (solo personas/dotaciones/rotaciones de los
// proyectos vinculados). El recorte por CAMPO (need-to-know) es de esta capa:
// cada módulo muestra solo las columnas que le competen.
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

// Columnas (encabezados) según el módulo del vínculo.
const COLUMNAS: Record<string, string[]> = {
  transporte: ['Persona', 'Turno', 'Vuelo ida', 'Vuelo vuelta'],
  colaciones: ['Persona', 'Vuelo ida', 'Aeropuerto'],
  hotel: ['Persona', 'Turno', 'Período'],
  alimentacion: ['Persona', 'Turno', 'Período'],
  lavanderia: ['Persona', 'Turno'],
  default: ['Persona', 'Turno', 'Próximo vuelo'],
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
    .select('id, proyecto_id, turno_dias_trabajo, turno_dias_descanso, personas(nombres, apellido_paterno, tipo_documento, numero_documento), rotaciones(numero, fecha_inicio, fecha_fin_esperada, vuelo_ida_numero, vuelo_ida_fecha, vuelo_ida_hora, vuelo_ida_aeropuerto, vuelo_vuelta_numero, vuelo_vuelta_fecha, vuelo_vuelta_hora)')

  const dotsPorProyecto = new Map<string, NonNullable<typeof dotaciones>>()
  for (const d of dotaciones ?? []) {
    if (!d.proyecto_id) continue
    const arr = dotsPorProyecto.get(d.proyecto_id) ?? []
    arr.push(d)
    dotsPorProyecto.set(d.proyecto_id, arr)
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[var(--navy)] flex items-center justify-center">
          <Link2 size={18} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">Proyectos conectados</h1>
          <p className="text-sm text-[var(--gray-600)]">Personal de los proyectos donde te contrataron · solo la información de tu servicio</p>
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
                        {cols.map((c) => <th key={c} className="px-5 py-2.5 font-semibold">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dots.map((d) => {
                        const per = d.personas as unknown as { nombres: string; apellido_paterno: string; tipo_documento: string; numero_documento: string } | null
                        const turno = d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'
                        const rots = ((d.rotaciones as Rotacion[]) ?? []).slice().sort((a, b) => (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? ''))
                        const prox = rots.find((r) => r.vuelo_ida_fecha) ?? rots[0]
                        const nombre = per ? `${per.nombres} ${per.apellido_paterno}` : '—'
                        const doc = per?.tipo_documento === 'rut' ? formatRut(per.numero_documento) : per?.numero_documento

                        // Celdas según módulo (mismo orden que COLUMNAS).
                        const personaCell = (
                          <td className="px-5 py-3">
                            <p className="font-medium text-[var(--navy)]">{nombre}</p>
                            <p className="text-xs text-[var(--gray-600)] tabular-nums">{doc}</p>
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

                        return <tr key={d.id} className="border-b border-[var(--gray-100)] last:border-0">{celdas}</tr>
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
