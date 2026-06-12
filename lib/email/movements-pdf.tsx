import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { propertyGroups, type DigestData, type Movimiento } from '@/lib/email/digest'

const N = '#0A2C4A', A = '#E0A33A', G = '#6C757D', GD = '#9A7016', CREAM = '#F5F2EC', LINE = '#E8E3D9'

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8, padding: 34, backgroundColor: '#fff', color: '#16242F' },
  header:    { backgroundColor: N, color: '#fff', padding: '22 24', borderTopLeftRadius: 8, borderTopRightRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hEyebrow:  { fontSize: 8, color: A, letterSpacing: 2.4, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  hWordmark: { fontSize: 23, fontFamily: 'Times-Bold', color: '#fff', letterSpacing: 3 },
  hRule:     { width: 34, height: 2, backgroundColor: A, marginTop: 11, marginBottom: 9 },
  hTagline:  { fontSize: 7.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 2 },
  hStat:     { alignItems: 'flex-end' },
  hStatBig:  { fontSize: 22, fontFamily: 'Times-Bold', color: '#fff' },
  hStatSub:  { fontSize: 7.5, color: 'rgba(255,255,255,0.6)' },
  metaStrip: { backgroundColor: CREAM, borderLeft: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '11 16', marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  metaTitle: { fontSize: 12, fontFamily: 'Times-Bold', color: N },
  metaSub:   { fontSize: 8, color: G },
  propHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, marginBottom: 6 },
  propName:  { fontSize: 12, fontFamily: 'Times-Bold', color: N },
  propCount: { fontSize: 8, color: G },
  subLbl:    { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, marginBottom: 4 },
  card:      { border: `1px solid ${LINE}`, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  th:        { fontSize: 7, fontFamily: 'Helvetica-Bold', color: G, padding: '4 6', textTransform: 'uppercase' },
  td:        { fontSize: 8, padding: '4 6' },
  tdBold:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: N, padding: '4 6' },
  tableHead: { flexDirection: 'row', backgroundColor: CREAM, borderBottom: `1px solid ${LINE}` },
  row:       { flexDirection: 'row', borderBottom: '1px solid #F0EDE5' },
  empty:     { fontSize: 8, color: G, fontStyle: 'italic', padding: '6 2' },
  footer:    { marginTop: 14, textAlign: 'center', fontSize: 7, color: '#9a958c' },
})

const COLS: [string, number][] = [['Hora', 0.9], ['Nombre', 2.2], ['RUT', 1.3], ['Teléfono', 1.5], ['Empresa', 1.7], ['Hab.', 0.7], ['Turno', 0.9]]

function MovTable({ rows, accent }: { rows: Movimiento[]; accent: string }) {
  if (!rows.length) return <Text style={s.empty}>Sin movimientos.</Text>
  return (
    <View style={[s.card, { borderTopWidth: 2, borderTopColor: accent }]}>
      <View style={s.tableHead}>
        {COLS.map(([h, f]) => <Text key={h} style={[s.th, { flex: f }]}>{h}</Text>)}
      </View>
      {rows.map((m, i) => (
        <View key={i} style={[s.row, i % 2 ? { backgroundColor: '#FBFAF6' } : {}]}>
          <Text style={[s.td, { flex: 0.9, color: G }]}>{m.hora}</Text>
          <Text style={[s.tdBold, { flex: 2.2 }]}>{m.nombre}</Text>
          <Text style={[s.td, { flex: 1.3, color: G }]}>{m.rut}</Text>
          <Text style={[s.td, { flex: 1.5, color: G }]}>{m.telefono}</Text>
          <Text style={[s.td, { flex: 1.7 }]}>{m.empresa}</Text>
          <Text style={[s.td, { flex: 0.7, color: G }]}>{m.habitacion}</Text>
          <Text style={[s.td, { flex: 0.9, color: G }]}>{m.turno}</Text>
        </View>
      ))}
    </View>
  )
}

export async function renderMovementsPdf(data: DigestData): Promise<Buffer> {
  const groups = propertyGroups(data.checkins, data.checkouts)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  const doc = (
    <Document title={`Movimientos Sol Eterno — ${data.periodLabel}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hEyebrow}>MOVIMIENTOS {data.periodWord.toUpperCase()}</Text>
            <Text style={s.hWordmark}>SOL ETERNO</Text>
            <View style={s.hRule} />
            <Text style={s.hTagline}>GESTIÓN DE ALOJAMIENTOS</Text>
          </View>
          <View style={s.hStat}>
            <Text style={s.hStatBig}>{data.checkins.length} / {data.checkouts.length}</Text>
            <Text style={s.hStatSub}>check-in / check-out</Text>
          </View>
        </View>

        <View style={s.metaStrip}>
          <Text style={s.metaTitle}>{data.scopeText} · {data.periodLabel}</Text>
          <Text style={s.metaSub}>Generado el {hoy}</Text>
        </View>

        {groups.length === 0 && <Text style={s.empty}>Sin movimientos en este período.</Text>}

        {groups.map(g => (
          <View key={g.propiedad} wrap={false} style={{ marginBottom: 8 }}>
            <View style={s.propHead}>
              <Text style={s.propName}>{g.propiedad}</Text>
              <Text style={s.propCount}>{g.ins.length} check-in · {g.outs.length} check-out</Text>
            </View>
            <Text style={[s.subLbl, { color: N }]}>Check-in ({g.ins.length})</Text>
            <MovTable rows={g.ins} accent={N} />
            <Text style={[s.subLbl, { color: GD }]}>Check-out ({g.outs.length})</Text>
            <MovTable rows={g.outs} accent={A} />
          </View>
        ))}

        <Text style={s.footer}>Sol Eterno — Gestión de Alojamientos · {hoy}</Text>
      </Page>
    </Document>
  )
  return await renderToBuffer(doc)
}
