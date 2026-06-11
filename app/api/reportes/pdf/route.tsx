import { NextRequest, NextResponse } from 'next/server'
import { formatDate as fmt } from "@/lib/format"
import { ROOM_TYPE_LABELS } from "@/lib/types"
import { createAdminClient } from '@/lib/supabase/admin'
import React from 'react'
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const N = '#0A2C4A', A = '#E0A33A', G = '#6C757D'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 36, backgroundColor: '#ffffff', color: '#212529' },
  header:     { backgroundColor: N, color: '#ffffff', padding: 14, borderRadius: 6, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  hTitle:     { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  hSub:       { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  hLabel:     { fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 3 },
  hPct:       { fontSize: 32, fontFamily: 'Helvetica-Bold', color: A, textAlign: 'right' },
  kpiGrid:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard:    { flex: 1, border: '1px solid #e9ecef', borderRadius: 5, padding: 9 },
  kpiVal:     { fontSize: 16, fontFamily: 'Helvetica-Bold', color: N },
  kpiLabel:   { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  kpiSub:     { fontSize: 7, color: G, marginTop: 1 },
  row2:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  card:       { flex: 1, border: '1px solid #e9ecef', borderRadius: 5, overflow: 'hidden' },
  cardHead:   { backgroundColor: N, color: '#ffffff', padding: '6 10', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableHead:  { flexDirection: 'row', backgroundColor: '#f1f3f5', borderBottom: '1px solid #dee2e6' },
  tableRow:   { flexDirection: 'row', borderBottom: '1px solid #f1f3f5' },
  tableFooter:{ flexDirection: 'row', backgroundColor: '#f1f3f5', borderTop: '2px solid #dee2e6' },
  th:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: G, padding: '4 6', textTransform: 'uppercase' },
  td:         { fontSize: 8, padding: '4 6' },
  tdBold:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: N, padding: '4 6' },
  barBg:      { height: 5, backgroundColor: '#e9ecef', borderRadius: 3, marginTop: 2 },
  barFill:    { height: 5, borderRadius: 3 },
  footer:     { marginTop: 12, textAlign: 'center', fontSize: 7, color: '#adb5bd' },
  badge:      { fontSize: 7, padding: '1 5', borderRadius: 10 },
})

function barColor(pct: number) { return pct >= 70 ? N : A }

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const now    = new Date()
  const periodo         = sp.get('periodo')   ?? 'mensual'
  const anio            = parseInt(sp.get('anio') ?? String(now.getFullYear()))
  const mes             = parseInt(sp.get('mes')  ?? String(now.getMonth() + 1))
  const filtroEmpresa   = sp.get('empresa')   ?? 'todas'
  const filtroPropiedad = sp.get('propiedad') ?? 'todas'

  let desdeStr: string, hastaStr: string, diasPeriodo: number, tituloPeriodo: string
  if (periodo === 'mensual') {
    const dias = new Date(anio, mes, 0).getDate()
    desdeStr = `${anio}-${String(mes).padStart(2,'0')}-01`
    hastaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dias).padStart(2,'0')}`
    diasPeriodo = dias; tituloPeriodo = `${MONTHS[mes-1]} ${anio}`
  } else if (periodo === 'anual') {
    desdeStr = `${anio}-01-01`; hastaStr = `${anio}-12-31`
    diasPeriodo = 365; tituloPeriodo = `Año ${anio}`
  } else {
    desdeStr = '2020-01-01'; hastaStr = `${now.getFullYear()}-12-31`
    diasPeriodo = Math.ceil((new Date(hastaStr).getTime() - new Date(desdeStr).getTime()) / 86400000)
    tituloPeriodo = 'Todo el tiempo'
  }

  const periodoInicio = new Date(desdeStr + 'T00:00:00')
  const periodoFin    = new Date(hastaStr + 'T23:59:59')

  const admin = createAdminClient()
  const desdeISO = desdeStr + 'T00:00:00'
  const hastaISO = hastaStr + 'T23:59:59'

  const [{ data: staysRaw }, { data: allocsRaw }] = await Promise.all([
    admin.from('stays').select(`
      id, shift_type, checked_in_at, checked_out_at,
      guests(first_name, last_name_paterno, rut),
      rooms(id, number, type, capacity, properties(id, name)),
      companies(id, name)
    `)
    .lte('checked_in_at', hastaISO)
    .or(`checked_out_at.gte.${desdeISO},checked_out_at.is.null`)
    .order('checked_in_at', { ascending: true })
    .limit(5000),
    admin.from('allocations').select(`room_id, company_id, rooms(id, capacity, properties(id, name)), companies(id, name)`),
  ])

  let stays = staysRaw ?? []
  let allocs = allocsRaw ?? []
  if (filtroEmpresa   !== 'todas') { stays = stays.filter(s => (s.companies as any)?.id === filtroEmpresa); allocs = allocs.filter(a => (a.companies as any)?.id === filtroEmpresa) }
  if (filtroPropiedad !== 'todas') { stays = stays.filter(s => (s.rooms as any)?.properties?.id === filtroPropiedad); allocs = allocs.filter(a => (a.rooms as any)?.properties?.id === filtroPropiedad) }

  function noches(s: typeof stays[0]) {
    const entrada = new Date(s.checked_in_at)
    const salida  = s.checked_out_at ? new Date(s.checked_out_at) : periodoFin
    const ini = entrada < periodoInicio ? periodoInicio : entrada
    const fin = salida  > periodoFin    ? periodoFin    : salida
    if (fin <= ini) return 0
    return Math.ceil((fin.getTime() - ini.getTime()) / 86400000)
  }

  const nochesH = stays.reduce((a,s) => a + noches(s), 0)
  const habMap  = new Map<string,number>()
  for (const a of allocs) { const r = a.rooms as any; if (r?.id) habMap.set(r.id, r.capacity ?? 1) }
  const camasDisp  = [...habMap.values()].reduce((a,c) => a+c, 0)
  const camasNoche = camasDisp * diasPeriodo
  const camasLibres = Math.max(0, camasNoche - nochesH)
  const ocupPct    = camasNoche > 0 ? Math.round((nochesH / camasNoche) * 100) : 0

  const propMap = new Map<string,{nombre:string;camasNoche:number;usado:number;estadias:number}>()
  for (const a of allocs) {
    const r = a.rooms as any, p = r?.properties
    if (!p?.id) continue
    if (!propMap.has(p.id)) propMap.set(p.id, { nombre: p.name, camasNoche: 0, usado: 0, estadias: 0 })
    propMap.get(p.id)!.camasNoche += (r.capacity ?? 1) * diasPeriodo
  }
  for (const s of stays) {
    const pid = (s.rooms as any)?.properties?.id
    if (pid && propMap.has(pid)) { propMap.get(pid)!.usado += noches(s); propMap.get(pid)!.estadias++ }
  }
  const porPropiedad = [...propMap.values()].map(p => ({ ...p, pct: p.camasNoche > 0 ? Math.round((p.usado/p.camasNoche)*100) : 0 })).sort((a,b)=>b.pct-a.pct)

  const empMap = new Map<string,{nombre:string;estadias:number;noches:number}>()
  for (const s of stays) {
    const c = s.companies as any; if (!c?.id) continue
    if (!empMap.has(c.id)) empMap.set(c.id, { nombre: c.name, estadias: 0, noches: 0 })
    empMap.get(c.id)!.estadias++; empMap.get(c.id)!.noches += noches(s)
  }
  const porEmpresa = [...empMap.values()].sort((a,b)=>b.noches-a.noches)

  const hoy = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})

  const COLS: [string, number][] = [['#',0.4],['Huésped',2],['RUT',1.2],['Empresa',1.5],['Propiedad',1.5],['Hab.',0.6],['Tipo',0.9],['Turno',0.8],['Entrada',1],['Salida',1],['Noches',0.7],['Estado',0.9]]

  const doc = (
    <Document title={`Reporte Sol Eterno — ${tituloPeriodo}`}>
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.hLabel}>REPORTE DE OCUPACIÓN — SOL ETERNO</Text>
            <Text style={s.hTitle}>{tituloPeriodo}</Text>
            <Text style={s.hSub}>{diasPeriodo} días · {porPropiedad.length} propiedad{porPropiedad.length!==1?'es':''} · Generado el {hoy}</Text>
          </View>
          <View>
            <Text style={s.hPct}>{ocupPct}%</Text>
            <Text style={s.hSub}>Ocupación del período</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={s.kpiGrid}>
          {[
            { label:'Noches-huésped',    val: nochesH.toLocaleString('es-CL'),      sub:`Suma de noches de todos los huéspedes`, color: N },
            { label:'Camas-noche disp.', val: camasNoche.toLocaleString('es-CL'),   sub:`${camasDisp} camas × ${diasPeriodo} días`, color: A },
            { label:'Camas-noche libres',val: camasLibres.toLocaleString('es-CL'),  sub:`${100-ocupPct}% sin ocupar`, color: G },
            { label:'Estadías totales',  val: stays.length.toString(),              sub:`${stays.filter(s=>!s.checked_out_at).length} activas al cierre`, color: A },
          ].map(k => (
            <View key={k.label} style={[s.kpiCard, { borderTopWidth: 3, borderTopColor: k.color }]}>
              <Text style={s.kpiVal}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={s.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Por propiedad + Por empresa */}
        <View style={s.row2}>
          <View style={s.card}>
            <View style={s.cardHead}><Text>Ocupación por propiedad</Text></View>
            <View style={{ padding: 8 }}>
              {porPropiedad.map(p => (
                <View key={p.nombre} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={{ fontFamily:'Helvetica-Bold', color:N, fontSize:8 }}>{p.nombre}</Text>
                    <Text style={{ color:G, fontSize:7 }}>{p.estadias} estadías · {p.usado}/{p.camasNoche} <Text style={{ fontFamily:'Helvetica-Bold', color:barColor(p.pct) }}>{p.pct}%</Text></Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width:`${p.pct}%`, backgroundColor:barColor(p.pct) }]}/>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardHead}><Text>Resumen por empresa</Text></View>
            <View style={s.tableHead}>
              {['Empresa','Estadías','Noches','%'].map((h,i) => (
                <Text key={h} style={[s.th, { flex: i===0?3:1, textAlign: i>0?'right':'left' }]}>{h}</Text>
              ))}
            </View>
            {porEmpresa.map(e => (
              <View key={e.nombre} style={s.tableRow}>
                <Text style={[s.tdBold, { flex:3 }]}>{e.nombre}</Text>
                <Text style={[s.td, { flex:1, textAlign:'right' }]}>{e.estadias}</Text>
                <Text style={[s.tdBold, { flex:1, textAlign:'right' }]}>{e.noches}</Text>
                <Text style={[s.td, { flex:1, textAlign:'right', color:G }]}>{nochesH>0?Math.round(e.noches/nochesH*100):0}%</Text>
              </View>
            ))}
            <View style={s.tableFooter}>
              <Text style={[s.tdBold, { flex:3 }]}>Total</Text>
              <Text style={[s.tdBold, { flex:1, textAlign:'right' }]}>{stays.length}</Text>
              <Text style={[s.tdBold, { flex:1, textAlign:'right', color:N }]}>{nochesH}</Text>
              <Text style={[s.td, { flex:1 }]}/>
            </View>
          </View>
        </View>

        {/* Listado */}
        <View style={s.card}>
          <View style={s.cardHead}><Text>Listado completo de huéspedes — {stays.length} registros</Text></View>
          <View style={s.tableHead}>
            {COLS.map(([h,f]) => (
              <Text key={h} style={[s.th, { flex:f, textAlign: h==='Noches'?'right':'left' }]}>{h}</Text>
            ))}
          </View>
          {stays.map((stay,i) => {
            const g=stay.guests as any, r=stay.rooms as any, c=stay.companies as any, n=noches(stay)
            return (
              <View key={stay.id} style={s.tableRow}>
                <Text style={[s.td,{flex:0.4,color:G}]}>{i+1}</Text>
                <Text style={[s.tdBold,{flex:2}]}>{g?.first_name} {g?.last_name_paterno}</Text>
                <Text style={[s.td,{flex:1.2,color:G}]}>{g?.rut??'—'}</Text>
                <Text style={[s.td,{flex:1.5}]}>{c?.name}</Text>
                <Text style={[s.td,{flex:1.5,fontFamily:'Helvetica-Bold'}]}>{r?.properties?.name}</Text>
                <Text style={[s.td,{flex:0.6}]}>{r?.number}</Text>
                <Text style={[s.td,{flex:0.9,color:G}]}>{r?.type?ROOM_TYPE_LABELS[r.type]??r.type:'—'}</Text>
                <Text style={[s.td,{flex:0.8,color:G}]}>{stay.shift_type??'—'}</Text>
                <Text style={[s.td,{flex:1}]}>{fmt(stay.checked_in_at)}</Text>
                <Text style={[s.td,{flex:1}]}>{stay.checked_out_at?fmt(stay.checked_out_at):'—'}</Text>
                <Text style={[s.tdBold,{flex:0.7,textAlign:'right'}]}>{n}</Text>
                <Text style={[s.td,{flex:0.9,color:stay.checked_out_at?G:A}]}>{stay.checked_out_at?'Completada':'Activa'}</Text>
              </View>
            )
          })}
          <View style={s.tableFooter}>
            <Text style={[s.tdBold,{flex:9.4}]}>Total</Text>
            <Text style={[s.tdBold,{flex:0.7,textAlign:'right',color:N}]}>{nochesH}</Text>
            <Text style={[s.td,{flex:0.9}]}/>
          </View>
        </View>

        <Text style={s.footer}>Sol Eterno — Gestión de Alojamientos · {hoy}</Text>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-sol-eterno-${tituloPeriodo.replace(/\s/g,'-')}.pdf"`,
    },
  })
}
