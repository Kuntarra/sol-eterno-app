'use client'

import { usePathname } from 'next/navigation'

const PAGE_LABELS: Record<string, string> = {
  '/admin':              'Panel de Control',
  '/admin/estadias':     'Estadías',
  '/admin/reportes':     'Reportes',
  '/admin/propiedades':  'Propiedades',
  '/admin/clientes':     'Clientes',
  '/admin/usuarios':     'Usuarios',
}

function getLabel(pathname: string) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  for (const [k, v] of Object.entries(PAGE_LABELS)) {
    if (k !== '/admin' && pathname.startsWith(k + '/')) return v
  }
  return 'Admin'
}

interface Props {
  fullName: string
  role?: string
}

export function AdminTopBar({ fullName, role = 'Administrador' }: Props) {
  const pathname  = usePathname()
  const label     = getLabel(pathname)
  const initials  = fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <header className="hidden md:flex h-14 bg-white border-b border-[var(--gray-200)] items-center px-6 gap-4 shrink-0 sticky top-0 z-30">

      {/* Título de página */}
      <span className="text-sm font-semibold text-[var(--navy)] min-w-0 truncate mr-2">
        {label}
      </span>

      {/* Buscador */}
      <div className="flex-1 max-w-xs">
        <label className="flex items-center gap-2.5 px-3.5 py-2 bg-[var(--gray-100)] rounded-xl
                          border border-transparent hover:border-[var(--gray-200)] transition-colors cursor-text">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="bg-transparent text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-500)]
                       outline-none flex-1 w-full"
            placeholder="Buscar reporte o propiedad…"
            readOnly
          />
        </label>
      </div>

      {/* Acciones */}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--gray-500)]
                     hover:bg-[var(--gray-100)] hover:text-[var(--navy)] transition-colors"
          title="Notificaciones">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--gray-500)]
                     hover:bg-[var(--gray-100)] hover:text-[var(--navy)] transition-colors"
          title="Ayuda">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>

        <div className="w-px h-5 bg-[var(--gray-200)] mx-1.5" />

        {/* Perfil */}
        <div className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl
                        hover:bg-[var(--gray-100)] transition-colors cursor-default">
          <div className="w-7 h-7 rounded-lg bg-[var(--navy)] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-[var(--navy)] leading-tight">{fullName}</p>
            <p className="text-[10px] text-[var(--gray-500)] leading-tight">{role}</p>
          </div>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </header>
  )
}
