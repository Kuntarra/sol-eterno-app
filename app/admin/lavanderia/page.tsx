import { createClient } from '@/lib/supabase/server'
import { createBolsa, createPrenda, avanzarBolsa } from '@/app/actions/modulos'
import { puedeGestionar } from '@/lib/rbac'
import { Shirt, ArrowRight } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; success?: string }> }

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const ESTADO_LABEL: Record<string, string> = {
  recepcionada: 'Recepcionada', en_lavanderia: 'En lavandería', en_proceso: 'En proceso', entregada: 'Entregada',
}
const ESTADO_BADGE: Record<string, string> = {
  recepcionada: 'badge-gray', en_lavanderia: 'badge-amber', en_proceso: 'badge-amber', entregada: 'badge-green',
}

export default async function LavanderiaPage({ searchParams }: Props) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const [{ data: bolsas }, { data: prendas }, { data: dotaciones }] = await Promise.all([
    supabase.from('lavanderia_bolsas').select('*, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }).limit(150),
    supabase.from('prendas_catalogo').select('*').eq('activo', true).order('nombre'),
    supabase.from('dotaciones').select('id, personas(nombres, apellido_paterno)').order('created_at', { ascending: false }),
  ])
  const puedeEscribir = await puedeGestionar('lavanderia')

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Módulo</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Lavandería</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Bolsas por persona con flujo de estados</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {success && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Guardado.</div>}

        {puedeEscribir && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Nueva bolsa */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--gray-200)] p-5">
            <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Recepcionar bolsa</h2>
            <form action={createBolsa} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label htmlFor="dotacion_id" className={LABEL}>Persona</label>
                <select id="dotacion_id" name="dotacion_id" required className={`${INPUT} w-full`} defaultValue="">
                  <option value="" disabled>Selecciona…</option>
                  {(dotaciones ?? []).map((d) => {
                    const p = d.personas as unknown as { nombres: string; apellido_paterno: string } | null
                    return <option key={d.id} value={d.id}>{p ? `${p.nombres} ${p.apellido_paterno}` : d.id}</option>
                  })}
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Recepcionar</button>
            </form>
          </div>

          {/* Catálogo de prendas */}
          <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5">
            <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Prendas ({prendas?.length ?? 0})</h2>
            <form action={createPrenda} className="flex gap-2 mb-3">
              <input name="nombre" placeholder="Camisa, pantalón…" className={`${INPUT} flex-1`} />
              <button type="submit" className="px-3 py-2 bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-semibold rounded-lg hover:bg-[var(--gray-100)]">+</button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {(prendas ?? []).map((pr) => <span key={pr.id} className="badge badge-gray">{pr.nombre}</span>)}
            </div>
          </div>
        </div>
        )}

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
                  <th className="px-5 py-3 font-semibold">Recibida</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Avanzar</th>
                </tr>
              </thead>
              <tbody>
                {bolsas.map((b) => {
                  const p = b.personas as unknown as { nombres: string; apellido_paterno: string } | null
                  const avanzar = avanzarBolsa.bind(null, b.id, b.estado)
                  return (
                    <tr key={b.id} className="border-b border-[var(--gray-100)] last:border-0">
                      <td className="px-5 py-3.5 font-medium text-[var(--navy)]">{p ? `${p.nombres} ${p.apellido_paterno}` : '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums text-xs">{new Date(b.created_at).toLocaleDateString('es-CL')}</td>
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
