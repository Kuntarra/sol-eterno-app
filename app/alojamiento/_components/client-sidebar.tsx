'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { BrandLogo } from '@/app/_components/brand-logo'
import { MobileBrand } from '@/app/_components/mobile-brand'

const NAV = [
  {
    href: '/alojamiento', label: 'Inicio', exact: true,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: '/alojamiento/historial', label: 'Historial', exact: false,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    href: '/alojamiento/reporte', label: 'Reportes', exact: false,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
]

interface Props {
  companyName: string
  fullName: string
  impersonating?: boolean
}

function BrandCard({ symbolSize = 28 }: { symbolSize?: number }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2 shrink-0 flex items-center justify-center
                    shadow-[0_2px_8px_rgb(0_0_0/0.20)]">
      <BrandLogo symbolSize={symbolSize} />
    </div>
  )
}

export function ClientSidebar({ companyName, fullName, impersonating }: Props) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[var(--navy)] flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo símbolo.jpg" alt="Sol Eterno" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-[15px] leading-tight tracking-tight">Sol Eterno</p>
              <p className="text-white/40 text-[10px] leading-tight truncate">{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item) ? 'bg-[var(--amber)]/15 text-[var(--amber)] font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white text-sm font-medium truncate">{fullName}</p>
          <p className="text-white/40 text-xs mb-3">Cliente</p>
          {!impersonating && (
            <form action={logout}>
              <button type="submit" className="text-xs text-white/50 hover:text-white transition-colors">Cerrar sesión →</button>
            </form>
          )}
        </div>
      </aside>

      {/* ── Mobile: top bar ────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-[var(--navy)] flex items-center px-4 gap-3 shadow-lg">
        <MobileBrand subtitle={companyName} />
        <div className="flex-1 min-w-0" />
        <p className="text-white/50 text-xs truncate max-w-[30%]">{fullName}</p>
      </div>

      {/* ── Mobile: bottom navigation ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--navy)] border-t border-white/10 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-[var(--amber)]' : 'text-white/50 hover:text-white'
              }`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        {!impersonating && (
          <form action={logout} className="flex-1">
            <button type="submit" className="w-full h-full flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="text-[10px] font-medium">Salir</span>
            </button>
          </form>
        )}
      </nav>
    </>
  )
}
