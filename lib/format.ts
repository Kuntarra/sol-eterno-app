// Formateo de fechas/horas para Chile. Fuente única para toda la app.

const CL = 'es-CL'

/** 18-05-2026 */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(CL, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** 18-05-26 (año corto, para tablas densas) */
export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(CL, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** 18-05-2026, 14:05 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(CL, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** 18 de mayo de 2026 */
export function formatDateLong(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(CL, { day: 'numeric', month: 'long', year: 'numeric' })
}
