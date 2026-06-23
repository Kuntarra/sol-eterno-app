import { createClient } from '@/lib/supabase/server'
import { listProyectoOptions, listVehiculoOptions } from '@/lib/data/transporte'
import { MovilizacionForm } from '../_components/movilizacion-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NuevaMovilizacionPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const [proyectos, vehiculos] = await Promise.all([
    listProyectoOptions(supabase),
    listVehiculoOptions(supabase),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/transporte" className="text-[var(--gray-600)] hover:text-[var(--navy)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">Nueva movilización</h1>
          <p className="text-sm text-[var(--gray-600)]">Traslado multimodal de la dotación: origen → proyecto, por tramos encadenados.</p>
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

      <MovilizacionForm proyectos={proyectos} vehiculos={vehiculos} />
    </div>
  )
}
