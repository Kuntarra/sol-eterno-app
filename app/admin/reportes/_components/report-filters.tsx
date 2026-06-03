'use client'

import { useRouter } from 'next/navigation'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

interface Props {
  mes: number
  anio: number
  filtroEmpresa: string
  empresas: { id: string; name: string }[]
}

export function ReportFilters({ mes, anio, filtroEmpresa, empresas }: Props) {
  const router = useRouter()
  const now    = new Date()
  const years  = Array.from({ length: now.getFullYear() - 2023 }, (_, i) => 2024 + i)

  function navigate(newMes: number, newAnio: number, newEmpresa: string) {
    const params = new URLSearchParams({ mes: String(newMes), anio: String(newAnio), empresa: newEmpresa })
    router.push('/admin/reportes?' + params.toString())
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={filtroEmpresa}
        onChange={e => navigate(mes, anio, e.target.value)}
        className="px-3 py-2 rounded-lg bg-[#142d47] border border-white/20 text-white text-sm focus:outline-none"
      >
        <option value="todas">Todas las empresas</option>
        {empresas.map(e => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>

      <select
        value={mes}
        onChange={e => navigate(parseInt(e.target.value), anio, filtroEmpresa)}
        className="px-3 py-2 rounded-lg bg-[#142d47] border border-white/20 text-white text-sm focus:outline-none"
      >
        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>

      <select
        value={anio}
        onChange={e => navigate(mes, parseInt(e.target.value), filtroEmpresa)}
        className="px-3 py-2 rounded-lg bg-[#142d47] border border-white/20 text-white text-sm focus:outline-none"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
