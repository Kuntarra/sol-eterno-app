import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/super'
import { ArrowLeft } from 'lucide-react'
import { OperadorForm } from './_components/operador-form'

export default async function NuevoOperadorPage() {
  await requireSuperAdmin()

  return (
    <div className="max-w-2xl">
      <Link href="/super" className="inline-flex items-center gap-1.5 text-sm text-[var(--gray-600)] hover:text-[var(--ink)] transition-colors mb-6">
        <ArrowLeft size={15} strokeWidth={1.75} /> Volver al panel
      </Link>

      <h2 className="font-display text-2xl font-semibold text-[var(--ink)] tracking-tight mb-1">Nuevo cliente</h2>
      <p className="text-sm text-[var(--gray-600)] mb-6">Crea un cliente del SaaS (Mandante o Proveedor) y su primer administrador.</p>

      <OperadorForm />
    </div>
  )
}
