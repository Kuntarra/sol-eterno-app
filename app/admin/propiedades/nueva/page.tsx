import { createClient } from '@/lib/supabase/server'
import { createProperty } from '@/app/actions/properties'
import Link from 'next/link'
import { City, SERVICE_LABELS } from '@/lib/types'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function NuevaPropiedadPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: cities } = await supabase.from('cities').select('*').order('name')

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/propiedades" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Nueva propiedad</h1>
          <p className="text-sm text-[var(--gray-600)]">Completa los datos para registrar la propiedad</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createProperty} className="space-y-6">
        {/* Información principal */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Información general</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className={LABEL}>Nombre *</label>
              <input id="name" name="name" type="text" required placeholder="Hotel Sol Iquique" className={INPUT} />
            </div>

            <div>
              <label htmlFor="type" className={LABEL}>Tipo *</label>
              <select id="type" name="type" required className={INPUT}>
                <option value="">Seleccionar tipo…</option>
                <option value="hotel">Hotel</option>
                <option value="hostal">Hostal</option>
                <option value="departamento">Departamento</option>
                <option value="oficina">Oficina</option>
              </select>
            </div>

            <div>
              <label htmlFor="city_id" className={LABEL}>Ciudad *</label>
              <select id="city_id" name="city_id" required className={INPUT}>
                <option value="">Seleccionar ciudad…</option>
                {(cities as City[])?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className={LABEL}>Dirección</label>
              <input id="address" name="address" type="text" placeholder="Av. Arturo Prat 123, Iquique" className={INPUT} />
            </div>

            <div>
              <label htmlFor="floors" className={LABEL}>Número de pisos</label>
              <input id="floors" name="floors" type="number" min="1" max="50" placeholder="4" className={INPUT} />
            </div>

            <div>
              <label htmlFor="icon_url" className={LABEL}>URL del ícono / foto</label>
              <input id="icon_url" name="icon_url" type="url" placeholder="https://..." className={INPUT} />
            </div>
          </div>
        </div>

        {/* Servicios */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Servicios incluidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(SERVICE_LABELS) as [string, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  name={key}
                  className="w-4 h-4 rounded border-[var(--gray-200)] accent-[var(--navy)] cursor-pointer"
                />
                <span className="text-sm text-[var(--gray-900)] group-hover:text-[var(--navy)]">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Crear propiedad
          </button>
          <Link
            href="/admin/propiedades"
            className="px-6 py-2.5 bg-white hover:bg-[var(--gray-100)] text-[var(--navy)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
