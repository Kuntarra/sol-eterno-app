import { ReactNode } from 'react'

interface PageHeaderProps {
  label?: string          // etiqueta ámbar uppercase (patrón brochure)
  title: string
  subtitle?: string
  action?: ReactNode
  border?: boolean        // línea divisoria inferior
}

export function PageHeader({ label, title, subtitle, action, border = true }: PageHeaderProps) {
  return (
    <div className={`px-8 pt-8 pb-7 ${border ? 'border-b border-[var(--gray-200)] mb-8' : 'mb-8'}`}>
      {label && <span className="section-label">{label}</span>}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[1.9rem] font-semibold text-[var(--navy)] leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
