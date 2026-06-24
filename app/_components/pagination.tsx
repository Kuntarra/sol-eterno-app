import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Paginación server-side reutilizable. `hrefFor(p)` arma la URL de cada página.
export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="text-[var(--gray-600)]">Página {page} de {totalPages}</p>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] font-medium hover:bg-[var(--gray-100)]">
            <ChevronLeft size={15} strokeWidth={2.25} /> Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--gray-200)] text-[var(--ink)] font-medium hover:bg-[var(--gray-100)]">
            Siguiente <ChevronRight size={15} strokeWidth={2.25} />
          </Link>
        )}
      </div>
    </div>
  )
}
