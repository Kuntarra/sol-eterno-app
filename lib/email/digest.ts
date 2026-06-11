import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const TZ = 'America/Santiago'
const NAVY = '#0A2C4A', GOLD = '#E0A33A', INK = '#16242F', MUTED = '#6E6E68', LINE = '#E8E3D9', CREAM = '#F5F2EC'

type Movimiento = {
  nombre: string; rut: string; telefono: string
  propiedad: string; habitacion: string; turno: string; hora: string
}
export type DigestData = {
  fechaLabel: string
  checkins: Movimiento[]
  checkouts: Movimiento[]
}

// UTC Date que corresponde a la medianoche (00:00) de Chile para el Y-M-D dado.
function chileMidnightUTC(y: number, m: number, d: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const asCL = new Date(guess.toLocaleString('en-US', { timeZone: TZ }))
  const offset = asCL.getTime() - guess.getTime()
  return new Date(guess.getTime() - offset)
}

function ymdInChile(date: Date): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return {
    y: +p.find(x => x.type === 'year')!.value,
    m: +p.find(x => x.type === 'month')!.value,
    d: +p.find(x => x.type === 'day')!.value,
  }
}

// Rango [inicio, fin) del día anterior en hora de Chile.
function ayerRange(ref = new Date()) {
  const today = ymdInChile(ref)
  const endUTC = chileMidnightUTC(today.y, today.m, today.d)          // hoy 00:00 CL = fin de ayer
  const yest = ymdInChile(new Date(endUTC.getTime() - 12 * 3600 * 1000))
  const startUTC = chileMidnightUTC(yest.y, yest.m, yest.d)           // ayer 00:00 CL
  const fechaLabel = new Date(startUTC.getTime() + 12 * 3600 * 1000)
    .toLocaleDateString('es-CL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return { startISO: startUTC.toISOString(), endISO: endUTC.toISOString(), fechaLabel }
}

const horaCL = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

function mapMov(s: any, iso: string): Movimiento {
  const g = s.guests as any, r = s.rooms as any, c = s.companies as any
  return {
    nombre: `${g?.first_name ?? ''} ${g?.last_name_paterno ?? ''}`.trim() || '—',
    rut: g?.rut ?? '—',
    telefono: g?.phone ?? '—',
    propiedad: r?.properties?.name ?? '—',
    habitacion: r?.number ?? '—',
    turno: s.shift_type ?? '—',
    hora: horaCL(iso),
    empresa: c?.name ?? '—',
  } as Movimiento & { empresa: string }
}

export async function getDigestData(ref = new Date()): Promise<DigestData> {
  const admin = createAdminClient()
  const { startISO, endISO, fechaLabel } = ayerRange(ref)
  const sel = `shift_type, checked_in_at, checked_out_at, guests(first_name, last_name_paterno, rut, phone), rooms(number, properties(name)), companies(name)`

  const [{ data: ins }, { data: outs }] = await Promise.all([
    admin.from('stays').select(sel).gte('checked_in_at', startISO).lt('checked_in_at', endISO).order('checked_in_at'),
    admin.from('stays').select(sel).gte('checked_out_at', startISO).lt('checked_out_at', endISO).order('checked_out_at'),
  ])

  return {
    fechaLabel,
    checkins:  (ins  ?? []).map(s => mapMov(s, (s as any).checked_in_at)),
    checkouts: (outs ?? []).map(s => mapMov(s, (s as any).checked_out_at)),
  }
}

function table(title: string, accent: string, rows: Movimiento[]): string {
  const head = ['Hora', 'Nombre', 'RUT', 'Teléfono', 'Propiedad', 'Hab.', 'Turno']
  const body = rows.length
    ? rows.map(m => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED};white-space:nowrap">${m.hora}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK};font-weight:600">${m.nombre}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED};font-family:monospace">${m.rut}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.telefono}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${INK}">${m.propiedad}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.habitacion}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED}">${m.turno}</td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="padding:18px;text-align:center;color:${MUTED}">Sin movimientos.</td></tr>`

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 26px">
      <tr>
        <td style="padding:0 0 10px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${accent};vertical-align:middle"></span>
          <span style="font-size:15px;font-weight:700;color:${NAVY};vertical-align:middle;margin-left:8px">${title}</span>
          <span style="font-size:12px;color:${MUTED};margin-left:8px">(${rows.length})</span>
        </td>
      </tr>
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
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0">
      <tr><td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
          <tr><td style="background:${NAVY};padding:26px 30px;border-radius:14px 14px 0 0">
            <div style="font-size:18px;font-weight:700;color:#fff">Sol Eterno</div>
            <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};margin-top:4px">Resumen diario de movimientos</div>
            <div style="font-size:22px;color:#fff;margin-top:14px;text-transform:capitalize">${data.fechaLabel}</div>
            <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">${data.checkins.length} check-in · ${data.checkouts.length} check-out</div>
          </td></tr>
          <tr><td style="background:#fff;padding:26px 30px;border:1px solid ${LINE};border-top:none;border-radius:0 0 14px 14px">
            ${table('Check-ins de ayer', '#0A2C4A', data.checkins)}
            ${table('Check-outs de ayer', GOLD, data.checkouts)}
            <p style="font-size:11px;color:${MUTED};text-align:center;margin:6px 0 0">
              Generado automáticamente · Sol Eterno · Gestión de Alojamientos
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

export async function sendDigest(opts?: { ref?: Date; to?: string[] }): Promise<{ ok: boolean; sent: number; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, sent: 0, reason: 'Falta RESEND_API_KEY' }

  const admin = createAdminClient()
  let to = opts?.to
  if (!to) {
    const { data } = await admin.from('digest_recipients').select('email').eq('active', true)
    to = (data ?? []).map(r => r.email)
  }
  if (!to.length) return { ok: false, sent: 0, reason: 'No hay destinatarios activos' }

  const data = await getDigestData(opts?.ref)
  const resend = new Resend(apiKey)
  const from = process.env.DIGEST_FROM || 'Sol Eterno <onboarding@resend.dev>'

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Sol Eterno · Resumen del ${data.fechaLabel} — ${data.checkins.length} check-in / ${data.checkouts.length} check-out`,
    html: renderDigestHtml(data),
  })

  if (error) return { ok: false, sent: 0, reason: error.message }
  return { ok: true, sent: to.length }
}
