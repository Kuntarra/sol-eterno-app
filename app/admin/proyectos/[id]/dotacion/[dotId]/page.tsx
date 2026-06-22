import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Plane } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'

interface Props {
  params: Promise<{ id: string; dotId: string }>
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  planificada: 'Planificada',
  en_vuelo_ida: 'En vuelo (ida)',
  arribo_aeropuerto: 'Arribo aeropuerto',
  en_transporte_ida: 'Transporte ida',
  en_hotel: 'En hotel',
  en_faena: 'En faena',
  check_out: 'Check-out',
  en_transporte_vuelta: 'Transporte vuelta',
  en_aeropuerto_vuelta: 'Aeropuerto vuelta',
  en_vuelo_vuelta: 'En vuelo (vuelta)',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
}

export default async function DotacionDetallePage({ params }: Props) {
  const { id, dotId } = await params
  const supabase = await createClient()

  const { data: dot } = await supabase
    .from('dotaciones')
    .select('id, turno_dias_trabajo, turno_dias_descanso, fecha_inicio_contrato, fecha_fin_contrato, estado, personas(nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento), oficios(nombre), proyectos(nombre)')
    .eq('id', dotId)
    .maybeSingle()

  if (!dot) notFound()

  const { data: rotaciones } = await supabase
    .from('rotaciones')
    .select('*')
    .eq('dotacion_id', dotId)
    .order('numero')

  const p = dot.personas as unknown as { nombres: string; apellido_paterno: string; apellido_materno: string | null; tipo_documento: string; numero_documento: string } | null
  const nombre = p ? `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}` : '—'
  const turno = dot.turno_dias_trabajo ? `${dot.turno_dias_trabajo}x${dot.turno_dias_descanso ?? 0}` : '—'

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/proyectos/${id}`} className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">{nombre}</h1>
          <p className="text-sm text-[var(--gray-600)]">
            {(dot.oficios as unknown as { nombre: string } | null)?.nombre ?? 'Sin oficio'} · {(dot.proyectos as unknown as { nombre: string } | null)?.nombre}
          </p>
        </div>
      </div>

      {/* Resumen del contrato */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { k: 'Documento', v: p?.tipo_documento === 'rut' ? formatRut(p.numero_documento) : (p?.numero_documento ?? '—') },
          { k: 'Turno', v: turno },
          { k: 'Inicio', v: dot.fecha_inicio_contrato ?? '—' },
          { k: 'Fin', v: dot.fecha_fin_contrato ?? '—' },
        ].map((s) => (
          <div key={s.k} className="bg-white rounded-xl border border-[var(--gray-200)] p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--gray-600)] font-semibold mb-1">{s.k}</p>
            <p className="text-sm font-semibold text-[var(--navy)] tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Rotaciones */}
      <h2 className="text-sm font-semibold text-[var(--navy)] mb-3">
        Rotaciones ({rotaciones?.length ?? 0})
      </h2>
      {!rotaciones?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Plane size={24} strokeWidth={1.5} stroke="var(--gray-600)" />
          </div>
          <p className="text-sm text-[var(--gray-600)]">
            Sin rotaciones. Revisa que la dotación tenga turno y fechas de contrato.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Inicio faena</th>
                <th className="px-5 py-3 font-semibold">Fin esperada</th>
                <th className="px-5 py-3 font-semibold">Días</th>
                <th className="px-5 py-3 font-semibold">Vuelo ida</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rotaciones.map((r) => {
                const dias = r.fecha_inicio && r.fecha_fin_esperada
                  ? Math.round((new Date(r.fecha_fin_esperada).getTime() - new Date(r.fecha_inicio).getTime()) / 86400000) + 1
                  : '—'
                return (
                  <tr key={r.id} className="border-b border-[var(--gray-100)] last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-[var(--navy)]">{r.numero}</td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{r.fecha_inicio ?? '—'}</td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">
                      {r.fecha_fin_esperada ?? '—'}
                      {r.ajustada_manual && <span className="ml-1.5 badge badge-amber">ajustada</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{dias}</td>
                    <td className="px-5 py-3.5 text-[var(--gray-600)]">{r.vuelo_ida_numero ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-gray">{ESTADO_LABEL[r.estado_ciclo] ?? r.estado_ciclo}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
