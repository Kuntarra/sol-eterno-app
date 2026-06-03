'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV = [
  {
    href: '/alojamiento',
    label: 'Inicio',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/alojamiento/historial',
    label: 'Historial',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/alojamiento/reporte',
    label: 'Reportes',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
]

interface Props {
  companyName: string
  fullName: string
  impersonating?: boolean
}

export function ClientSidebar({ companyName, fullName, impersonating }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[var(--navy)] flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--amber)] flex items-center justify-center shrink-0">
            <span className="text-[var(--navy)] text-xs font-black">SE</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-tight truncate">Sol Eterno</p>
            <p className="text-white/40 text-xs truncate">{companyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-[var(--amber)]/15 text-[var(--amber)] font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white text-sm font-medium truncate">{fullName}</p>
        <p className="text-white/40 text-xs mb-3">Cliente</p>
        {!impersonating && (
          <form action={logout}>
            <button type="submit" className="text-xs text-white/50 hover:text-white transition-colors">
              Cerrar sesión →
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
