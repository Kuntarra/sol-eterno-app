import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/super'
import { createTenant } from '@/app/actions/tenants'
import { ArrowLeft } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'
const LABEL = 'block text-xs font-semibold text-[var(--gray-600)] mb-1.5'

export default async function NuevoOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  await requireSuperAdmin()
  const { error } = await searchParams

  return (
    <div className="max-w-2xl">
      <Link href="/super" className="inline-flex items-center gap-1.5 text-sm text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors mb-6">
        <ArrowLeft size={15} strokeWidth={1.75} /> Volver al panel
      </Link>

      <h2 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-tight mb-1">Nuevo operador</h2>
      <p className="text-sm text-[var(--gray-600)] mb-6">Crea un operador (cliente del SaaS) y su primer administrador.</p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createTenant} className="space-y-6">
        {/* Datos del operador */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h3 className="text-sm font-bold text-[var(--navy)] mb-4">Datos del operador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Nombre del operador *</label>
              <input name="name" required className={INPUT} placeholder="Ej: Hospedajes del Norte SpA" />
            </div>
            <div>
              <label className={LABEL}>RUT</label>
              <input name="rut" className={INPUT} placeholder="76.123.456-7" />
            </div>
            <div>
              <label className={LABEL}>Contacto (nombre)</label>
              <input name="contact_name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Correo de contacto</label>
              <input name="contact_email" type="email" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Teléfono de contacto</label>
              <input name="contact_phone" className={INPUT} />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h3 className="text-sm font-bold text-[var(--navy)] mb-4">Facturación</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Monto mensual (CLP)</label>
              <input name="monthly_amount" type="number" min="0" step="1000" className={INPUT} placeholder="200000" />
            </div>
            <div>
              <label className={LABEL}>Día de cobro (1–28)</label>
              <input name="billing_day" type="number" min="1" max="28" className={INPUT} placeholder="1" />
            </div>
          </div>
        </div>

        {/* Administrador inicial */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h3 className="text-sm font-bold text-[var(--navy)] mb-1">Administrador inicial</h3>
          <p className="text-xs text-[var(--gray-600)] mb-4">Esta persona podrá entrar y gestionar la operación de este cliente.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Nombre del administrador</label>
              <input name="admin_name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Correo del administrador *</label>
              <input name="admin_email" type="email" required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contraseña inicial *</label>
              <input name="admin_password" type="text" required minLength={6} className={INPUT} placeholder="mín. 6 caracteres" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/super" className="px-5 py-2.5 rounded-lg border border-[var(--gray-300)] text-[var(--gray-700)] text-sm font-semibold hover:bg-[var(--gray-50)] transition-colors">Cancelar</Link>
          <button type="submit" className="btn-primary">Crear operador</button>
        </div>
      </form>
    </div>
  )
}
