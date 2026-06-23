import { createClient } from '@/lib/supabase/server'
import { listVehiculos } from '@/lib/data/transporte'
import { VehiculoForm } from '../_components/vehiculo-form'
import { TIPO_VEHICULO_LABEL } from '@/lib/vehiculos'
import { ArrowLeft, Bus } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function FlotaPage({ searchParams }: Props) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const vehiculos = await listVehiculos(supabase)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/transporte" className="text-[var(--gray-600)] hover:text-[var(--navy)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em]">Flota</h1>
          <p className="text-sm text-[var(--gray-600)]">Vehículos disponibles para los traslados</p>
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
      {success && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Vehículo agregado.</div>}

      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6 mb-8">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Agregar vehículo</h2>
        <VehiculoForm />
      </div>

      {!vehiculos?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
          <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><Bus size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
          <p className="text-sm text-[var(--gray-600)]">Sin vehículos todavía</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gray-200)] text-left text-[var(--gray-600)]">
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Identificador</th>
                <th className="px-5 py-3 font-semibold">Capacidad</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr key={v.id} className="border-b border-[var(--gray-100)] last:border-0">
                  <td className="px-5 py-3.5 font-medium text-[var(--navy)]">{TIPO_VEHICULO_LABEL[v.tipo] ?? v.tipo}</td>
                  <td className="px-5 py-3.5 text-[var(--gray-600)]">{v.identificador ?? '—'}</td>
                  <td className="px-5 py-3.5 text-[var(--gray-600)] tabular-nums">{v.capacidad}</td>
                  <td className="px-5 py-3.5"><span className={`badge ${v.activo ? 'badge-green' : 'badge-gray'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
