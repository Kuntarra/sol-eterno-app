import Link from 'next/link'

export default function CheckinPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/recepcion" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[var(--navy)]">Check-in</h1>
      </div>
      <p className="text-sm text-[var(--gray-600)]">Módulo en construcción — Paso 6.</p>
    </div>
  )
}
