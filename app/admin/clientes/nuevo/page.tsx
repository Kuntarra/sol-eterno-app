import { createCompany } from '@/app/actions/companies'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'
const LABEL = 'block text-sm font-medium text-[var(--gray-900)] mb-1.5'

export default async function NuevoClientePage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/clientes" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Nueva empresa cliente</h1>
          <p className="text-sm text-[var(--gray-600)]">Registra los datos de la empresa minera</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createCompany} className="space-y-6">
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Datos de la empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className={LABEL}>Nombre de la empresa *</label>
              <input id="name" name="name" type="text" required placeholder="Minera Los Andes SpA" className={INPUT} />
            </div>
            <div>
              <label htmlFor="rut" className={LABEL}>RUT empresa</label>
              <input id="rut" name="rut" type="text" placeholder="76.543.210-K" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-5">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="contact_name" className={LABEL}>Nombre del contacto</label>
              <input id="contact_name" name="contact_name" type="text" placeholder="Juan González" className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_phone" className={LABEL}>Teléfono</label>
              <input id="contact_phone" name="contact_phone" type="text" placeholder="+56 9 1234 5678" className={INPUT} />
            </div>
            <div>
              <label htmlFor="contact_email" className={LABEL}>Correo electrónico</label>
              <input id="contact_email" name="contact_email" type="email" placeholder="contacto@empresa.cl" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Crear empresa
          </button>
          <Link href="/admin/clientes" className="px-6 py-2.5 bg-white hover:bg-[var(--gray-100)] text-[var(--navy)] text-sm font-medium rounded-lg border border-[var(--gray-200)] transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
