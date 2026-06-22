import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { IdCard, FolderKanban, Bus, UtensilsCrossed, Package, Shirt, Plane } from 'lucide-react'

async function count(table: string) {
  const supabase = await createClient()
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  return count ?? 0
}

export default async function DotiaOverviewPage() {
  const [personas, proyectos, dotaciones, rotaciones, traslados, colaciones, bolsas] = await Promise.all([
    count('persona_directorio'), count('proyectos'), count('dotaciones'),
    count('rotaciones'), count('traslados'), count('colaciones'), count('lavanderia_bolsas'),
  ])

  const cards = [
    { label: 'Personal', value: personas, href: '/admin/personal', icon: <IdCard size={20} strokeWidth={1.75} /> },
    { label: 'Proyectos', value: proyectos, href: '/admin/proyectos', icon: <FolderKanban size={20} strokeWidth={1.75} /> },
    { label: 'Dotaciones', value: dotaciones, href: '/admin/proyectos', icon: <Plane size={20} strokeWidth={1.75} /> },
    { label: 'Rotaciones', value: rotaciones, href: '/admin/proyectos', icon: <Plane size={20} strokeWidth={1.75} /> },
    { label: 'Traslados', value: traslados, href: '/admin/transporte', icon: <Bus size={20} strokeWidth={1.75} /> },
    { label: 'Colaciones', value: colaciones, href: '/admin/colaciones', icon: <Package size={20} strokeWidth={1.75} /> },
    { label: 'Bolsas lavandería', value: bolsas, href: '/admin/lavanderia', icon: <Shirt size={20} strokeWidth={1.75} /> },
  ]

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Trazabilidad de personal</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Dotia · Resumen</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Centro de control de la operación en faena</p>
      </div>

      <div className="px-8 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="premium-card group block p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--navy)]/5 flex items-center justify-center text-[var(--navy)]">{c.icon}</div>
              </div>
              <p className="text-3xl font-bold text-[var(--navy)] tabular-nums leading-none mb-1">{c.value}</p>
              <p className="text-sm text-[var(--gray-600)] group-hover:text-[var(--navy)]">{c.label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: 'Alimentación', href: '/admin/alimentacion', icon: <UtensilsCrossed size={16} strokeWidth={2} /> },
            { label: 'Transporte', href: '/admin/transporte', icon: <Bus size={16} strokeWidth={2} /> },
            { label: 'Colaciones', href: '/admin/colaciones', icon: <Package size={16} strokeWidth={2} /> },
            { label: 'Lavandería', href: '/admin/lavanderia', icon: <Shirt size={16} strokeWidth={2} /> },
          ].map((m) => (
            <Link key={m.label} href={m.href} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[var(--gray-200)] text-sm font-semibold text-[var(--navy)] hover:bg-[var(--gray-100)] transition-colors">
              {m.icon} {m.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
