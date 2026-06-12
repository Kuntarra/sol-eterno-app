// Resumen y reportes por correo (Resend). Sistema de suscripciones programables.
// Reconexión Git verificada.
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const TZ = 'America/Santiago'
const NAVY = '#0A2C4A', GOLD = '#E0A33A', INK = '#16242F', MUTED = '#6E6E68', LINE = '#E8E3D9', CREAM = '#F5F2EC'
const GOLDD = '#9A7016' // oro oscuro, legible como texto sobre blanco

export type Scope = {
  scope_type: 'all' | 'company' | 'property' | 'project' | 'each_project'
  company_id?: string | null
  property_ids?: string[] | null
  project_id?: string | null
}
export type Subscription = Scope & {
  id: string
  email: string
  name: string | null
  report_type: 'movements' | 'full'
  frequency: 'daily' | 'weekly' | 'monthly'
  weekdays: number[] | null
  monthday: number | null
  send_hour: number
  active: boolean
  last_sent_at: string | null
}

export type Movimiento = {
  nombre: string; rut: string; telefono: string
  empresa: string; propiedad: string; habitacion: string; turno: string; hora: string
}

// ── Helpers de zona horaria de Chile ───────────────────────────
function chileMidnightUTC(y: number, m: number, d: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const asCL = new Date(guess.toLocaleString('en-US', { timeZone: TZ }))
  const offset = asCL.getTime() - guess.getTime()
  return new Date(guess.getTime() - offset)
}
function ymdInChile(date: Date) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return {
    y: +p.find(x => x.type === 'year')!.value,
    m: +p.find(x => x.type === 'month')!.value,
    d: +p.find(x => x.type === 'day')!.value,
  }
}
const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const horaCL = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

// Ventana del período según frecuencia (hasta el final de ayer, Chile).
function periodRange(freq: Subscription['frequency'], ref = new Date()) {
  const today = ymdInChile(ref)
  const endUTC = chileMidnightUTC(today.y, today.m, today.d)
  const days = freq === 'weekly' ? 7 : freq === 'monthly' ? 30 : 1
  const startUTC = new Date(endUTC.getTime() - days * 24 * 3600 * 1000)
  const lastDay = new Date(endUTC.getTime() - 12 * 3600 * 1000)
  const periodLabel =
    freq === 'daily'
      ? fmtDate(lastDay)
      : `${fmtDate(new Date(startUTC.getTime() + 12 * 3600 * 1000))} – ${fmtDate(lastDay)}`
  const periodWord = freq === 'daily' ? 'del día' : freq === 'weekly' ? 'de la semana' : 'del mes'
  return { startISO: startUTC.toISOString(), endISO: endUTC.toISOString(), periodLabel, periodWord }
}

