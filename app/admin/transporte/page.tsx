import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Bus, Truck } from 'lucide-react'
import { Pagination } from '@/app/_components/pagination'
import { puedeGestionar } from '@/lib/rbac'

const TIPO_LABEL: Record<string, string> = { movilizacion: 'Movilización', diario: 'Diario a faena' }
const ESTADO_BADGE: Record<string, string> = {
  planificado: 'badge-gray', en_curso: 'badge-amber', completado: 'badge-green', cancelado: 'badge-gray',
}

const PAGE_SIZE = 50

export default async function TransportePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  const pageNum = Math.max(1, Number(page) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const supabase = await createClient()
  const { data: traslados, count } = await supabase
    .from('traslados')
    .select('*, proyectos(nombre), vehiculos(tipo, identificador), traslado_pasajeros(id)', { count: 'exact' })
    .order('fecha', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const puedeEscribir = await puedeGestionar('transporte')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Módulo</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Transporte</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{total} traslados</p>
        </div>
        {puedeEscribir && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/admin/transporte/flota" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
              <Bus size={16} strokeWidth={2.25} /> Flota
            </Link>
            <Link href="/admin/transporte/nuevo" className="btn-primary">
              <Plus size={16} strokeWidth={2.25} /> Nuevo traslado
            </Link>
          </div>
        )}
      </div>

      <div className="px-8 pb-8">
        {!traslados?.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-16 text-center">
            <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
            </div>
            <p className="text-sm font-medium text-[var(--gray-600)] mb-1">Aún no hay traslados</p>
            <Link href="/admin/transporte/nuevo" className="text-[var(--navy)] text-sm font-semibold hover:underline">Crear primer traslado →</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Ruta</th>
                  <th className="px-5 py-3 font-semibold">Proyecto</th>
                  <th className="px-5 py-3 font-semibold">Vehículo</th>
                  <th className="px-5 py-3 font-semibold">Pasajeros</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {traslados.map((t) => {
                  const pax = ((t.traslado_pasajeros as { id: string }[]) ?? []).length
                  const veh = t.vehiculos as unknown as { tipo: string; identificador: string | null } | null
                  return (
                    <tr key={t.id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50">
                      <td className="px-5 py-3.5 tabular-nums">
                        <Link href={`/admin/transporte/${t.id}`} className="font-medium text-[var(--navy)] hover:underline">
                          {t.fecha ?? '—'}{t.hora ? ` ${(t.hora as string).slice(0,5)}` : ''}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{TIPO_LABEL[t.tipo] ?? t.tipo} · {t.sentido}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] text-xs">{[t.origen, t.destino].filter(Boolean).join(' → ') || '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{(t.proyectos as unknown as { nombre: string } | null)?.nombre ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{veh ? `${veh.tipo}${veh.identificador ? ' · ' + veh.identificador : ''}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{pax}</td>
                      <td className="px-5 py-3.5"><span className={`badge ${ESTADO_BADGE[t.estado] ?? 'badge-gray'}`}>{t.estado}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pageNum} totalPages={totalPages} hrefFor={(p) => `/admin/transporte?page=${p}`} />
      </div>
    </div>
  )
}
