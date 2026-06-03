'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VIEWS = [
  {
    label: 'Admin',
    href: '/admin',
    color: 'bg-[var(--navy)] text-white',
    dot: 'bg-white',
    desc: 'Panel administrador',
  },
  {
    label: 'Recepción',
    href: '/recepcion',
    color: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-300',
    desc: 'Vista recepcionista',
  },
  {
    label: 'Cliente',
    href: '/alojamiento',
    color: 'bg-[var(--amber)] text-[var(--navy)]',
    dot: 'bg-[var(--navy)]',
    desc: 'Portal empresa',
  },
]

export function RoleSwitcher() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const current = VIEWS.find(v =>
    v.href === '/admin'
      ? pathname.startsWith('/admin')
      : pathname.startsWith(v.href)
  ) ?? VIEWS[0]

  return (
    <div className="no-print fixed bottom-6 right-6 z-50">
      {/* Menú desplegable */}
      {open && (
        <div className="mb-3 bg-white rounded-xl shadow-xl border border-[var(--gray-200)] overflow-hidden w-52">
          <p className="text-xs font-semibold text-[var(--gray-600)] px-4 py-2.5 border-b border-[var(--gray-100)] uppercase tracking-wider">
            Vista previa
          </p>
          {VIEWS.map((view) => {
            const isActive = view.href === '/admin'
              ? pathname.startsWith('/admin')
              : pathname.startsWith(view.href)

            return (
              <Link
                key={view.href}
                href={view.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors ${isActive ? 'bg-[var(--gray-50)]' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${view.dot} ${isActive ? 'opacity-100' : 'opacity-30'} ${view.color.includes('navy') ? 'bg-[var(--navy)]' : view.color.includes('amber') ? 'bg-[var(--amber)]' : 'bg-emerald-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${isActive ? 'text-[var(--navy)]' : 'text-[var(--gray-900)]'}`}>
                    {view.label}
                    {isActive && <span className="ml-1.5 text-xs text-[var(--gray-600)] font-normal">actual</span>}
                  </p>
                  <p className="text-xs text-[var(--gray-600)]">{view.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Botón principal */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all hover:shadow-xl active:scale-95 ${current.color}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        {current.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  )
}
