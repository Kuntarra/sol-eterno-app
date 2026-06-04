import Link from 'next/link'
import { ReactNode } from 'react'

interface StatCardProps {
  value:   number | string
  label:   string
  sub?:    string
  href?:   string
  color?:  'navy' | 'amber' | 'green' | 'neutral'
  icon?:   ReactNode
}

export function StatCard({ value, label, sub, href, color = 'neutral', icon }: StatCardProps) {
  const valueColor =
    color === 'navy'    ? 'text-[var(--navy)]' :
    color === 'amber'   ? 'text-[var(--amber-dark)]' :
    color === 'green'   ? 'text-emerald-600' :
    'text-[var(--gray-900)]'

  const dotColor =
    color === 'navy'    ? 'bg-[var(--navy)]' :
    color === 'amber'   ? 'bg-[var(--amber)]' :
    color === 'green'   ? 'bg-emerald-500' :
    'bg-[var(--gray-300)]'

  const content = (
    <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6
                    hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5
                    transition-all duration-200 group h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${dotColor}`} />
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--gray-100)] group-hover:bg-[var(--navy-5)]
                          flex items-center justify-center text-[var(--gray-600)]
                          transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-[2.25rem] font-bold leading-none tracking-tight ${valueColor}`}>
        {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
      </p>
      <p className="text-sm font-semibold text-[var(--navy)] mt-2 leading-snug">{label}</p>
      {sub && <p className="text-xs text-[var(--gray-600)] mt-1 leading-snug">{sub}</p>}
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }
  return content
}
