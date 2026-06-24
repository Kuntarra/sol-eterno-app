import { createClient } from '@/lib/supabase/server'
import { formatRut } from '@/lib/rut'
import { notFound } from 'next/navigation'
import { AutoPrint } from './_auto-print'

const N = '#0A2C4A', A = '#E0A33A', G = '#6C757D'

function fmt(d: string | null | undefined) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
}

interface Props { params: Promise<{ id: string }> }

export default async function BoletaLavanderiaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: bolsa } = await supabase
    .from('lavanderia_bolsas')
    .select('id, dotacion_id, fecha_entrega, fecha_siguiente_rotacion, created_at, personas(nombres, apellido_paterno, apellido_materno, tipo_documento, numero_documento, telefono), lavanderia_planillas(nombre), lavanderia_bolsa_items(nombre, cantidad)')
    .eq('id', id)
    .maybeSingle()
  if (!bolsa) notFound()

  const { data: stay } = bolsa.dotacion_id
    ? await supabase
        .from('stays')
        .select('rooms(number, properties(name))')
        .eq('dotacion_id', bolsa.dotacion_id)
        .is('checked_out_at', null)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const p = bolsa.personas as { nombres: string; apellido_paterno: string; apellido_materno: string | null; tipo_documento: string | null; numero_documento: string; telefono: string | null } | null
  const planilla = bolsa.lavanderia_planillas as { nombre: string } | null
  const items = ((bolsa.lavanderia_bolsa_items as { nombre: string; cantidad: number }[]) ?? [])
  const room = stay?.rooms as { number: string; properties: { name: string } | null } | null
  const nombre = p ? [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ') : '—'
  const doc = p ? (p.tipo_documento === 'pasaporte' ? p.numero_documento : formatRut(p.numero_documento)) : '—'
  const total = items.reduce((a, it) => a + (it.cantidad || 0), 0)
  const entrega = bolsa.fecha_entrega ?? (bolsa.created_at ? bolsa.created_at.slice(0, 10) : null)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#212529;background:#fff}
    .sheet{padding:10px 16px}
    .copia{page-break-inside:avoid;break-inside:avoid}
    table{border-collapse:collapse;width:100%}
    th,td{text-align:left;padding:5px 12px}
    thead th{background:#f1f3f5;font-size:10px;font-weight:700;color:${G};text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #dee2e6}
    tbody tr{border-bottom:1px solid #f1f3f5}
    tfoot td{background:#f1f3f5;font-weight:700;border-top:2px solid #dee2e6}
    .field-label{font-size:9px;color:${G};text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:1px}
    .field-value{font-size:12px;color:${N};font-weight:600}
    .cut{display:flex;align-items:center;gap:8px;color:#adb5bd;font-size:9px;margin:6px 0;letter-spacing:.1em;text-transform:uppercase}
    .cut::before,.cut::after{content:'';flex:1;border-top:1px dashed #ced4da}
    @page{size:letter portrait;margin:1cm}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `

  const Boleta = ({ label }: { label: string }) => (
    <div className="copia">
      {/* Header */}
      <div style={{ background: N, color: '#fff', padding: '11px 18px', borderRadius: 9, marginBottom: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 2 }}>Boleta de entrega · Lavandería</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{planilla?.nombre ?? 'Bolsa de ropa'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-block', background: A, color: N, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>Sol Eterno · {hoy}</div>
        </div>
      </div>

      {/* Datos de la persona */}
      <div style={{ border: '1px solid #e9ecef', borderRadius: 9, padding: '11px 16px', marginBottom: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="field-label">Nombre</div>
          <div className="field-value" style={{ fontSize: 14 }}>{nombre}</div>
        </div>
        <div><div className="field-label">RUT / Documento</div><div className="field-value" style={{ fontFamily: 'monospace' }}>{doc}</div></div>
        <div><div className="field-label">Teléfono</div><div className="field-value">{p?.telefono || '—'}</div></div>
        <div><div className="field-label">Propiedad</div><div className="field-value">{room?.properties?.name ?? '—'}</div></div>
        <div><div className="field-label">Habitación</div><div className="field-value">{room?.number ?? '—'}</div></div>
      </div>

      {/* Fechas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ border: '1px solid #e9ecef', borderRadius: 9, padding: '10px 14px' }}>
          <div className="field-label">Fecha de entrega</div>
          <div className="field-value" style={{ fontSize: 13 }}>{fmt(entrega)}</div>
        </div>
        <div style={{ border: `1px solid ${A}`, background: '#fffaf0', borderRadius: 9, padding: '10px 14px' }}>
          <div className="field-label" style={{ color: '#9a6b14' }}>Siguiente rotación · confirmar con huésped</div>
          <div className="field-value" style={{ fontSize: 13 }}>{fmt(bolsa.fecha_siguiente_rotacion)}</div>
          <div style={{ fontSize: 9, color: G, marginTop: 3 }}>Ante cualquier cambio, el huésped debe avisar con antelación.</div>
        </div>
      </div>

      {/* Contenido de la bolsa */}
      <div style={{ border: '1px solid #e9ecef', borderRadius: 9, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: N, color: '#fff', padding: '6px 14px', fontSize: 11, fontWeight: 700 }}>Contenido de la bolsa</div>
        <table>
          <thead><tr><th>Ítem</th><th style={{ textAlign: 'right' }}>Cantidad</th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, color: N }}>{it.nombre}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: N }}>{it.cantidad}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total de prendas</td><td style={{ textAlign: 'right' }}>{total}</td></tr></tfoot>
        </table>
      </div>

      {/* Firmas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {['Entrega (recepción)', 'Recibe conforme (huésped)'].map((l) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #adb5bd', paddingTop: 5, fontSize: 10, color: G }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="sheet">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <AutoPrint />
      <Boleta label="Original" />
      <div className="cut">✂ corte</div>
      <Boleta label="Copia" />
    </div>
  )
}
