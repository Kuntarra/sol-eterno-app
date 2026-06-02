import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('*, allocations(id), stays(id)')
    .order('name')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Clientes</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">
            {companies?.length ?? 0} empresas registradas
          </p>
        </div>
        <Link
          href="/admin/clientes/nuevo"
          className="px-4 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Nueva empresa
        </Link>
      </div>

      {!companies?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <div className="w-16 h-16 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--gray-600)] mb-1">No hay empresas registradas</p>
          <Link href="/admin/clientes/nuevo" className="text-[var(--navy)] text-sm font-semibold hover:underline">
            Registrar primera empresa →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => {
            const allocations = (company.allocations as { id: string }[]) ?? []
            const activeStays = (company.stays as { id: string }[]) ?? []

            return (
              <Link
                key={company.id}
                href={`/admin/clientes/${company.id}`}
                className="group bg-white rounded-2xl border border-[var(--gray-200)] p-5 hover:border-[var(--navy)]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--amber)] flex items-center justify-center shrink-0">
                      <span className="text-[var(--navy)] text-xs font-black uppercase">
                        {company.name.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--navy)] group-hover:underline leading-tight">
                        {company.name}
                      </h3>
                      {company.rut && (
                        <p className="text-xs text-[var(--gray-600)]">RUT {company.rut}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    company.active ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--gray-100)] text-[var(--gray-600)]'
                  }`}>
                    {company.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {company.contact_name && (
                  <p className="text-xs text-[var(--gray-600)] mb-3 truncate">
                    {company.contact_name}
                    {company.contact_phone && ` · ${company.contact_phone}`}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-[var(--gray-100)] text-xs text-[var(--gray-600)]">
                  <span><strong className="text-[var(--navy)]">{allocations.length}</strong> asignaciones</span>
                  <span><strong className="text-[var(--navy)]">{activeStays.length}</strong> estadías</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
