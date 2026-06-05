'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { BrandLogo } from '@/app/_components/brand-logo'
import { MobileBrand } from '@/app/_components/mobile-brand'

const NAV = [
  {
    href: '/recepcion', label: 'Huéspedes', exact: true,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/recepcion/checkin', label: 'Check-in', exact: false,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  },
  {
    href: '/recepcion/checkout', label: 'Check-out', exact: false,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  },
]

interface Props {
  fullName: string
  properties: { name: string; city: string }[]
  impersonating?: boolean
}

function LogoBadge({ symbolSize = 25 }: { symbolSize?: number }) {
  return (
    <div className="bg-white rounded-xl px-2.5 py-2 shrink-0 flex items-center justify-center
                    shadow-[0_2px_8px_rgb(0_0_0/0.25)]">
      <BrandLogo symbolSize={symbolSize} />
    </div>
  )
}

function isActiveRoute(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

function NavItem({ href, label, exact, icon, onClick }: { href: string; label: string; exact: boolean; icon: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname()
  const active = isActiveRoute(pathname, href, exact)

  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-[var(--amber)]/12 text-[var(--amber)]'
          : 'text-white/55 hover:text-white hover:bg-white/6'
        }`}>
      <span className={`shrink-0 transition-colors ${active ? 'text-[var(--amber)]' : 'text-white/40 group-hover:text-white/70'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--amber)] shrink-0" />}
    </Link>
  )
}

function SidebarContent({ fullName, properties, onClose }: { fullName: string; properties: Props['properties']; onClose?: () => void }) {
  return (
    <>
      {/* Marca */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/10 border border-white/10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo símbolo.jpg" alt="Sol Eterno" className="w-10 h-10 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight tracking-tight">Sol Eterno</p>
            <p className="text-white/40 text-[10px] leading-tight">Recepción</p>
          </div>
        </div>
      </div>

      {/* Propiedades asignadas */}
      {properties.length > 0 && (
        <div className="px-4 py-3.5 border-b border-white/8">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/25 mb-2">Mis propiedades</p>
          <div className="space-y-1.5">
            {properties.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium leading-tight truncate">{p.name}</p>
                  {p.city && <p className="text-white/35 text-[10px]">{p.city}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25">Operaciones</p>
        <div className="space-y-0.5">
          {NAV.map(item => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
              <span className="text-white/70 text-xs font-bold">
                {(fullName ?? '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{fullName}</p>
              <p className="text-white/35 text-[10px]">Recepcionista</p>
            </div>
          </div>
          <form action={logout} className="w-full">
            <button type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl
                         text-white/50 hover:text-white hover:bg-white/6
                         text-xs font-medium transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export function RecepcionSidebar({ fullName, properties, impersonating }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[220px] min-h-screen bg-[var(--navy)] flex-col shrink-0 border-r border-white/5">
        <SidebarContent fullName={fullName} properties={properties} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className={`md:hidden fixed ${impersonating ? 'top-8' : 'top-0'} inset-x-0 z-40 h-16 bg-[var(--navy)] border-b border-white/8 flex items-center px-4 gap-3`}>
        <MobileBrand subtitle={properties.length === 1 ? properties[0].name : undefined} />
        <div className="flex-1 min-w-0" />
        <button onClick={() => setOpen(true)}
          className="p-2 text-white/60 hover:text-white hover:bg-white/8 rounded-lg transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-[260px] max-w-[88vw] bg-[var(--navy)] flex flex-col h-full border-r border-white/8">
            <div className="absolute top-4 right-4">
              <button onClick={() => setOpen(false)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <SidebarContent fullName={fullName} properties={properties} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--navy)] border-t border-white/8">
        <div className="flex">
          {NAV.map(item => {
            const active = isActiveRoute(pathname, item.href, item.exact)
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  active ? 'text-[var(--amber)]' : 'text-white/50 hover:text-white'
                }`}>
                <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          <form action={logout} className="flex-1">
            <button type="submit" className="w-full h-full flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="text-[10px] font-medium">Salir</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}
