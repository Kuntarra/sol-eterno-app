// Paginación compartida por los listados (Transporte, Estadías, Personal…).
// Centraliza el tamaño de página y la aritmética de rango que estaba duplicada
// en cada page.tsx.
export const PAGE_SIZE = 50

// Número de página seguro desde el query string (?page=).
export function parsePage(raw?: string): number {
  return Math.max(1, Number(raw) || 1)
}

// Rango [from, to] para supabase .range(), a partir de la página.
export function rangeFor(page: number, size: number = PAGE_SIZE): { from: number; to: number; size: number } {
  const from = (page - 1) * size
  return { from, to: from + size - 1, size }
}

// Total de páginas desde el conteo de filas.
export function totalPages(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size))
}
