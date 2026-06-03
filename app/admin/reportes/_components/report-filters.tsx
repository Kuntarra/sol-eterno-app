'use client'

import { useRouter } from 'next/navigation'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const SELECT = 'px-3 py-2 rounded-lg bg-[#142d47] border border-white/20 text-white text-sm focus:outline-none'

interface Props {
  periodo: string
  mes: number
  anio: number
  filtroEmpresa: string
  filtroPropiedad: string
  empresas: { id: string; name: string }[]
  propiedades: { id: string; name: string }[]
}

export function ReportFilters({ periodo, mes, anio, filtroEmpresa, filtroPropiedad, empresas, propiedades }: Props) {
  const router = useRouter()
  const now    = new Date()
  const years  = Array.from({ length: now.getFullYear() - 2023 }, (_, i) => 2024 + i)

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      periodo, mes: String(mes), anio: String(anio),
      empresa: filtroEmpresa, propiedad: filtroPropiedad,
      ...overrides,
    })
    router.push('/admin/reportes?' + params.toString())
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* Período */}
      <select value={periodo} onChange={e => navigate({ periodo: e.target.value })} className={SELECT}>
        <option value="mensual">Mensual</option>
        <option value="anual">Anual</option>
        <option value="todo">Todo el tiempo</option>
      </select>

      {/* Mes — solo en período mensual */}
      {periodo === 'mensual' && (
        <select value={mes} onChange={e => navigate({ mes: e.target.value })} className={SELECT}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      )}

      {/* Año — en mensual y anual */}
      {(periodo === 'mensual' || periodo === 'anual') && (
        <select value={anio} onChange={e => navigate({ anio: e.target.value })} className={SELECT}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {/* Empresa */}
      <select value={filtroEmpresa} onChange={e => navigate({ empresa: e.target.value, propiedad: 'todas' })} className={SELECT}>
        <option value="todas">Todas las empresas</option>
        {empresas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      {/* Propiedad */}
      <select value={filtroPropiedad} onChange={e => navigate({ propiedad: e.target.value })} className={SELECT}>
        <option value="todas">Todas las propiedades</option>
        {propiedades.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

    </div>
  )
}
