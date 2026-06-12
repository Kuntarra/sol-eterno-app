// Resumen y reportes por correo (Resend). Sistema de suscripciones programables.
// Reconexión Git verificada.
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const TZ = 'America/Santiago'
const NAVY = '#0A2C4A', GOLD = '#E0A33A', INK = '#16242F', MUTED = '#6E6E68', LINE = '#E8E3D9', CREAM = '#F5F2EC'

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

type Movimiento = {
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

async function scopeLabel(scope: Scope): Promise<string> {
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
async function buildScopeFilter(scope: Scope) {
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

// Ocupación actual (estadías activas) dentro del alcance, agrupada por propiedad.
export async function getOccupancy(scope: Scope): Promise<{ propiedad: string; rows: (Movimiento & { desde: string })[] }[]> {
  const admin = createAdminClient()
  const applyScope = await buildScopeFilter(scope)
  const { data } = await applyScope(admin.from('stays').select(SEL).is('checked_out_at', null)).order('checked_in_at')

  const byProp = new Map<string, (Movimiento & { desde: string })[]>()
  for (const s of (data ?? []) as any[]) {
    const m = mapMov(s, s.checked_in_at)
    const row = { ...m, desde: new Date(s.checked_in_at).toLocaleDateString('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }) }
    const arr = byProp.get(m.propiedad) ?? []
    arr.push(row)
    byProp.set(m.propiedad, arr)
  }
  return [...byProp.entries()].map(([propiedad, rows]) => ({ propiedad, rows })).sort((a, b) => a.propiedad.localeCompare(b.propiedad))
}

function table(title: string, accent: string, rows: Movimiento[]): string {
  const head = ['Hora', 'Nombre', 'RUT', 'Teléfono', 'Empresa', 'Propiedad', 'Hab.', 'Turno']
  const body = rows.length
    ? rows.map(m => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED};white-space:nowrap">${m.hora}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK};font-weight:600">${m.nombre}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED};font-family:monospace">${m.rut}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.telefono}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK}">${m.empresa}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK}">${m.propiedad}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.habitacion}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.turno}</td>
      </tr>`).join('')
    : `<tr><td colspan="8" style="padding:18px;text-align:center;color:${MUTED}">Sin movimientos en este período.</td></tr>`

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 26px">
      <tr><td style="padding:0 0 10px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${accent};vertical-align:middle"></span>
        <span style="font-size:15px;font-weight:700;color:${NAVY};vertical-align:middle;margin-left:8px">${title}</span>
        <span style="font-size:12px;color:${MUTED};margin-left:8px">(${rows.length})</span>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${LINE};border-radius:8px;overflow:hidden">
          <tr style="background:${CREAM}">
            ${head.map(h => `<th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${MUTED};border-bottom:1px solid ${LINE}">${h}</th>`).join('')}
          </tr>
          ${body}
        </table>
      </td></tr>
    </table>`
}

export function renderDigestHtml(data: DigestData): string {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0"><tr><td align="center">
      <table width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%">
        <tr><td style="background:${NAVY};padding:26px 30px;border-radius:14px 14px 0 0">
          <div style="font-size:18px;font-weight:700;color:#fff">Sol Eterno</div>
          <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};margin-top:4px">Resumen de movimientos · ${data.scopeText}</div>
          <div style="font-size:22px;color:#fff;margin-top:14px;text-transform:capitalize">${data.periodWord} · ${data.periodLabel}</div>
          <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">${data.checkins.length} check-in · ${data.checkouts.length} check-out</div>
        </td></tr>
        <tr><td style="background:#fff;padding:26px 30px;border:1px solid ${LINE};border-top:none;border-radius:0 0 14px 14px">
          ${table('Check-ins', NAVY, data.checkins)}
          ${table('Check-outs', GOLD, data.checkouts)}
          <p style="font-size:11px;color:${MUTED};text-align:center;margin:6px 0 0">Generado automáticamente · Sol Eterno · Gestión de Alojamientos</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

// Tarjeta KPI para el reporte completo.
function kpiCard(value: number | string, label: string, accent = NAVY): string {
  return `<td style="padding:0 6px" width="25%">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-top:3px solid ${accent};border-radius:8px">
      <tr><td style="padding:12px 14px">
        <div style="font-size:24px;font-weight:700;color:${NAVY}">${value}</div>
        <div style="font-size:11px;color:${MUTED};margin-top:2px">${label}</div>
      </td></tr>
    </table>
  </td>`
}

// Tabla de ocupación actual de una propiedad.
function occBlock(propiedad: string, rows: (Movimiento & { desde: string })[]): string {
  const head = ['Desde', 'Nombre', 'RUT', 'Teléfono', 'Empresa', 'Hab.', 'Turno']
  const body = rows.map(m => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${MUTED};white-space:nowrap">${m.desde}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${INK};font-weight:600">${m.nombre}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${MUTED};font-family:monospace">${m.rut}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.telefono}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${INK}">${m.empresa}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.habitacion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.turno}</td>
    </tr>`).join('')
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px">
      <tr><td style="padding:0 0 8px;font-size:14px;font-weight:700;color:${NAVY}">${propiedad}
        <span style="font-size:12px;color:${MUTED};font-weight:400">· ${rows.length} alojado${rows.length !== 1 ? 's' : ''}</span></td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${LINE};border-radius:8px;overflow:hidden">
          <tr style="background:${CREAM}">${head.map(h => `<th style="text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${MUTED};border-bottom:1px solid ${LINE}">${h}</th>`).join('')}</tr>
          ${body}
        </table>
      </td></tr>
    </table>`
}

function renderFullHtml(data: DigestData, occupancy: { propiedad: string; rows: (Movimiento & { desde: string })[] }[]): string {
  const activos = occupancy.reduce((a, g) => a + g.rows.length, 0)
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0"><tr><td align="center">
      <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%">
        <tr><td style="background:${NAVY};padding:26px 30px;border-radius:14px 14px 0 0">
          <div style="font-size:18px;font-weight:700;color:#fff">Sol Eterno</div>
          <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};margin-top:4px">Reporte completo · ${data.scopeText}</div>
          <div style="font-size:22px;color:#fff;margin-top:14px;text-transform:capitalize">Resumen ${data.periodWord} · ${data.periodLabel}</div>
        </td></tr>
        <tr><td style="background:#fff;padding:24px 30px;border:1px solid ${LINE};border-top:none;border-radius:0 0 14px 14px">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px 24px"><tr>
            ${kpiCard(activos, 'Alojados ahora', NAVY)}
            ${kpiCard(occupancy.length, 'Propiedades', GOLD)}
            ${kpiCard(data.checkins.length, 'Check-ins del período', NAVY)}
            ${kpiCard(data.checkouts.length, 'Check-outs del período', GOLD)}
          </tr></table>

          <div style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};margin:0 0 14px">Ocupación actual por hostal</div>
          ${occupancy.length ? occupancy.map(g => occBlock(g.propiedad, g.rows)).join('') : `<p style="color:${MUTED};font-size:13px">Sin huéspedes alojados actualmente.</p>`}

          <div style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};margin:18px 0 14px">Movimientos ${data.periodWord}</div>
          ${table('Check-ins', NAVY, data.checkins)}
          ${table('Check-outs', GOLD, data.checkouts)}

          <p style="font-size:11px;color:${MUTED};text-align:center;margin:6px 0 0">Generado automáticamente · Sol Eterno · Gestión de Alojamientos</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
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

  const freq = opts?.test ? sub.frequency : sub.frequency
  const data = await getDigestData(sub, freq, opts?.ref)

  let subject: string
  let html: string
  if (sub.report_type === 'full') {
    const occupancy = await getOccupancy(sub)
    const activos = occupancy.reduce((a, g) => a + g.rows.length, 0)
    subject = `Sol Eterno · Reporte completo ${data.periodWord} (${data.scopeText}) — ${activos} alojados`
    html = renderFullHtml(data, occupancy)
  } else {
    subject = `Sol Eterno · Movimientos ${data.periodWord} (${data.scopeText}) — ${data.checkins.length} in / ${data.checkouts.length} out`
    html = renderDigestHtml(data)
  }

  const { error } = await r.emails.send({ from: FROM, to: [sub.email], subject, html })
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
