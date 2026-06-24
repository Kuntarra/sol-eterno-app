import { createClient } from '@/lib/supabase/server'
import { createDotacion } from '@/app/actions/dotaciones'
import { updateProyectoEstado } from '@/app/actions/proyectos'
import { createVinculo, addRecursoVinculo, deleteRecursoVinculo } from '@/app/actions/modulos'
import { ArrowLeft, Plus, Users, Link2, Boxes, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'

export default async function ProyectoDetallePage({ params, searchParams }: Props) {
  const { id } = await params
  const { error, success } = await searchParams
  const supabase = await createClient()

  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('*, cities(name)')
    .eq('id', id)
    .maybeSingle()

  if (!proyecto) notFound()

  const [{ data: directorio }, { data: dotaciones }, { data: proveedores }] = await Promise.all([
    supabase
      .from('persona_directorio')
      .select('persona_id, personas(nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento)')
      .eq('activa', true),
    supabase
      .from('dotaciones')
      .select('id, turno_dias_trabajo, turno_dias_descanso, fecha_inicio_contrato, fecha_fin_contrato, estado, personas(nombres, apellido_paterno, numero_documento, tipo_documento), oficios(nombre), rotaciones(id)')
      .eq('proyecto_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('proyecto_proveedores')
      .select('*, proyecto_proveedor_recursos(id, tipo, cantidad, notas)')
      .eq('proyecto_id', id)
      .order('created_at', { ascending: false }),
  ])

  const ciudad = (proyecto.cities as { name: string } | null)?.name
  const createDotacionForProject = createDotacion.bind(null, id)
  const setEstado = updateProyectoEstado.bind(null, id)
  const vincularProveedor = createVinculo.bind(null, id)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/proyectos" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">{proyecto.nombre}</h1>
          <p className="text-sm text-[var(--gray-600)]">
            {[proyecto.faena, ciudad].filter(Boolean).join(' · ') || 'Sin faena definida'}
            {proyecto.fecha_inicio && ` · ${proyecto.fecha_inicio} → ${proyecto.fecha_fin_estimada ?? '—'}`}
          </p>
        </div>
        {/* Cambiar estado del proyecto */}
        <form action={setEstado} className="flex items-center gap-2 shrink-0">
          <select
            name="estado"
            defaultValue={proyecto.estado}
            className="px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]"
          >
            <option value="planificado">Planificado</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="cerrado">Cerrado</option>
          </select>
          <button type="submit" className="px-3 py-2 rounded-lg bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-medium hover:bg-[var(--gray-100)] transition-colors">
            Cambiar
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {success === 'vinculo' ? 'Proveedor vinculado al proyecto.'
            : success === 'recurso' ? 'Recurso agregado al proveedor.'
            : 'Persona asignada. Las rotaciones se generaron automáticamente.'}
        </div>
      )}

      {/* Planificar persona */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6 mb-8">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Asignar persona al proyecto</h2>
        <form action={createDotacionForProject} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label htmlFor="persona_id" className={LABEL}>Persona *</label>
            <select id="persona_id" name="persona_id" required className={INPUT} defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {(directorio ?? []).map((d) => {
                const p = d.personas
                return (
                  <option key={d.persona_id} value={d.persona_id}>
                    {p ? `${p.nombres} ${p.apellido_paterno}` : d.persona_id}
                  </option>
                )
              })}
            </select>
          </div>
          <div>
            <label htmlFor="turno_dias_trabajo" className={LABEL}>Días trabajo</label>
            <input id="turno_dias_trabajo" name="turno_dias_trabajo" type="number" min={1} placeholder="14" className={INPUT} />
          </div>
          <div>
            <label htmlFor="turno_dias_descanso" className={LABEL}>Días descanso</label>
            <input id="turno_dias_descanso" name="turno_dias_descanso" type="number" min={0} placeholder="14" className={INPUT} />
          </div>
          <div>
            <label htmlFor="fecha_inicio_contrato" className={LABEL}>Inicio contrato</label>
            <input id="fecha_inicio_contrato" name="fecha_inicio_contrato" type="date" defaultValue={proyecto.fecha_inicio ?? undefined} className={INPUT} />
          </div>
          <div>
            <label htmlFor="fecha_fin_contrato" className={LABEL}>Fin contrato</label>
            <input id="fecha_fin_contrato" name="fecha_fin_contrato" type="date" defaultValue={proyecto.fecha_fin_estimada ?? undefined} className={INPUT} />
          </div>
          <div className="md:col-span-6">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
              <Plus size={15} strokeWidth={2.25} />
              Asignar y generar rotaciones
            </button>
          </div>
        </form>
        {!directorio?.length && (
          <p className="text-xs text-[var(--gray-600)] mt-3">
            No tienes personas en tu directorio.{' '}
            <Link href="/admin/personal/nuevo" className="text-[var(--navy)] font-semibold hover:underline">Agrega personal primero →</Link>
          </p>
        )}
      </div>

      {/* Personal asignado */}
      <h2 className="text-sm font-semibold text-[var(--navy)] mb-3">Personal asignado ({dotaciones?.length ?? 0})</h2>
      {!dotaciones?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users size={24} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-sm text-[var(--gray-600)]">Nadie asignado todavía</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                <th className="px-5 py-3 font-semibold">Persona</th>
                <th className="px-5 py-3 font-semibold">Oficio</th>
                <th className="px-5 py-3 font-semibold">Turno</th>
                <th className="px-5 py-3 font-semibold">Contrato</th>
                <th className="px-5 py-3 font-semibold">Rotaciones</th>
              </tr>
            </thead>
            <tbody>
              {dotaciones.map((d) => {
                const p = d.personas
                const turno = d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'
                const nRot = ((d.rotaciones as { id: string }[]) ?? []).length
                return (
                  <tr key={d.id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/proyectos/${id}/dotacion/${d.id}`} className="font-medium text-[var(--navy)] hover:underline">
                        {p ? `${p.nombres} ${p.apellido_paterno}` : '—'}
                      </Link>
                      <div className="text-xs text-[var(--gray-600)] tabular-nums">
                        {p?.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p?.numero_documento}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)]">{d.oficios?.nombre ?? '—'}</td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)]">{turno}</td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)] text-xs tabular-nums">
                      {d.fecha_inicio_contrato ?? '—'} → {d.fecha_fin_contrato ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/proyectos/${id}/dotacion/${d.id}`} className="badge badge-amber hover:underline">
                        {nRot} {nRot === 1 ? 'rotación' : 'rotaciones'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Proveedores vinculados (match por RUT o por código) */}
      <h2 className="text-sm font-semibold text-[var(--navy)] mt-10 mb-3">Proveedores vinculados ({proveedores?.length ?? 0})</h2>

      {/* Código del proyecto para enviar al proveedor */}
      <div className="bg-gradient-to-br from-[var(--navy)]/[0.04] to-white rounded-xl border border-[var(--navy)]/15 p-5 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="block text-xs font-medium text-[var(--gray-600)] mb-1">Código de este proyecto</span>
          <span className="font-display text-2xl font-semibold tracking-[0.2em] text-[var(--navy)]">{proyecto.codigo}</span>
        </div>
        <p className="text-xs text-[var(--gray-600)] max-w-xs">Envíaselo a tu proveedor: si ya usa el sistema, lo ingresa en su panel y se conecta como <strong>★ Socio Dotia</strong>. O vincúlalo por RUT abajo.</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-4">
        <form action={vincularProveedor} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="proveedor_rut" className="block text-xs font-medium text-[var(--gray-600)] mb-1">RUT del proveedor *</label>
            <input id="proveedor_rut" name="proveedor_rut" required placeholder="76.543.210-K" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
          </div>
          <div>
            <label htmlFor="proveedor_nombre" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Nombre (si es nuevo)</label>
            <input id="proveedor_nombre" name="proveedor_nombre" placeholder="Pullman San Luis" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
          </div>
          <div>
            <label htmlFor="modulo" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Módulo</label>
            <select id="modulo" name="modulo" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" defaultValue="transporte">
              <option value="transporte">Transporte</option>
              <option value="hotel">Hotel</option>
              <option value="alimentacion">Alimentación</option>
              <option value="colaciones">Colaciones</option>
              <option value="lavanderia">Lavandería</option>
            </select>
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
            <Link2 size={15} strokeWidth={2.25} /> Vincular
          </button>
        </form>
        <p className="text-xs text-[var(--gray-600)] mt-2">Si el RUT ya usa el sistema, se conecta directo. Si no, queda como invitado temporal del proyecto.</p>
      </div>
      {!!proveedores?.length && (
        <div className="space-y-3">
          {proveedores.map((pv) => {
            const recursos = (pv.proyecto_proveedor_recursos as { id: string; tipo: string; cantidad: number; notas: string | null }[]) ?? []
            const addRecurso = addRecursoVinculo.bind(null, id, pv.id)
            return (
              <div key={pv.id} className="bg-white rounded-2xl border border-[var(--gray-200)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--navy)]">{pv.proveedor_nombre ?? pv.proveedor_rut}</p>
                    <p className="text-xs text-[var(--gray-600)]">{pv.proveedor_rut} · {pv.modulo}</p>
                  </div>
                  <span className={`badge ${pv.estado === 'activo' ? 'badge-green' : pv.estado === 'stub' ? 'badge-amber' : 'badge-gray'}`}>
                    {pv.estado === 'stub' ? '○ Invitado' : pv.estado === 'activo' ? '★ Socio Dotia' : pv.estado}
                  </span>
                </div>

                {/* Recursos comprometidos a este proyecto */}
                <div className="mt-4 pt-4 border-t border-[var(--gray-100)]">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Boxes size={14} strokeWidth={2} className="text-[var(--gray-600)]" />
                    <span className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide">Recursos para este proyecto</span>
                  </div>

                  {recursos.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {recursos.map((r) => {
                        const del = deleteRecursoVinculo.bind(null, id, r.id)
                        return (
                          <span key={r.id} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg bg-[var(--gray-100)] text-sm text-[var(--navy)]">
                            <span className="font-semibold tabular-nums">{r.cantidad}</span> {r.tipo}
                            {r.notas && <span className="text-xs text-[var(--gray-600)]">· {r.notas}</span>}
                            <form action={del}>
                              <button type="submit" aria-label="Quitar recurso" className="w-5 h-5 flex items-center justify-center rounded text-[var(--gray-600)] hover:text-red-600 hover:bg-red-50 transition-colors">
                                <X size={13} strokeWidth={2.25} />
                              </button>
                            </form>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--gray-600)] mb-3">Sin recursos asignados todavía.</p>
                  )}

                  <form action={addRecurso} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--gray-600)] mb-1">Cantidad</label>
                      <input name="cantidad" type="number" min={0} defaultValue={1} className="w-20 px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--gray-600)] mb-1">Tipo de recurso</label>
                      <input name="tipo" required placeholder="Bus, Sprinter, Habitación…" className="w-48 px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
                    </div>
                    <div className="flex-1 min-w-[8rem]">
                      <label className="block text-[11px] font-medium text-[var(--gray-600)] mb-1">Nota (opcional)</label>
                      <input name="notas" placeholder="Ej. 45 asientos" className="w-full px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
                    </div>
                    <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
                      <Plus size={14} strokeWidth={2.5} /> Agregar
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
