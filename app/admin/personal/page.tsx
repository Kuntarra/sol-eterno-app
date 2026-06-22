import { createClient } from '@/lib/supabase/server'
import { getCupoPersonas } from '@/lib/tenant'
import Link from 'next/link'
import { Plus, IdCard, Search, Upload } from 'lucide-react'
import { formatRut } from '@/lib/rut'
import { Pagination } from '@/app/_components/pagination'

interface Props {
  searchParams: Promise<{ q?: string; page?: string; success?: string; creadas?: string; reusadas?: string; errores?: string; omitidas?: string }>
}

type Row = {
  persona_id: string
  activa: boolean
  oficio: string | null
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  tipo_documento: string
  numero_documento: string
  total: number
}

const PAGE_SIZE = 50

export default async function PersonalPage({ searchParams }: Props) {
  const { q, page, success, creadas, reusadas, errores, omitidas } = await searchParams
  const huboImport = creadas !== undefined || reusadas !== undefined || errores !== undefined
  const supabase = await createClient()

  const term = (q ?? '').trim()
  const pageNum = Math.max(1, Number(page) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  // Búsqueda + paginación EN LA BASE (escala a miles): función buscar_directorio.
  const [{ data }, cupo] = await Promise.all([
    supabase.rpc('buscar_directorio', { p_q: term, p_limit: PAGE_SIZE, p_offset: offset }),
    getCupoPersonas(),
  ])
  const rows = (data ?? []) as Row[]
  const total = rows[0]?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const docLabel = (r: Row) => (r.tipo_documento === 'rut' ? formatRut(r.numero_documento) : r.numero_documento)
  const pageHref = (p: number) => `/admin/personal?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`
  const cupoPct = cupo.limite ? Math.min(100, Math.round((cupo.usadas / cupo.limite) * 100)) : 0

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Dotación</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Personal</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {total} {total === 1 ? 'persona' : 'personas'} en tu directorio
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/personal/importar" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[var(--gray-200)] text-[var(--navy)] text-sm font-semibold hover:bg-[var(--gray-100)] transition-colors">
            <Upload size={16} strokeWidth={2.25} />
            Importar Excel
          </Link>
          <Link href="/admin/personal/nuevo" className="btn-primary">
            <Plus size={16} strokeWidth={2.25} />
            Nueva persona
          </Link>
        </div>
      </div>

      <div className="px-8 pb-8">
        {/* Cupo contratado */}
        <div className="mb-6 bg-white rounded-xl border border-[var(--gray-200)] p-4 max-w-md">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[var(--gray-600)]">Cupo de personas</span>
            <span className="tabular-nums text-[var(--navy)] font-semibold">{cupo.usadas} / {cupo.limite}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--gray-100)] overflow-hidden">
            <div className={`h-full rounded-full ${cupoPct >= 100 ? 'bg-red-500' : cupoPct >= 85 ? 'bg-[var(--amber)]' : 'bg-emerald-500'}`} style={{ width: `${cupoPct}%` }} />
          </div>
          {cupo.disponibles <= 0 && <p className="text-[11px] text-red-600 mt-1.5">Cupo lleno. El administrador del sistema puede ampliarlo.</p>}
        </div>

        {success && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Persona agregada al directorio.
          </div>
        )}
        {huboImport && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            Importación completada: <strong>{creadas ?? 0}</strong> nuevas ·{' '}
            <strong>{reusadas ?? 0}</strong> ya existían
            {Number(errores ?? 0) > 0 && <> · <strong className="text-red-700">{errores} con error</strong> (RUT inválido o datos faltantes)</>}
            {Number(omitidas ?? 0) > 0 && <> · <strong className="text-amber-700">{omitidas} omitidas por cupo</strong></>}.
          </div>
        )}

        {/* Buscador (en BD) */}
        <form className="mb-6 relative max-w-md">
          <Search size={16} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-600)]" />
          <input
            name="q"
            defaultValue={term}
            placeholder="Buscar por nombre o RUT…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent"
          />
        </form>

        {!rows.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-16 text-center">
            <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IdCard size={28} strokeWidth={1.5} stroke="var(--gray-600)" />
            </div>
            <p className="text-sm font-medium text-[var(--gray-600)] mb-1">
              {term ? 'Sin resultados para tu búsqueda' : 'Aún no hay personal registrado'}
            </p>
            {!term && (
              <Link href="/admin/personal/nuevo" className="text-[var(--navy)] text-sm font-semibold hover:underline">
                Registrar primera persona →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Documento</th>
                    <th className="px-5 py-3 font-semibold">Oficio</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const nombre = `${r.nombres} ${r.apellido_paterno}${r.apellido_materno ? ' ' + r.apellido_materno : ''}`
                    return (
                      <tr key={r.persona_id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--navy)]">
                          <a href={`/admin/personal/${r.persona_id}`} className="hover:underline">{nombre}</a>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{docLabel(r)}</td>
                        <td className="px-5 py-3.5 text-[var(--gray-600)]">{r.oficio ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${r.activa ? 'badge-green' : 'badge-gray'}`}>
                            {r.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={pageNum} totalPages={totalPages} hrefFor={pageHref} />
          </>
        )}
      </div>
    </div>
  )
}
