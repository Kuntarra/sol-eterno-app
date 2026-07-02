'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bus, BedDouble, UtensilsCrossed, Package, Shirt, Check, Circle, TriangleAlert, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'

type Estado = 'confirmado' | 'pendiente' | 'excepcion'
type EventoDet = { tipo: string; detalle: string | null; autor: string | null; hora: string }
export type StageData = { key: string; estado: Estado; eventos: EventoDet[]; excepcion?: { tipo: string; descripcion: string | null } | null }

type Meta = { label: string; Icon: LucideIcon; dot: string; soft: string; ink: string }
const META: Record<string, Meta> = {
  transporte:   { label: 'Transporte',   Icon: Bus,             dot: 'bg-sky-500',     soft: 'bg-sky-50',     ink: 'text-sky-700' },
  hotel:        { label: 'Alojamiento',  Icon: BedDouble,       dot: 'bg-emerald-500', soft: 'bg-emerald-50', ink: 'text-emerald-700' },
  alimentacion: { label: 'Alimentación', Icon: UtensilsCrossed, dot: 'bg-amber-500',   soft: 'bg-amber-50',   ink: 'text-amber-700' },
  colaciones:   { label: 'Colaciones',   Icon: Package,         dot: 'bg-violet-500',  soft: 'bg-violet-50',  ink: 'text-violet-700' },
  lavanderia:   { label: 'Lavandería',   Icon: Shirt,           dot: 'bg-cyan-500',    soft: 'bg-cyan-50',    ink: 'text-cyan-700' },
}
// Fases (banda superior), como Producción/Procesamiento/… del diagrama.
const FASES: { label: string; keys: string[]; bar: string }[] = [
  { label: 'Movilización', keys: ['transporte'], bar: 'bg-sky-400' },
  { label: 'Estadía en faena', keys: ['hotel', 'alimentacion', 'colaciones', 'lavanderia'], bar: 'bg-emerald-400' },
]
const EVENTO_LABEL: Record<string, string> = {
  subio: 'Subió al transporte', bajo: 'Bajó del transporte', llego: 'Llegó', checkin: 'Check-in', checkout: 'Check-out',
  entregado: 'Entregado', entregada: 'Entregada', recibido: 'Recibido',
}

