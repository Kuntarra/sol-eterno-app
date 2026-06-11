'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { impersonate } from '@/app/actions/impersonate'
import { Repeat, ChevronDown } from 'lucide-react'

const VIEWS = [
  { label: 'Admin',     href: '/admin',      color: 'bg-[var(--navy)] text-white',         dot: 'bg-[var(--navy)]',  desc: 'Panel administrador' },
  { label: 'Recepción', href: '/recepcion',  color: 'bg-emerald-600 text-white',            dot: 'bg-emerald-500',    desc: 'Vista recepcionista' },
  { label: 'Cliente',   href: '/alojamiento',color: 'bg-[var(--amber)] text-[var(--navy)]', dot: 'bg-[var(--amber)]', desc: 'Portal empresa' },
]

const ROLE_LABELS: Record<string, string> = {
  receptionist: 'Recepcionista',
  client: 'Cliente',
}

interface User { id: string; full_name: string | null; role: string; email: string | null }

export function RoleSwitcher({ users }: { users: User[] }) {
  const [open, setOpen]   = useState(false)
  const [tab, setTab]     = useState<'vistas' | 'usuarios'>('vistas')
  const pathname = usePathname()

  const current = VIEWS.find(v =>
    v.href === '/admin' ? pathname.startsWith('/admin') : pathname.startsWith(v.href)
  ) ?? VIEWS[0]

  const receptionists = users.filter(u => u.role === 'receptionist')
  const clients       = users.filter(u => u.role === 'client')

  return (
    <div className="no-print fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 bg-white rounded-xl shadow-xl border border-[var(--gray-200)] overflow-hidden w-64">

          {/* Tabs */}
          <div className="flex border-b border-[var(--gray-100)]">
            {(['vistas', 'usuarios'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-xs font-semibold py-2.5 capitalize transition-colors ${tab === t ? 'text-[var(--navy)] border-b-2 border-[var(--navy)]' : 'text-[var(--gray-500)] hover:text-[var(--navy)]'}`}>
                {t === 'vistas' ? 'Vista previa' : 'Ver como usuario'}
              </button>
            ))}
          </div>

          {tab === 'vistas' ? (
            VIEWS.map(view => {
              const isActive = view.href === '/admin'
                ? pathname.startsWith('/admin')
                : pathname.startsWith(view.href)
              return (
                <Link key={view.href} href={view.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors ${isActive ? 'bg-[var(--gray-50)]' : ''}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${view.dot}`} style={{ opacity: isActive ? 1 : 0.3 }} />
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-[var(--navy)]' : 'text-[var(--gray-900)]'}`}>
                      {view.label}
                      {isActive && <span className="ml-1.5 text-xs text-[var(--gray-500)] font-normal">actual</span>}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]">{view.desc}</p>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {!users.length && (
                <p className="text-xs text-[var(--gray-500)] px-4 py-4">No hay usuarios creados aún.</p>
              )}
              {receptionists.length > 0 && (
                <>
                  <p className="text-xs font-bold text-[var(--gray-500)] uppercase tracking-wider px-4 pt-3 pb-1">Recepcionistas</p>
                  {receptionists.map(u => (
                    <button key={u.id}
                      onClick={() => { setOpen(false); impersonate(u.id, '/recepcion') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--gray-50)] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-emerald-700">
                          {(u.full_name ?? u.email ?? '?').slice(0,2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--navy)] truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-500)] truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {clients.length > 0 && (
                <>
                  <p className="text-xs font-bold text-[var(--gray-500)] uppercase tracking-wider px-4 pt-3 pb-1">Clientes</p>
                  {clients.map(u => (
                    <button key={u.id}
                      onClick={() => { setOpen(false); impersonate(u.id, '/alojamiento') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--gray-50)] transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-700">
                          {(u.full_name ?? u.email ?? '?').slice(0,2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--navy)] truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-500)] truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all hover:shadow-xl active:scale-95 ${current.color}`}>
        <Repeat size={15} strokeWidth={2} />
        {current.label}
        <ChevronDown size={13} strokeWidth={2.25} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
