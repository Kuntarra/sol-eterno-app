'use client'

import { useState } from 'react'

export function PrintButton() {
  const [loading, setLoading] = useState(false)

  async function descargar() {
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF       = (await import('jspdf')).default

      const el = document.getElementById('reporte-contenido')
      if (!el) return

      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#f1f3f5',
        windowWidth: 1200,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const pdfW   = pdf.internal.pageSize.getWidth()
      const pdfH   = pdf.internal.pageSize.getHeight()
      const ratio  = canvas.width / canvas.height
      const imgH   = pdfW / ratio

      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pdfW, imgH)
        y += pdfH
      }

      pdf.save('reporte-sol-eterno.pdf')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={descargar}
      disabled={loading}
      className="no-print flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
    >
      {loading ? (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      {loading ? 'Generando…' : 'Descargar PDF'}
    </button>
  )
}
