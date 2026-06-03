'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV = [
  {
    href: '/recepcion',
    label: 'Huéspedes activos',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/recepcion/checkin',
    label: 'Nuevo check-in',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
  },
  {
    href: '/recepcion/checkout',
    label: 'Check-out',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
]

interface Props {
  fullName: string
  properties: { name: string; city: string }[]
  impersonating?: boolean
}

export function RecepcionSidebar({ fullName, properties, impersonating }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[var(--navy)] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--amber)] flex items-center justify-center shrink-0">
            <span className="text-[var(--navy)] text-xs font-black">SE</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Sol Eterno</p>
            <p className="text-white/40 text-xs">Recepción</p>
          </div>
        </div>
      </div>

      {/* Propiedades asignadas */}
      {properties.length > 0 && (
        <div className="px-5 py-3 border-b border-white/10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Mis propiedades</p>
          {properties.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <p className="text-white text-xs font-medium leading-tight">{p.name}</p>
                <p className="text-white/40 text-xs">{p.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[var(--amber)]/15 text-[var(--amber)] font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white text-sm font-medium truncate">{fullName}</p>
        <p className="text-white/40 text-xs mb-3">Recepcionista</p>
        <form action={logout}>
          <button type="submit" className="text-xs text-white/50 hover:text-white transition-colors">
            Cerrar sesión →
          </button>
        </form>
      </div>
    </aside>
  )
}
