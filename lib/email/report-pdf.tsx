import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildScopeFilter, scopeLabel, type Scope, type Subscription } from '@/lib/email/digest'
import { ROOM_TYPE_LABELS } from '@/lib/types'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const N = '#0A2C4A', A = '#E0A33A', G = '#6C757D'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 34, backgroundColor: '#ffffff', color: '#16242F' },
  header:     { backgroundColor: N, color: '#ffffff', padding: 16, borderRadius: 6, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  hLabel:     { fontSize: 8, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  hTitle:     { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  hSub:       { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  hPct:       { fontSize: 34, fontFamily: 'Helvetica-Bold', color: A, textAlign: 'right' },
  kpiGrid:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard:    { flex: 1, border: '1px solid #E8E3D9', borderRadius: 5, padding: 10 },
  kpiVal:     { fontSize: 17, fontFamily: 'Helvetica-Bold', color: N },
  kpiLabel:   { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  kpiSub:     { fontSize: 7, color: G, marginTop: 1 },
  row2:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card:       { flex: 1, border: '1px solid #E8E3D9', borderRadius: 5, overflow: 'hidden' },
  cardHead:   { backgroundColor: N, color: '#ffffff', padding: '6 10', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableHead:  { flexDirection: 'row', backgroundColor: '#F5F2EC', borderBottom: '1px solid #E8E3D9' },
  tableRow:   { flexDirection: 'row', borderBottom: '1px solid #F0EDE5' },
  tableFooter:{ flexDirection: 'row', backgroundColor: '#F5F2EC', borderTop: '2px solid #E8E3D9' },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: G, padding: '4 6', textTransform: 'uppercase' },
  td:         { fontSize: 8, padding: '4 6' },
  tdBold:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: N, padding: '4 6' },
  barBg:      { height: 5, backgroundColor: '#EAE5DB', borderRadius: 3, marginTop: 2 },
  barFill:    { height: 5, borderRadius: 3 },
  sectionLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: A, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  footer:     { marginTop: 14, textAlign: 'center', fontSize: 7, color: '#9a958c' },
})

const barColor = (pct: number) => (pct >= 70 ? N : A)
const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })

