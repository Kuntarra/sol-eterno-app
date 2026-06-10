'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { BrandLogo } from '@/app/_components/brand-logo'
import { MobileBrand } from '@/app/_components/mobile-brand'

const NAV_GROUPS = [
  {
    label: 'Operaciones',
    items: [
      { href: '/admin',            label: 'Dashboard',  exact: true,  icon: <DashIcon /> },
      { href: '/admin/estadias',   label: 'Estadías',   exact: false, icon: <StayIcon /> },
      { href: '/admin/reportes',   label: 'Reportes',   exact: false, icon: <ChartIcon /> },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/propiedades', label: 'Propiedades', exact: false, icon: <BuildIcon /> },
      { href: '/admin/clientes',    label: 'Clientes',    exact: false, icon: <BriefIcon /> },
      { href: '/admin/usuarios',    label: 'Usuarios',    exact: false, icon: <UserIcon /> },
    ],
  },
]

function BrandSection() {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-white/8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo símbolo.jpg" alt="Sol Eterno" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-[15px] leading-tight tracking-tight">Sol Eterno</p>
          <p className="text-white/40 text-[10px] leading-tight">Gestión de Alojamientos</p>
        </div>
      </div>
    </div>
  )
}

function NavItem({ href, label, exact, icon, onClose }: { href: string; label: string; exact: boolean; icon: React.ReactNode; onClose?: () => void }) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link href={href} onClick={onClose}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-[var(--amber)]/12 text-[var(--amber)] '
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

function SidebarContent({ fullName, onClose }: { fullName: string; onClose?: () => void }) {
  return (
    <>
      <BrandSection />

      {/* Navegación agrupada */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.href} {...item} onClose={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* CTA Nueva Propiedad */}
      <div className="px-3 pb-3">
        <a href="/admin/propiedades/nueva"
          className="btn-amber-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                     bg-[var(--amber)] hover:bg-[var(--amber-dark)] text-[var(--navy)]
                     text-[13px] font-bold transition-all duration-150
                     shadow-[0_4px_12px_rgb(224_163_58/0.35)] hover:shadow-[0_6px_18px_rgb(224_163_58/0.45)]
                     hover:-translate-y-px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva propiedad
        </a>
      </div>

      {/* Usuario + Cerrar sesión */}
      <div className="px-4 py-3 border-t border-white/8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
            <span className="text-white/70 text-xs font-bold">
              {(fullName ?? '?').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{fullName}</p>
            <p className="text-white/35 text-[10px]">Administrador</p>
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
    </>
  )
}

export function AdminSidebar({ fullName }: { fullName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[220px] min-h-screen bg-[var(--navy)] flex-col shrink-0 border-r border-white/5">
        <SidebarContent fullName={fullName} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-[var(--navy)]/95 backdrop-blur-md border-b border-white/8 flex items-center px-4 gap-3">
        <MobileBrand />
        <div className="flex-1 min-w-0" />
        <button onClick={() => setOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 rounded-lg transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <aside className={`relative w-[260px] max-w-[88vw] bg-[var(--navy)] flex flex-col h-full border-r border-white/8 transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-4 right-4">
            <button onClick={() => setOpen(false)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <SidebarContent fullName={fullName} onClose={() => setOpen(false)} />
        </aside>
      </div>

      {/* ── Mobile bottom nav ── */}
      <BottomNav onOpenDrawer={() => setOpen(true)} />
    </>
  )
}

function BottomNav({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname()
  const BOTTOM_NAV = [
    { href: '/admin',          label: 'Dashboard', exact: true,  icon: <DashIcon /> },
    { href: '/admin/estadias', label: 'Estadías',  exact: false, icon: <StayIcon /> },
    { href: '/admin/reportes', label: 'Reportes',  exact: false, icon: <ChartIcon /> },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--navy)]/95 backdrop-blur-md border-t border-white/8"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {BOTTOM_NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${
                active ? 'text-[var(--amber)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              {active && <span className="absolute top-0 inset-x-3 h-0.5 bg-[var(--amber)] rounded-b-full" />}
              <span className="[&>svg]:w-5 [&>svg]:h-5">{item.icon}</span>
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={onOpenDrawer}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span className="text-[11px] font-medium leading-tight">Más</span>
        </button>
      </div>
    </nav>
  )
}

/* ── Iconos ── */
function DashIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function StayIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function BuildIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6"/></svg> }
function BriefIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> }
function UserIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
