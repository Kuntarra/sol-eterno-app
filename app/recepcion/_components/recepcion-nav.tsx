'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, LogIn, LogOut } from 'lucide-react'

const NAV = [
  {
    href: '/recepcion',
    label: 'Activos',
    exact: true,
    icon: <Users size={18} strokeWidth={1.75} />,
  },
  {
    href: '/recepcion/checkin',
    label: 'Check-in',
    exact: false,
    icon: <LogIn size={18} strokeWidth={1.75} />,
  },
  {
    href: '/recepcion/checkout',
    label: 'Check-out',
    exact: false,
    icon: <LogOut size={18} strokeWidth={1.75} />,
  },
]

export function RecepcionNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1">
      {NAV.map(item => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
