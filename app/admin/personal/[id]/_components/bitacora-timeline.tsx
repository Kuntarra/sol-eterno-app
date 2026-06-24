import { Bus, BedDouble, UtensilsCrossed, Package, Shirt, Activity, Clock, type LucideIcon } from 'lucide-react'

export type EventoVivo = {
  id: string
  modulo: string
  tipo: string
  detalle: string | null
  autor_nombre: string | null
  created_at: string
  proyectos: { nombre: string } | null
}

// Acción legible por tipo de evento.
const EVENTO_LABEL: Record<string, string> = {
  subio: 'Subió al transporte', dejado: 'Bajó del transporte', no_show: 'No se presentó',
  check_in: 'Check-in en el hotel', check_out: 'Check-out del hotel',
  entregada: 'Entrega realizada', recepcionada: 'Recepcionada', nota: 'Nota',
}

// Identidad visual por módulo (icono + color).
type ModuloMeta = { label: string; Icon: LucideIcon; color: string; bg: string }
const MODULO_META: Record<string, ModuloMeta> = {
  transporte:   { label: 'Transporte',   Icon: Bus,             color: 'text-sky-700',     bg: 'bg-sky-100' },
  hotel:        { label: 'Hotel',        Icon: BedDouble,       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  alimentacion: { label: 'Alimentación', Icon: UtensilsCrossed, color: 'text-amber-700',   bg: 'bg-amber-100' },
  colaciones:   { label: 'Colaciones',   Icon: Package,         color: 'text-violet-700',  bg: 'bg-violet-100' },
  lavanderia:   { label: 'Lavandería',   Icon: Shirt,           color: 'text-cyan-700',    bg: 'bg-cyan-100' },
}
const DEFAULT_META: ModuloMeta = { label: 'Actividad', Icon: Activity, color: 'text-slate-700', bg: 'bg-slate-100' }

function hace(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'recién'
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`
  const mo = Math.floor(d / 30); if (mo < 12) return `hace ${mo} mes${mo > 1 ? 'es' : ''}`
  return `hace ${Math.floor(mo / 12)} año(s)`
}
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function BitacoraTimeline({ eventos }: { eventos: EventoVivo[] }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Bitácora viva</h2>
        <span className="text-xs text-[var(--gray-600)]">· seguimiento de la persona en terreno</span>
        {eventos.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-[var(--gray-600)] tabular-nums">{eventos.length} evento{eventos.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {!eventos.length ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center">
            <Clock size={24} strokeWidth={1.5} className="text-[var(--gray-600)]" />
          </div>
          <p className="text-sm font-medium text-[var(--gray-600)]">Aún no hay actividad registrada</p>
          <p className="text-xs text-[var(--gray-500)] mt-1 max-w-sm mx-auto">Cuando el personal en terreno marque eventos (subió al bus, check-in, comida entregada…) aparecerán aquí, en orden, en tiempo real.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-5 sm:p-6">
          <ol className="relative">
            {eventos.map((e, i) => {
              const meta = MODULO_META[e.modulo] ?? DEFAULT_META
              const { Icon } = meta
              const last = i === eventos.length - 1
              return (
                <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!last && <span className="absolute left-[19px] top-11 bottom-0 w-px bg-[var(--gray-200)]" aria-hidden />}
                  <span className={`relative z-10 w-10 h-10 rounded-xl ${meta.bg} ${meta.color} ring-4 ring-white flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--ink)] leading-tight">{EVENTO_LABEL[e.tipo] ?? e.tipo}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    {e.detalle && <p className="text-sm text-[var(--gray-700)] mt-0.5">{e.detalle}</p>}
                    <p className="text-xs text-[var(--gray-500)] mt-1 flex items-center gap-x-1.5 gap-y-0.5 flex-wrap tabular-nums">
                      <span className="font-medium text-[var(--gray-600)]">{hace(e.created_at)}</span>
                      <span aria-hidden>·</span>
                      <span>{fmtFecha(e.created_at)}</span>
                      {e.autor_nombre && (<><span aria-hidden>·</span><span>por {e.autor_nombre}</span></>)}
                      {e.proyectos?.nombre && (<><span aria-hidden>·</span><span className="text-[var(--gray-600)]">{e.proyectos.nombre}</span></>)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