export function TrazaLinea({ stages, fecha, personaId }: { stages: StageData[]; fecha: string; personaId: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState<string | null>(null)
  if (!stages.length) return null

  const hechas = stages.filter((s) => s.estado === 'confirmado').length
  const conExcepcion = stages.filter((s) => s.estado === 'excepcion').length
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })
  const hoy = new Date().toISOString().slice(0, 10)
  const moverDia = (d: number) => {
    const n = new Date(fecha + 'T00:00:00'); n.setDate(n.getDate() + d)
    router.push(`/admin/personal/${personaId}?fecha=${n.toISOString().slice(0, 10)}`)
  }
  const fasesVis = FASES.map((f) => ({ ...f, n: stages.filter((s) => f.keys.includes(s.key)).length })).filter((f) => f.n > 0)

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--gray-200)] p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Línea de trazabilidad</h2>
          <p className="text-xs text-[var(--gray-600)] mt-0.5">Recorrido de la persona por la cadena de servicios.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-medium">{hechas} conf.</span>
            {conExcepcion > 0 && <span className="text-red-600 font-medium">{conExcepcion} excep.</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => moverDia(-1)} title="Día anterior" className="p-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronLeft size={15} strokeWidth={2.5} /></button>
            <span className="text-xs font-medium text-[var(--ink)] capitalize min-w-[130px] text-center">{fechaLabel}{fecha === hoy ? ' · hoy' : ''}</span>
            <button onClick={() => moverDia(1)} title="Día siguiente" className="p-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--surface)] hover:bg-[var(--gray-100)] text-[var(--gray-600)]"><ChevronRight size={15} strokeWidth={2.5} /></button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: `${stages.length * 108}px` }}>
          {/* Banda de fases */}
          <div className="flex gap-1.5 mb-3">
            {fasesVis.map((f) => (
              <div key={f.label} style={{ flexGrow: f.n }} className="min-w-0">
                <div className={`h-1.5 rounded-full ${f.bar}`} />
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gray-500)] mt-1 truncate">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Nodos */}
          <div className="relative flex items-start justify-between">
            <div className="absolute left-0 right-0 top-[34px] h-0.5 bg-[var(--gray-200)]" />
            {stages.map((s) => {
              const m = META[s.key]; if (!m) return null
              const open = abierto === s.key
              const nodeColor = s.estado === 'confirmado' ? m.dot : s.estado === 'excepcion' ? 'bg-red-500' : 'bg-[var(--gray-300)]'
              return (
                <div key={s.key} className="relative flex flex-col items-center flex-1 min-w-[96px]">
                  <div className="flex items-center gap-1.5 mb-2 h-4">
                    <m.Icon size={13} strokeWidth={2} className={s.estado !== 'pendiente' ? m.ink : 'text-[var(--gray-400)]'} />
                    <span className={`text-[11px] font-semibold ${s.estado !== 'pendiente' ? 'text-[var(--ink)]' : 'text-[var(--gray-500)]'}`}>{m.label}</span>
                  </div>

                  <button onClick={() => setAbierto(open ? null : s.key)}
                    className={`relative z-10 w-[20px] h-[20px] rounded-full ring-4 ring-[var(--surface)] flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${nodeColor}`}
                    title="Ver detalle">
                    {s.estado === 'confirmado' && <span className={`absolute inset-0 rounded-full ${m.dot} animate-ping opacity-40`} />}
                    {s.estado === 'excepcion' && <TriangleAlert size={11} strokeWidth={2.5} className="text-white" />}
                  </button>

                  <div className={`mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium
                    ${s.estado === 'confirmado' ? `${m.soft} ${m.ink}` : s.estado === 'excepcion' ? 'bg-red-50 text-red-700' : 'bg-[var(--gray-100)] text-[var(--gray-500)]'}`}>
                    {s.estado === 'confirmado' ? <><Check size={11} strokeWidth={2.5} /> Confirmado</>
                      : s.estado === 'excepcion' ? <><TriangleAlert size={11} strokeWidth={2} /> Excepción</>
                      : <><Circle size={9} strokeWidth={2} /> Pendiente</>}
                  </div>

                  {/* Popover de detalle */}
                  {open && (
                    <div className="absolute top-[70px] z-20 w-56 bg-[var(--surface)] border border-[var(--gray-200)] rounded-xl shadow-lg p-3 text-left">
                      <p className="text-xs font-semibold text-[var(--ink)] mb-1.5">{m.label} · {fechaLabel.split(',')[0]}</p>
                      {s.excepcion && (
                        <div className="mb-2 px-2 py-1.5 rounded-lg bg-red-50 text-[11px] text-red-700">
                          <strong>Excepción:</strong> {s.excepcion.descripcion || s.excepcion.tipo}
                        </div>
                      )}
                      {s.eventos.length ? (
                        <ul className="space-y-1.5">
                          {s.eventos.map((e, i) => (
                            <li key={i} className="text-[11px] text-[var(--gray-700)]">
                              <span className="font-medium text-[var(--ink)]">{EVENTO_LABEL[e.tipo] ?? e.tipo}</span>
                              {e.detalle ? ` · ${e.detalle}` : ''}
                              <span className="block text-[10px] text-[var(--gray-500)]">{e.hora}{e.autor ? ` · ${e.autor}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      ) : !s.excepcion ? (
                        <p className="text-[11px] text-[var(--gray-500)]">Sin registro este día.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-[var(--gray-500)] mt-3">Toca un nodo para ver el detalle. Verde = confirmado · rojo = excepción · gris = pendiente.</p>
    </div>
  )
}
