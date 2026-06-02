import { createClient } from '@/lib/supabase/server'
import { createProperty } from '@/app/actions/properties'
import Link from 'next/link'
import { City } from '@/lib/types'
import { PropertyForm } from '../_components/property-form'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NuevaPropiedadPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: cities } = await supabase.from('cities').select('*').order('name')

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/propiedades" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Nueva propiedad</h1>
          <p className="text-sm text-[var(--gray-600)]">Configura los datos de la propiedad</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <PropertyForm
        action={createProperty}
        cities={cities as City[]}
        cancelHref="/admin/propiedades"
        submitLabel="Crear propiedad"
      />
    </div>
  )
}
