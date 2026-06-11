'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, HelpCircle, ChevronDown, LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'

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
  const router    = useRouter()
  const label     = getLabel(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const initials  = fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  function onSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const q = (e.target as HTMLInputElement).value.trim()
    if (!q) return
    router.push(`/admin/estadias?filter=todas&q=${encodeURIComponent(q)}`)
  }

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
          <Search size={15} strokeWidth={1.75} stroke="var(--gray-500)" className="shrink-0" />
          <input
            className="bg-transparent text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-500)]
                       outline-none flex-1 w-full"
            placeholder="Buscar huésped, RUT o habitación…"
            onKeyDown={onSearch}
          />
        </label>
      </div>

      {/* Acciones */}
      <div className="ml-auto flex items-center gap-1.5">
        <a
          href="https://wa.me/56982172261"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--gray-500)]
                     hover:bg-[var(--gray-100)] hover:text-[var(--navy)] transition-colors"
          title="Ayuda y soporte">
          <HelpCircle size={16} strokeWidth={1.75} />
        </a>

        <div className="w-px h-5 bg-[var(--gray-200)] mx-1.5" />

        {/* Perfil con menú */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl
                       hover:bg-[var(--gray-100)] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-[var(--navy)] flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--navy)] leading-tight">{fullName}</p>
              <p className="text-[10px] text-[var(--gray-500)] leading-tight">{role}</p>
            </div>
            <ChevronDown size={13} strokeWidth={2} stroke="var(--gray-400)"
              className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 z-50 bg-white rounded-xl border border-[var(--gray-200)]
                              shadow-[var(--shadow-lg)] overflow-hidden py-1">
                <form action={logout}>
                  <button type="submit"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--gray-700)]
                               hover:bg-[var(--gray-50)] hover:text-[var(--navy)] transition-colors">
                    <LogOut size={15} strokeWidth={1.75} />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
