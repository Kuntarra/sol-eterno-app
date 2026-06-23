import { createClient } from '@/lib/supabase/server'
import { addPasajero, marcarPasajero, updateTrasladoEstado } from '@/app/actions/transporte'
import { puedeGestionar } from '@/lib/rbac'
import { ArrowLeft, Plus, Check, MapPin, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const PAX_BADGE: Record<string, string> = {
  asignado: 'badge-gray', subio: 'badge-amber', dejado: 'badge-green', no_show: 'badge-gray',
}
const PAX_LABEL: Record<string, string> = {
  asignado: 'Asignado', subio: 'A bordo', dejado: 'Dejado', no_show: 'No se presentó',
}

export default async function TrasladoDetallePage({ params, searchParams }: Props) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: t } = await supabase
    .from('traslados')
    .select('*, proyectos(nombre), vehiculos(tipo, identificador, capacidad)')
    .eq('id', id)
    .maybeSingle()
  if (!t) notFound()

  // Dotaciones candidatas (del proyecto si lo hay) + pasajeros actuales
  const dotQuery = supabase
    .from('dotaciones')
    .select('id, personas(nombres, apellido_paterno)')
    .order('created_at', { ascending: false })
  if (t.proyecto_id) dotQuery.eq('proyecto_id', t.proyecto_id)

  const [{ data: dotaciones }, { data: pasajeros }] = await Promise.all([
    dotQuery,
    supabase
      .from('traslado_pasajeros')
      .select('id, estado, lugar_bajada, personas(nombres, apellido_paterno)')
      .eq('traslado_id', id)
      .order('created_at'),
  ])

  const addPax = addPasajero.bind(null, id)
  const setEstado = updateTrasladoEstado.bind(null, id)
  const veh = t.vehiculos as unknown as { tipo: string; identificador: string | null; capacidad: number } | null
  const puedeEscribir = await puedeGestionar('transporte')

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/transporte" className="text-[var(--gray-600)] hover:text-[var(--navy)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">
            {[t.origen, t.destino].filter(Boolean).join(' → ') || 'Traslado'}
          </h1>
          <p className="text-sm text-[var(--gray-600)]">
            {t.tipo === 'diario' ? 'Diario a faena' : 'Movilización'} · {t.sentido} · {t.fecha ?? 's/fecha'}{t.hora ? ` ${(t.hora as string).slice(0,5)}` : ''}
            {(t.proyectos as unknown as { nombre: string } | null)?.nombre ? ` · ${(t.proyectos as unknown as { nombre: string }).nombre}` : ''}
            {veh ? ` · ${veh.tipo}${veh.identificador ? ' ' + veh.identificador : ''} (cap. ${veh.capacidad})` : ''}
          </p>
        </div>
        {puedeEscribir && (
          <form action={setEstado} className="flex items-center gap-2 shrink-0">
            <select name="estado" defaultValue={t.estado} className={INPUT}>
              <option value="planificado">Planificado</option>
              <option value="en_curso">En curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <button type="submit" className="px-3 py-2 rounded-lg bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-medium hover:bg-[var(--gray-100)]">Cambiar</button>
          </form>
        )}
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      {/* Agregar pasajero */}
      {puedeEscribir && (
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
        <form action={addPax} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="dotacion_id" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Agregar pasajero</label>
            <select id="dotacion_id" name="dotacion_id" required className={`${INPUT} w-full`} defaultValue="">
              <option value="" disabled>Selecciona persona…</option>
              {(dotaciones ?? []).map((d) => {
                const p = d.personas as unknown as { nombres: string; apellido_paterno: string } | null
                return <option key={d.id} value={d.id}>{p ? `${p.nombres} ${p.apellido_paterno}` : d.id}</option>
              })}
            </select>
          </div>
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg"><Plus size={15} strokeWidth={2.25} /> Agregar</button>
        </form>
        {!dotaciones?.length && (
          <p className="text-xs text-[var(--gray-600)] mt-2">No hay personas asignadas{t.proyecto_id ? ' a este proyecto' : ''}. Asígnalas en Proyectos primero.</p>
        )}
      </div>
      )}

      {/* Manifiesto */}
      <h2 className="text-sm font-semibold text-[var(--navy)] mb-3">Pasajeros ({pasajeros?.length ?? 0})</h2>
      {!pasajeros?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-10 text-center text-sm text-[var(--gray-600)]">Sin pasajeros aún</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
          {pasajeros.map((px) => {
            const p = px.personas as unknown as { nombres: string; apellido_paterno: string } | null
            const subio = marcarPasajero.bind(null, id, px.id, 'subio')
            const dejado = marcarPasajero.bind(null, id, px.id, 'dejado')
            const noShow = marcarPasajero.bind(null, id, px.id, 'no_show')
            return (
              <div key={px.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--navy)] truncate">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</p>
                  <span className={`badge ${PAX_BADGE[px.estado] ?? 'badge-gray'}`}>{PAX_LABEL[px.estado] ?? px.estado}</span>
                </div>
                {puedeEscribir && (
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={subio}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--amber)]/15 text-[var(--amber-dark)] text-xs font-semibold hover:bg-[var(--amber)]/25" title="Marcar a bordo"><Check size={13} strokeWidth={2.5} /> Subió</button></form>
                    <form action={dejado}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200" title="Marcar dejado"><MapPin size={13} strokeWidth={2.5} /> Dejado</button></form>
                    <form action={noShow}><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--gray-100)] text-[var(--gray-600)] text-xs font-semibold hover:bg-[var(--gray-200)]" title="No se presentó"><X size={13} strokeWidth={2.5} /></button></form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
