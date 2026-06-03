import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: propertiesCount },
    { count: companiesCount },
    { count: activeStaysCount },
    { count: guestsCount },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('stays').select('*', { count: 'exact', head: true }).is('checked_out_at', null),
    supabase.from('guests').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--navy)]">Dashboard</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Propiedades activas" value={propertiesCount ?? 0} color="navy" />
        <StatCard label="Empresas clientes" value={companiesCount ?? 0} color="amber" />
        <StatCard label="Huéspedes activos" value={activeStaysCount ?? 0} color="green" />
        <StatCard label="Personas registradas" value={guestsCount ?? 0} color="gray" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/admin/propiedades/nueva" label="Nueva propiedad" desc="Agregar hotel, hostal o departamento" />
        <QuickLink href="/admin/clientes/nuevo" label="Nuevo cliente" desc="Registrar empresa minera" />
        <QuickLink href="/admin/usuarios" label="Gestionar usuarios" desc="Recepcionistas y accesos cliente" />
        <QuickLink href="/admin/estadias" label="Gestionar estadías" desc="Ver y corregir registros de entrada/salida" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const accent =
    color === 'navy' ? 'border-l-[var(--navy)]' :
    color === 'amber' ? 'border-l-[var(--amber)]' :
    color === 'green' ? 'border-l-emerald-500' :
    'border-l-[var(--gray-200)]'

  return (
    <div className={`bg-white rounded-xl border border-[var(--gray-200)] border-l-4 ${accent} p-5`}>
      <p className="text-3xl font-bold text-[var(--navy)]">{value}</p>
      <p className="text-sm text-[var(--gray-600)] mt-1">{label}</p>
    </div>
  )
}

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-[var(--gray-200)] p-5 hover:border-[var(--navy)] hover:shadow-sm transition-all group"
    >
      <p className="text-sm font-semibold text-[var(--navy)] group-hover:underline">{label} →</p>
      <p className="text-xs text-[var(--gray-600)] mt-1">{desc}</p>
    </Link>
  )
}