function periodFor(freq: Subscription['frequency'], ref: Date) {
  if (freq === 'monthly') {
    const y = ref.getFullYear(), m = ref.getMonth() // 0-based mes actual
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59) // último día del mes anterior
    return { desde: start, hasta: end, dias: end.getDate(), titulo: `${MONTHS[(m - 1 + 12) % 12]} ${start.getFullYear()}` }
  }
  const dias = freq === 'weekly' ? 7 : 1
  const end = new Date(ref); end.setHours(0, 0, 0, 0)
  const start = new Date(end.getTime() - dias * 86400000)
  return {
    desde: start, hasta: new Date(end.getTime() - 1000), dias,
    titulo: freq === 'weekly' ? `Últimos 7 días` : start.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export async function renderReportPdf(scope: Scope, freq: Subscription['frequency'], ref = new Date()): Promise<Buffer> {
  const admin = createAdminClient()
  const { desde, hasta, dias, titulo } = periodFor(freq, ref)
  const desdeISO = desde.toISOString(), hastaISO = hasta.toISOString()
  const periodoInicio = desde, periodoFin = hasta
  const applyScope = await buildScopeFilter(scope)

  const sel = `shift_type, checked_in_at, checked_out_at, guests(first_name, last_name_paterno, rut), rooms(id, number, type, capacity, properties(id, name)), companies(id, name)`
  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    applyScope(admin.from('stays').select(sel).lte('checked_in_at', hastaISO).or(`checked_out_at.gte.${desdeISO},checked_out_at.is.null`)).order('checked_in_at').limit(5000),
    applyScope(admin.from('allocations').select(`room_id, rooms(id, capacity, properties(id, name)), companies(id, name)`)),
  ])

  const stays = (staysRaw ?? []) as any[]
  const allocs = (allocsRaw ?? []) as any[]

  const noches = (st: any) => {
    const ini = Math.max(new Date(st.checked_in_at).getTime(), periodoInicio.getTime())
    const fin = Math.min((st.checked_out_at ? new Date(st.checked_out_at) : periodoFin).getTime(), periodoFin.getTime())
    return Math.max(0, Math.ceil((fin - ini) / 86400000))
  }

  const nochesH = stays.reduce((a, st) => a + noches(st), 0)
  const habMap = new Map<string, number>()
  for (const a of allocs) { const r = a.rooms; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp = [...habMap.values()].reduce((a, c) => a + c, 0)
  const camasNoche = camasDisp * dias
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0

  const propMap = new Map<string, { nombre: string; camasNoche: number; usado: number; estadias: number }>()
  for (const a of allocs) {
    const r = a.rooms, p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasNoche: 0, usado: 0, estadias: 0 })
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * dias
  }
  for (const st of stays) {
    const pid = st.rooms?.properties?.id
    if (pid && propMap.has(pid)) { propMap.get(pid)!.usado += noches(st); propMap.get(pid)!.estadias++ }
  }
  const porPropiedad = [...propMap.values()].map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.usado / p.camasNoche) * 100) : 0 })).sort((a, b) => b.pct - a.pct)

  const empMap = new Map<string, { nombre: string; estadias: number; noches: number }>()
  for (const st of stays) {
    const c = st.companies; if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++; empMap.get(c.id)!.noches += noches(st)
  }
  const porEmpresa = [...empMap.values()].sort((a, b) => b.noches - a.noches)

  const alcance = await scopeLabel(scope)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  const COLS: [string, number][] = [['Huésped', 2], ['RUT', 1.2], ['Empresa', 1.5], ['Propiedad', 1.5], ['Hab.', 0.6], ['Tipo', 0.9], ['Turno', 0.8], ['Entrada', 1], ['Salida', 1], ['Noches', 0.7]]

  const doc = (
    <Document title={`Reporte Sol Eterno — ${titulo}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hLabel}>Reporte de Ocupación · {alcance}</Text>
            <Text style={s.hTitle}>{titulo}</Text>
            <Text style={s.hSub}>{dias} días · {porPropiedad.length} propiedad{porPropiedad.length !== 1 ? 'es' : ''} · Generado el {hoy}</Text>
          </View>
          <View>
            <Text style={s.hPct}>{ocupPct}%</Text>
            <Text style={s.hSub}>Ocupación del período</Text>
          </View>
        </View>

        <View style={s.kpiGrid}>
          {[
            { label: 'Noches-huésped', val: nochesH.toLocaleString('es-CL'), sub: 'Suma de noches', color: N },
            { label: 'Camas-noche disp.', val: camasNoche.toLocaleString('es-CL'), sub: `${camasDisp} camas × ${dias} días`, color: A },
            { label: 'Camas-noche libres', val: camasLibres.toLocaleString('es-CL'), sub: `${100 - ocupPct}% sin ocupar`, color: G },
            { label: 'Estadías', val: stays.length.toString(), sub: `${stays.filter(st => !st.checked_out_at).length} activas`, color: A },
          ].map(k => (
            <View key={k.label} style={[s.kpiCard, { borderTopWidth: 3, borderTopColor: k.color }]}>
              <Text style={s.kpiVal}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={s.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        <View style={s.row2}>
          <View style={s.card}>
            <View style={s.cardHead}><Text>Ocupación por propiedad</Text></View>
            <View style={{ padding: 8 }}>
              {porPropiedad.length ? porPropiedad.map(p => (
                <View key={p.nombre} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', color: N, fontSize: 8 }}>{p.nombre}</Text>
                    <Text style={{ color: G, fontSize: 7 }}>{p.estadias} est. · {p.usado}/{p.camasNoche} <Text style={{ fontFamily: 'Helvetica-Bold', color: barColor(p.pct) }}>{p.pct}%</Text></Text>
                  </View>
                  <View style={s.barBg}><View style={[s.barFill, { width: `${p.pct}%`, backgroundColor: barColor(p.pct) }]} /></View>
                </View>
              )) : <Text style={{ color: G, fontSize: 8 }}>Sin propiedades en el alcance.</Text>}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHead}><Text>Resumen por empresa</Text></View>
            <View style={s.tableHead}>
              {['Empresa', 'Estadías', 'Noches', '%'].map((h, i) => (
                <Text key={h} style={[s.th, { flex: i === 0 ? 3 : 1, textAlign: i > 0 ? 'right' : 'left' }]}>{h}</Text>
              ))}
            </View>
            {porEmpresa.map(e => (
              <View key={e.nombre} style={s.tableRow}>
                <Text style={[s.tdBold, { flex: 3 }]}>{e.nombre}</Text>
                <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{e.estadias}</Text>
                <Text style={[s.tdBold, { flex: 1, textAlign: 'right' }]}>{e.noches}</Text>
                <Text style={[s.td, { flex: 1, textAlign: 'right', color: G }]}>{nochesH > 0 ? Math.round(e.noches / nochesH * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHead}><Text>Listado de huéspedes — {stays.length} registros</Text></View>
          <View style={s.tableHead}>
            {COLS.map(([h, f]) => <Text key={h} style={[s.th, { flex: f, textAlign: h === 'Noches' ? 'right' : 'left' }]}>{h}</Text>)}
          </View>
          {stays.slice(0, 120).map((st, i) => {
            const g = st.guests, r = st.rooms, c = st.companies, n = noches(st)
            return (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tdBold, { flex: 2 }]}>{g?.first_name} {g?.last_name_paterno}</Text>
                <Text style={[s.td, { flex: 1.2, color: G }]}>{g?.rut ?? '—'}</Text>
                <Text style={[s.td, { flex: 1.5 }]}>{c?.name}</Text>
                <Text style={[s.td, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{r?.properties?.name}</Text>
                <Text style={[s.td, { flex: 0.6 }]}>{r?.number}</Text>
                <Text style={[s.td, { flex: 0.9, color: G }]}>{r?.type ? (ROOM_TYPE_LABELS[r.type] ?? r.type) : '—'}</Text>
                <Text style={[s.td, { flex: 0.8, color: G }]}>{st.shift_type ?? '—'}</Text>
                <Text style={[s.td, { flex: 1 }]}>{fmt(st.checked_in_at)}</Text>
                <Text style={[s.td, { flex: 1 }]}>{st.checked_out_at ? fmt(st.checked_out_at) : '—'}</Text>
                <Text style={[s.tdBold, { flex: 0.7, textAlign: 'right' }]}>{n}</Text>
              </View>
            )
          })}
        </View>

        <Text style={s.footer}>Sol Eterno — Gestión de Alojamientos · {hoy}</Text>
      </Page>
    </Document>
  )

  return await renderToBuffer(doc)
}