function mapMov(s: any, iso: string): Movimiento {
  const g = s.guests as any, r = s.rooms as any, c = s.companies as any
  return {
    nombre: `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim() || '—',
    rut: g?.rut || '—',
    telefono: g?.phone || '—',
    empresa: c?.name || '—',
    propiedad: r?.properties?.name || '—',
    habitacion: r?.number || '—',
    turno: s.shift_type || '—',
    hora: horaCL(iso),
  }
}

export async function scopeLabel(scope: Scope): Promise<string> {
  const admin = createAdminClient()
  if (scope.scope_type === 'project' && scope.project_id) {
    const { data } = await admin.from('projects').select('name, companies(name)').eq('id', scope.project_id).single()
    const emp = (data?.companies as any)?.name
    return data?.name ? `Proyecto: ${data.name}${emp ? ` (${emp})` : ''}` : 'Proyecto'
  }
  if (scope.scope_type === 'company' && scope.company_id) {
    const { data } = await admin.from('companies').select('name').eq('id', scope.company_id).single()
    return data?.name ? `Empresa: ${data.name}` : 'Empresa'
  }
  if (scope.scope_type === 'property' && scope.property_ids?.length) {
    const { data } = await admin.from('properties').select('name').in('id', scope.property_ids)
    const names = (data ?? []).map(p => p.name)
    return names.length ? `Propiedades: ${names.join(', ')}` : 'Propiedades'
  }
  return 'Toda la operación'
}

// Aplica el filtro de alcance a una query de stays.
export async function buildScopeFilter(scope: Scope) {
  const admin = createAdminClient()
  let roomIds: string[] | null = null
  if (scope.scope_type === 'property' && scope.property_ids?.length) {
    const { data: rooms } = await admin.from('rooms').select('id').in('property_id', scope.property_ids)
    roomIds = (rooms ?? []).map(r => r.id)
  }
  return (q: any) => {
    if (scope.scope_type === 'company' && scope.company_id) q = q.eq('company_id', scope.company_id)
    if (scope.scope_type === 'project' && scope.project_id) q = q.eq('project_id', scope.project_id)
    if (roomIds) q = roomIds.length ? q.in('room_id', roomIds) : q.eq('id', '00000000-0000-0000-0000-000000000000')
    return q
  }
}

export type DigestData = {
  periodLabel: string
  periodWord: string
  scopeText: string
  checkins: Movimiento[]
  checkouts: Movimiento[]
}

const SEL = `shift_type, checked_in_at, checked_out_at, guests(first_name, last_name_paterno, rut, phone), rooms(number, properties(name)), companies(name)`

export async function getDigestData(scope: Scope, freq: Subscription['frequency'], ref = new Date()): Promise<DigestData> {
  const admin = createAdminClient()
  const { startISO, endISO, periodLabel, periodWord } = periodRange(freq, ref)
  const applyScope = await buildScopeFilter(scope)

  const [{ data: ins }, { data: outs }] = await Promise.all([
    applyScope(admin.from('stays').select(SEL).gte('checked_in_at', startISO).lt('checked_in_at', endISO)).order('checked_in_at'),
    applyScope(admin.from('stays').select(SEL).gte('checked_out_at', startISO).lt('checked_out_at', endISO)).order('checked_out_at'),
  ])

  return {
    periodLabel, periodWord,
    scopeText: await scopeLabel(scope),
    checkins:  ((ins  ?? []) as any[]).map(s => mapMov(s, s.checked_in_at)),
    checkouts: ((outs ?? []) as any[]).map(s => mapMov(s, s.checked_out_at)),
  }
}

// ── Sistema visual del correo (letterhead editorial) ──────────────
const SERIF = "Georgia, 'Times New Roman', Times, serif"

function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;color:${CREAM}">${text}</div>`
}

// Membrete: eyebrow (alcance) + wordmark serif + filete dorado + bajada.
function letterhead(eyebrow: string): string {
  return `<tr><td style="background:${NAVY};padding:32px 36px 28px;border-radius:18px 18px 0 0">
    <div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${GOLD};font-weight:700">${eyebrow}</div>
    <div style="font-family:${SERIF};font-size:26px;letter-spacing:.16em;color:#ffffff;margin-top:12px">SOL&nbsp;ETERNO</div>
    <div style="width:36px;height:2px;background:${GOLD};margin:14px 0 11px;font-size:0;line-height:0">&nbsp;</div>
    <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)">Gestión de Alojamientos</div>
  </td></tr>`
}

// Título del reporte dentro del cuerpo blanco (serif, capitalizado).
function reportTitle(title: string, periodLabel: string): string {
  return `<div style="padding:26px 36px 0">
    <div style="font-family:${SERIF};font-size:23px;color:${NAVY};text-transform:capitalize">${title}</div>
    <div style="font-size:13px;color:${MUTED};margin-top:3px">${periodLabel}</div>
  </div>`
}

// Banda de indicadores (pills serif).
function statBand(items: { value: number | string; label: string; accent: string }[]): string {
  return `<div style="padding:18px 36px 2px">
    <table cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>
      ${items.map(it => `<td style="padding-right:10px">
        <table cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px"><tr>
          <td style="padding:12px 18px">
            <div style="font-family:${SERIF};font-size:24px;color:${it.accent};line-height:1">${it.value}</div>
            <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};margin-top:5px">${it.label}</div>
          </td></tr></table></td>`).join('')}
    </tr></table>
  </div>`
}

// Pie de marca con filete superior.
function mailFooter(): string {
  return `<div style="padding:24px 36px 30px">
    <div style="height:1px;background:${LINE};margin:0 0 16px;font-size:0;line-height:0">&nbsp;</div>
    <div style="font-family:${SERIF};font-size:13px;letter-spacing:.16em;color:${NAVY}">SOL ETERNO</div>
    <div style="font-size:11px;color:${MUTED};margin-top:5px">Reporte generado automáticamente · ${fmtDate(new Date())} · Sistema de Gestión de Alojamientos</div>
  </div>`
}

