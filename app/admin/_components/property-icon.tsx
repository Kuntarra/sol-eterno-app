import { PropertyType } from '@/lib/types'

const ICONS: Record<PropertyType, { icon: React.ReactNode; bg: string; fg: string }> = {
  hotel: {
    bg: 'bg-[var(--navy)]',
    fg: 'text-[var(--amber)]',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="14" width="36" height="30" strokeWidth="2.2" />
        <path d="M6 14l18-10 18 10" strokeWidth="2.2" />
        <rect x="12" y="20" width="6" height="6" strokeWidth="1.8" />
        <rect x="21" y="20" width="6" height="6" strokeWidth="1.8" />
        <rect x="30" y="20" width="6" height="6" strokeWidth="1.8" />
        <rect x="12" y="30" width="6" height="6" strokeWidth="1.8" />
        <rect x="30" y="30" width="6" height="6" strokeWidth="1.8" />
        <rect x="19" y="32" width="10" height="12" strokeWidth="1.8" />
        <line x1="24" y1="6" x2="24" y2="2" strokeWidth="2" />
      </svg>
    ),
  },
  hostal: {
    bg: 'bg-[var(--amber)]',
    fg: 'text-[var(--navy)]',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22L24 6l20 16" strokeWidth="2.2" />
        <rect x="8" y="22" width="32" height="22" strokeWidth="2.2" />
        <rect x="14" y="28" width="7" height="7" strokeWidth="1.8" />
        <rect x="27" y="28" width="7" height="7" strokeWidth="1.8" />
        <rect x="19" y="34" width="10" height="10" strokeWidth="1.8" />
        <path d="M32 6h5v8" strokeWidth="1.8" />
      </svg>
    ),
  },
  departamento: {
    bg: 'bg-slate-700',
    fg: 'text-sky-300',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="4" width="28" height="40" strokeWidth="2.2" />
        <line x1="10" y1="14" x2="38" y2="14" strokeWidth="1.6" />
        <line x1="10" y1="24" x2="38" y2="24" strokeWidth="1.6" />
        <line x1="10" y1="34" x2="38" y2="34" strokeWidth="1.6" />
        <line x1="24" y1="4" x2="24" y2="44" strokeWidth="1.6" />
        <rect x="14" y="7" width="4" height="5" strokeWidth="1.4" />
        <rect x="26" y="7" width="4" height="5" strokeWidth="1.4" />
        <rect x="14" y="17" width="4" height="5" strokeWidth="1.4" />
        <rect x="26" y="17" width="4" height="5" strokeWidth="1.4" />
        <rect x="14" y="27" width="4" height="5" strokeWidth="1.4" />
        <rect x="26" y="27" width="4" height="5" strokeWidth="1.4" />
        <rect x="19" y="36" width="10" height="8" strokeWidth="1.8" />
      </svg>
    ),
  },
  oficina: {
    bg: 'bg-emerald-700',
    fg: 'text-emerald-200',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="36" height="36" strokeWidth="2.2" />
        <line x1="6" y1="18" x2="42" y2="18" strokeWidth="1.6" />
        <line x1="6" y1="28" x2="42" y2="28" strokeWidth="1.6" />
        <line x1="6" y1="38" x2="42" y2="38" strokeWidth="1.6" />
        <line x1="18" y1="8" x2="18" y2="44" strokeWidth="1.6" />
        <line x1="30" y1="8" x2="30" y2="44" strokeWidth="1.6" />
        <rect x="10" y="2" width="28" height="8" strokeWidth="2" />
        <rect x="20" y="32" width="8" height="12" strokeWidth="1.8" />
      </svg>
    ),
  },
}

interface Props {
  type: PropertyType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { wrapper: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  md: { wrapper: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7' },
  lg: { wrapper: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10' },
}

export function PropertyIcon({ type, size = 'md', className = '' }: Props) {
  const { bg, fg, icon } = ICONS[type] ?? ICONS.hotel
  const { wrapper, icon: iconSize } = SIZES[size]

  return (
    <div className={`${wrapper} ${bg} flex items-center justify-center shrink-0 shadow-sm ${className}`}>
      <div className={`${iconSize} ${fg}`}>
        {icon}
      </div>
    </div>
  )
}
