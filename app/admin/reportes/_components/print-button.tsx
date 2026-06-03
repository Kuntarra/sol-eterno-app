'use client'

import { useSearchParams } from 'next/navigation'

export function PrintButton() {
  const searchParams = useSearchParams()

  function abrir() {
    const params = new URLSearchParams({
      periodo:   searchParams.get('periodo')   ?? 'mensual',
      mes:       searchParams.get('mes')       ?? String(new Date().getMonth() + 1),
      anio:      searchParams.get('anio')      ?? String(new Date().getFullYear()),
      empresa:   searchParams.get('empresa')   ?? 'todas',
      propiedad: searchParams.get('propiedad') ?? 'todas',
    })
    window.open('/print/reporte?' + params.toString(), '_blank')
  }

  return (
    <button
      onClick={abrir}
      className="no-print flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Descargar PDF
    </button>
  )
}
