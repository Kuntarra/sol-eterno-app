import { Bus, BedDouble, UtensilsCrossed, Package, Shirt, Check, Circle, type LucideIcon } from 'lucide-react'

// Etapas del ciclo logístico de una persona, en orden. Cada etapa = un módulo.
type Etapa = { key: string; label: string; Icon: LucideIcon; dot: string; ring: string; soft: string; ink: string }
const ETAPAS: Etapa[] = [
  { key: 'transporte',   label: 'Transporte',   Icon: Bus,             dot: 'bg-sky-500',     ring: 'ring-sky-500/30',     soft: 'bg-sky-50',     ink: 'text-sky-700' },
  { key: 'hotel',        label: 'Alojamiento',  Icon: BedDouble,       dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', soft: 'bg-emerald-50', ink: 'text-emerald-700' },
  { key: 'alimentacion', label: 'Alimentación', Icon: UtensilsCrossed, dot: 'bg-amber-500',   ring: 'ring-amber-500/30',   soft: 'bg-amber-50',   ink: 'text-amber-700' },
  { key: 'colaciones',   label: 'Colaciones',   Icon: Package,         dot: 'bg-violet-500',  ring: 'ring-violet-500/30',  soft: 'bg-violet-50',  ink: 'text-violet-700' },
  { key: 'lavanderia',   label: 'Lavandería',   Icon: Shirt,           dot: 'bg-cyan-500',    ring: 'ring-cyan-500/30',    soft: 'bg-cyan-50',    ink: 'text-cyan-700' },
]

// Línea de trazabilidad horizontal: sigue a la persona por su cadena logística.
// Cada nodo muestra si esa etapa está confirmada (tiene evento) o pendiente.
export function TrazaLinea({ modulosActivos, confirmados }: { modulosActivos: string[]; confirmados: Record<string, number> }) {
  const etapas = ETAPAS.filter((e) => modulosActivos.includes(e.key))
  if (!etapas.length) return null

  const hechas = etapas.filter((e) => (confirmados[e.key] ?? 0) > 0).length

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Línea de trazabilidad</h2>
          <p className="text-xs text-[var(--gray-600)] mt-0.5">Recorrido de la persona por la cadena de servicios.</p>
        </div>
        <span className="text-xs font-medium text-[var(--gray-600)] tabular-nums">{hechas}/{etapas.length} confirmadas</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative flex items-start justify-between gap-2" style={{ minWidth: `${etapas.length * 104}px` }}>
          {/* Línea base que conecta los nodos */}
          <div className="absolute left-0 right-0 top-[34px] h-0.5 bg-[var(--gray-200)]" />

          {etapas.map((e) => {
            const conf = (confirmados[e.key] ?? 0) > 0
            return (
              <div key={e.key} className="relative flex flex-col items-center flex-1 min-w-[92px]">
                {/* Etiqueta arriba */}
                <div className="flex items-center gap-1.5 mb-2 h-4">
                  <e.Icon size={13} strokeWidth={2} className={conf ? e.ink : 'text-[var(--gray-400)]'} />
                  <span className={`text-[11px] font-semibold ${conf ? 'text-[var(--ink)]' : 'text-[var(--gray-500)]'}`}>{e.label}</span>
                </div>

                {/* Nodo sobre la línea */}
                <div className={`relative z-10 w-[18px] h-[18px] rounded-full ring-4 ring-[var(--surface)] flex items-center justify-center
                  ${conf ? `${e.dot}` : 'bg-[var(--gray-300)]'}`}>
                  {conf && <span className={`absolute inset-0 rounded-full ${e.dot} animate-ping opacity-40`} />}
                </div>

                {/* Control / estado debajo (como los checkpoints del diagrama) */}
                <div className={`mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                  ${conf ? `${e.soft} ${e.ink}` : 'bg-[var(--gray-100)] text-[var(--gray-500)]'}`}>
                  {conf ? <><Check size={11} strokeWidth={2.5} /> Confirmado</> : <><Circle size={9} strokeWidth={2} /> Pendiente</>}
                </div>
                {conf && (confirmados[e.key] ?? 0) > 1 && (
                  <span className="mt-1 text-[10px] text-[var(--gray-500)] tabular-nums">{confirmados[e.key]} eventos</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
