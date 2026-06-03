'use client'

import { useEffect } from 'react'

export function AutoPrint() {
  useEffect(() => {
    // Pequeño delay para que el layout termine de renderizar
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [])
  return null
}
