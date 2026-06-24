'use client'

import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'

export function SugerenciaFecha({ fecha }: { fecha: string }) {
  const router = useRouter()
  const ir = (f: string) => router.push(`/admin/colaciones?sugfecha=${f}`)
  const mover = (dias: number) => {
    const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + dias)
    ir(d.toISOString().slice(0, 10))
  }
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={fecha} onChange={(e) => ir(e.target.value || fecha)} className={`${INPUT} w-40`} />
      <div className="flex flex-col">
        <button type="button" onClick={() => mover(1)} title="Día siguiente" className="px-2 py-0.5 rounded-t-md border border-[var(--gray-200)] bg-white hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronUp size={14} strokeWidth={2.5} /></button>
        <button type="button" onClick={() => mover(-1)} title="Día anterior" className="px-2 py-0.5 rounded-b-md border border-t-0 border-[var(--gray-200)] bg-white hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronDown size={14} strokeWidth={2.5} /></button>
      </div>
    </div>
  )
}
