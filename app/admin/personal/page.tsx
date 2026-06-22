import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, IdCard, Search, Upload } from 'lucide-react'
import { formatRut } from '@/lib/rut'

interface Props {
  searchParams: Promise<{ q?: string; success?: string; creadas?: string; reusadas?: string; errores?: string }>
}

type DirectorioRow = {
  id: string
  activa: boolean
  oficios: { nombre: string } | null
  personas: {
    id: string
    nombres: string
    apellido_paterno: string
    apellido_materno: string | null
    tipo_documento: string
    numero_documento: string
  } | null
}

export default async function PersonalPage({ searchParams }: Props) {
  const { q, success, creadas, reusadas, errores } = await searchParams
  const huboImport = creadas !== undefined || reusadas !== undefined || errores !== undefined
  const supabase = await createClient()

  const { data } = await supabase
    .from('persona_directorio')
    .select('id, activa, oficios(nombre), personas(id, nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as unknown as DirectorioRow[]

  // Búsqueda simple en memoria (v1). Para escala se moverá a búsqueda en BD.
  const term = (q ?? '').trim().toLowerCase()
  const filtered = !term
    ? rows
    : rows.filter((r) => {
        const p = r.personas
        const full = `${p?.nombres ?? ''} ${p?.apellido_paterno ?? ''} ${p?.apellido_materno ?? ''} ${p?.numero_documento ?? ''}`.toLowerCase()
        return full.includes(term)
      })

  const docLabel = (p: DirectorioRow['personas']) =>
    !p ? '—' : p.tipo_documento === 'rut' ? formatRut(p.numero_documento) : p.numero_documento

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6 flex items-end justify-between gap-6">
        <div>
          <span className="section-label">Dotación</span>
          <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Personal</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {rows.length} {rows.length === 1 ? 'persona' : 'personas'} en tu directorio
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
        {success && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Persona agregada al directorio.
          </div>
        )}
        {huboImport && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            Importación completada: <strong>{creadas ?? 0}</strong> nuevas ·{' '}
            <strong>{reusadas ?? 0}</strong> ya existían
            {Number(errores ?? 0) > 0 && <> · <strong className="text-red-700">{errores} con error</strong> (RUT inválido o datos faltantes)</>}.
          </div>
        )}

        {/* Buscador */}
        <form className="mb-6 relative max-w-md">
          <Search size={16} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-600)]" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre o RUT…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent"
          />
        </form>

        {!filtered.length ? (
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
                {filtered.map((r) => {
                  const p = r.personas
                  const nombre = p
                    ? `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}`
                    : '—'
                  return (
                    <tr key={r.id} className="border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-100)]/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-[var(--navy)]">
                        {p?.id ? <a href={`/admin/personal/${p.id}`} className="hover:underline">{nombre}</a> : nombre}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{docLabel(p)}</td>
                      <td className="px-5 py-3.5 text-[var(--gray-600)]">{r.oficios?.nombre ?? '—'}</td>
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
        )}
      </div>
    </div>
  )
}