// Envoltorio común: fondo cálido, contenedor centrado, membrete + cuerpo blanco + pie.
function shell(eyebrow: string, preheaderText: string, body: string, width = 660): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${CREAM};-webkit-font-smoothing:antialiased;font-family:-apple-system,Helvetica,Arial,sans-serif">
    ${preheader(preheaderText)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:28px 12px"><tr><td align="center">
      <table width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%">
        ${letterhead(eyebrow)}
        <tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:none;border-radius:0 0 18px 18px">
          ${body}
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

// Etiqueta de sección con marca dorada.
function sectionLabel(text: string): string {
  return `<div style="margin:0 0 14px">
    <span style="display:inline-block;width:14px;height:3px;border-radius:2px;background:${GOLD};vertical-align:middle;margin-right:9px"></span>
    <span style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${NAVY};vertical-align:middle">${text}</span>
  </div>`
}

// Agrupa movimientos por propiedad (cada uno con sus check-ins y check-outs).
export function propertyGroups(checkins: Movimiento[], checkouts: Movimiento[]) {
  const map = new Map<string, { ins: Movimiento[]; outs: Movimiento[] }>()
  for (const m of checkins)  { const e = map.get(m.propiedad) ?? { ins: [], outs: [] }; e.ins.push(m);  map.set(m.propiedad, e) }
  for (const m of checkouts) { const e = map.get(m.propiedad) ?? { ins: [], outs: [] }; e.outs.push(m); map.set(m.propiedad, e) }
  return [...map.entries()]
    .map(([propiedad, v]) => ({ propiedad, ...v }))
    .sort((a, b) => (b.ins.length + b.outs.length) - (a.ins.length + a.outs.length) || a.propiedad.localeCompare(b.propiedad))
}

// Fila de conteo (comprimida): "● Check-in   N"
function countRow(label: string, accent: string, n: number, last: boolean): string {
  const border = last ? '' : `border-bottom:1px solid ${LINE};`
  return `<div style="padding:11px 6px;${border}">
    <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${n ? accent : '#D6D1C6'};margin-right:10px;vertical-align:middle"></span>
    <span style="font-size:13px;font-weight:700;color:${NAVY};vertical-align:middle">${label}</span>
    <span style="float:right;font-family:${SERIF};font-size:18px;font-weight:700;color:${n ? accent : '#C9C4B8'};line-height:1">${n}</span>
  </div>`
}

// Tarjeta por propiedad: nombre + conteos check-in/check-out (comprimido).
function propertyCard(g: { propiedad: string; ins: Movimiento[]; outs: Movimiento[] }): string {
  return `<div style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin:0 0 12px">
    <div style="background:${CREAM};padding:13px 16px;border-bottom:1px solid ${LINE}">
      <span style="font-family:${SERIF};font-size:15px;font-weight:700;color:${NAVY}">${g.propiedad}</span>
    </div>
    <div style="padding:6px 14px">
      ${countRow('Check-in', NAVY, g.ins.length, false)}
      ${countRow('Check-out', GOLDD, g.outs.length, true)}
    </div>
  </div>`
}

export function renderDigestHtml(data: DigestData): string {
  const eyebrow = `Movimientos · ${data.scopeText}`
  const groups = propertyGroups(data.checkins, data.checkouts)
  const total = data.checkins.length + data.checkouts.length
  const body = `
    ${reportTitle(`Movimientos ${data.periodWord}`, data.periodLabel)}
    ${statBand([
      { value: data.checkins.length, label: 'Check-ins', accent: NAVY },
      { value: data.checkouts.length, label: 'Check-outs', accent: GOLD },
    ])}
    <div style="padding:24px 36px 8px">
      ${sectionLabel('Movimientos por propiedad')}
      ${groups.length
        ? groups.map(propertyCard).join('')
        : `<p style="color:${MUTED};font-size:13px;font-style:italic;margin:0">Sin movimientos en este período.</p>`}
      ${total ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;background:${CREAM};margin-top:6px"><tr>
        <td style="padding:14px 18px;width:1px;vertical-align:middle">
          <div style="font-family:${SERIF};font-size:11px;font-weight:700;letter-spacing:.1em;color:#ffffff;background:${NAVY};padding:8px 11px;border-radius:7px">PDF</div>
        </td>
        <td style="padding:14px 18px 14px 6px;vertical-align:middle">
          <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}">Detalle de huéspedes</div>
          <div style="font-size:13px;color:${INK};margin-top:2px">Nombres, RUT y teléfono por hotel en el <strong style="color:${NAVY}">PDF adjunto</strong>.</div>
        </td>
      </tr></table>` : ''}
    </div>
    ${mailFooter()}`
  const pre = `${data.checkins.length} check-in · ${data.checkouts.length} check-out — ${data.periodLabel}`
  return shell(eyebrow, pre, body)
}

// Cuerpo de presentación para el reporte completo (el detalle va en el PDF adjunto).
function renderIntroHtml(data: DigestData): string {
  const eyebrow = `Reporte de ocupación · ${data.scopeText}`
  const body = `
    ${reportTitle(`Reporte ${data.periodWord}`, data.periodLabel)}
    <div style="padding:22px 36px 0">
      <p style="font-size:15px;color:${INK};line-height:1.65;margin:0 0 20px">
        Adjuntamos el <strong style="color:${NAVY}">reporte completo de ocupación</strong> en PDF: los indicadores del período con su comparación, el desglose por propiedad y por empresa, y el listado íntegro de huéspedes.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;background:${CREAM}"><tr>
        <td style="padding:16px 18px;width:1px;vertical-align:middle">
          <div style="font-family:${SERIF};font-size:11px;font-weight:700;letter-spacing:.1em;color:#ffffff;background:${NAVY};padding:8px 11px;border-radius:7px">PDF</div>
        </td>
        <td style="padding:16px 18px 16px 6px;vertical-align:middle">
          <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}">Documento adjunto</div>
          <div style="font-family:${SERIF};font-size:15px;color:${NAVY};margin-top:3px">reporte_sol_eterno.pdf</div>
        </td>
      </tr></table>
    </div>
    ${mailFooter()}`
  const pre = `Reporte ${data.periodWord} de ocupación — ${data.periodLabel} (PDF adjunto)`
  return shell(eyebrow, pre, body, 560)
}

function resend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}
const FROM = process.env.DIGEST_FROM || 'Sol Eterno <onboarding@resend.dev>'

// Enviar una suscripción concreta (o una prueba con ventana diaria).
export async function sendSubscription(sub: Subscription, opts?: { test?: boolean; ref?: Date }): Promise<{ ok: boolean; reason?: string }> {
  const r = resend()
  if (!r) return { ok: false, reason: 'Falta RESEND_API_KEY' }

  // Fan-out: una suscripción "cada proyecto" → un correo por proyecto activo.
  if (sub.scope_type === 'each_project') {
    const admin = createAdminClient()
    const { data: projects } = await admin.from('projects').select('id').eq('active', true).order('name')
    if (!projects?.length) return { ok: false, reason: 'No hay proyectos activos' }
    let okAll = true
    let lastReason: string | undefined
    for (const p of projects) {
      const res = await sendSubscription({ ...sub, scope_type: 'project', project_id: p.id }, opts)
      if (!res.ok) { okAll = false; lastReason = res.reason }
    }
    return okAll ? { ok: true } : { ok: false, reason: lastReason }
  }

  const freq = sub.frequency
  const data = await getDigestData(sub, freq, opts?.ref)

  let subject: string
  let html: string
  let attachments: { filename: string; content: Buffer }[] | undefined

  if (sub.report_type === 'full') {
    // Reporte completo → PDF gráfico adjunto + correo de presentación corto.
    const { renderReportPdf } = await import('@/lib/email/report-pdf')
    const pdf = await renderReportPdf(sub, freq, opts?.ref)
    const slug = data.scopeText.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'general'
    const fechaArchivo = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(opts?.ref ?? new Date()).replace(/\//g, '-')
    subject = `Sol Eterno · Reporte ${data.periodWord} — ${data.scopeText}`
    html = renderIntroHtml(data)
    attachments = [{ filename: `reporte_sol_eterno_${slug}_${fechaArchivo}.pdf`, content: pdf }]
  } else {
    subject = `Sol Eterno · Movimientos ${data.periodWord} (${data.scopeText}) — ${data.checkins.length} in / ${data.checkouts.length} out`
    html = renderDigestHtml(data)
    // Detalle de nombres por hotel en PDF adjunto (Gmail no permite colapsar inline).
    if (data.checkins.length + data.checkouts.length > 0) {
      const { renderMovementsPdf } = await import('@/lib/email/movements-pdf')
      const pdf = await renderMovementsPdf(data)
      const fechaArchivo = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(opts?.ref ?? new Date()).replace(/\//g, '-')
      attachments = [{ filename: `movimientos_sol_eterno_${fechaArchivo}.pdf`, content: pdf }]
    }
  }

  const { error } = await r.emails.send({ from: FROM, to: [sub.email], subject, html, attachments })
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

// Recorre las suscripciones activas y envía las que "tocan" hoy (Chile).
// El plan Hobby solo permite UN cron diario, así que no filtramos por hora:
// a la corrida diaria salen todas las suscripciones cuyo día corresponde.
// (El campo send_hour queda para cuando se pase a Pro con cron horario.)
export async function runDueSubscriptions(ref = new Date()): Promise<{ checked: number; sent: number; details: any[] }> {
  const admin = createAdminClient()
  const { data: subs } = await admin.from('report_subscriptions').select('*').eq('active', true)

  const D = +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit' }).format(ref)
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(ref)
  const W = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[wd]

  const details: any[] = []
  let sent = 0
  for (const s of (subs ?? []) as Subscription[]) {
    if (s.frequency === 'weekly' && !(s.weekdays ?? []).includes(W)) continue
    if (s.frequency === 'monthly' && s.monthday !== D) continue
    if (s.last_sent_at && ref.getTime() - new Date(s.last_sent_at).getTime() < 12 * 3600 * 1000) continue

    const res = await sendSubscription(s, { ref })
    if (res.ok) {
      sent++
      await admin.from('report_subscriptions').update({ last_sent_at: ref.toISOString() }).eq('id', s.id)
    }
    details.push({ id: s.id, email: s.email, ...res })
  }
  return { checked: subs?.length ?? 0, sent, details }
}
