/**
 * seed-demo-80.mjs — Demo controlada: 3 empresas, 6 hoteles, ~80% ocupación
 *
 * - 3 empresas: 1 / 2 / 3 hoteles
 * - 6 proyectos (1 por hotel)
 * - 120 habitaciones por hotel (single/double) = 720 hab, 1080 camas
 * - ~80% de camas ocupadas; 20% de las estadías con movimiento
 *   (check-in / check-out) repartido en antes de ayer, ayer, hoy y mañana
 *
 * Uso:  node --env-file=.env.local supabase/seed-demo-80.mjs
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CITY_IQUIQUE = '965d5552' // prefijo; se resuelve abajo

// ── Empresas → hoteles (1 / 2 / 3) ───────────────────────────
const GROUPS = {
  'MinCorp SA':      ['Hostal Cordillera'],
  'CopperTech Ltda': ['hostal Sol Eterno Juan martinez', 'hostal sol eterno vivar'],
  'NorteMine SpA':   ['Hostal Norte', 'Hostal Minero', 'Hostal del Sol'],
}
const KEEP_COMPANIES = Object.keys(GROUPS)

const ROOMS_PER_HOTEL = 120
const OCC = 0.80         // proporción de camas ocupadas
const MOVE = 0.20        // proporción de estadías con movimiento reciente
const SHIFTS = ['14x14', '14x14', '7x7', '4x3']

const NOMBRES = ['Carlos','María','Juan','Ana','Luis','Sofía','Pedro','Carmen','Diego','Isabel','Rodrigo','Patricia','Felipe','Valentina','Miguel','Claudia','Andrés','Fernanda','Roberto','Alejandra','Marcos','Lorena','Cristóbal','Verónica','Héctor','Cecilia','Patricio','Natalia','Eduardo','Pilar','Sebastián','Mónica','Nicolás','Sandra','Tomás','Gloria','Ignacio','Francisca','Jaime','Catalina','Matías','Javiera','Benjamín','Daniela','Gonzalo','Constanza','Francisco','Camila','Álvaro','Paula']
const APELLIDOS = ['González','Muñoz','Rodríguez','López','Martínez','García','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Díaz','Reyes','Morales','Jiménez','Herrera','Medina','Castro','Ortega','Vásquez','Fuentes','Espinoza','Contreras','Rojas','Bravo','Navarro','Soto','Valenzuela','Ramos','Guerrero','Delgado','Mendoza','Vidal','Aguilar','Cortés','Salinas','Olivares','Castillo','Guzmán']

const pick = a => a[Math.floor(Math.random() * a.length)]
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
function rut() {
  const n = 7000000 + Math.floor(Math.random() * 8000000)
  const d = String(n).split('').reverse(); const f = [2,3,4,5,6,7,2,3,4]
  const s = d.reduce((a, x, i) => a + parseInt(x) * f[i], 0); const r = 11 - (s % 11)
  return `${n}-${r === 11 ? '0' : r === 10 ? 'K' : r}`
}
const at = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const ymd = d => d.toISOString().split('T')[0]

console.log('\n🏨  Seed demo 80% — 3 empresas / 6 hoteles\n')

// ── 1. Reset operativo (conserva propiedades, empresas, ciudades) ──
console.log('🗑   Borrando stays, guests, allocations, rooms, projects…')
await admin.from('stays').delete().not('id', 'is', null)
await admin.from('guests').delete().not('id', 'is', null)
await admin.from('allocations').delete().not('id', 'is', null)
await admin.from('rooms').delete().not('id', 'is', null)
await admin.from('projects').delete().not('id', 'is', null)
console.log('  ✅  limpieza completa')

// ── 2. Empresas: activar 3, desactivar el resto ──
const { data: comps } = await admin.from('companies').select('id,name')
const compByName = Object.fromEntries(comps.map(c => [c.name, c.id]))
for (const c of comps) {
  await admin.from('companies').update({ active: KEEP_COMPANIES.includes(c.name) }).eq('id', c.id)
}
console.log(`\n🏢  Empresas activas: ${KEEP_COMPANIES.join(', ')}`)

// ── 3. Propiedades: asegurar las 6 (crear faltantes) ──
const { data: cities } = await admin.from('cities').select('id,name')
const cityId = (cities.find(c => c.id.startsWith(CITY_IQUIQUE)) ?? cities[0]).id
const { data: existing } = await admin.from('properties').select('id,name')
const propByName = Object.fromEntries(existing.map(p => [p.name, p.id]))

const allHotels = Object.values(GROUPS).flat()
for (const name of allHotels) {
  if (!propByName[name]) {
    const { data } = await admin.from('properties')
      .insert({ name, city_id: cityId, type: 'hostal', floors: 6, active: true }).select('id').single()
    propByName[name] = data.id
    console.log(`  🏗   propiedad creada: ${name}`)
  } else {
    await admin.from('properties').update({ active: true, floors: 6 }).eq('id', propByName[name])
  }
}

// ── 4. Proyectos (1 por hotel, bajo su empresa) ──
const projByHotel = {}
for (const [company, hotels] of Object.entries(GROUPS)) {
  for (const h of hotels) {
    const { data } = await admin.from('projects')
      .insert({ company_id: compByName[company], name: h, active: true }).select('id').single()
    projByHotel[h] = data.id
  }
}
console.log(`\n📁  ${Object.keys(projByHotel).length} proyectos creados`)

// ── 5. Habitaciones + allocations por hotel ──
const startAlloc = ymd(addDays(new Date(), -180))
const roomsByHotel = {}   // hotel → [{id, capacity}]
let totalRooms = 0, totalBeds = 0

for (const [company, hotels] of Object.entries(GROUPS)) {
  for (const hotel of hotels) {
    const pid = propByName[hotel]
    const defs = []
    for (let i = 0; i < ROOMS_PER_HOTEL; i++) {
      const floor = Math.floor(i / 20) + 1
      const isSingle = i % 2 === 0
      defs.push({
        property_id: pid, number: `${floor}${String(i % 20 + 1).padStart(2, '0')}`,
        floor, type: isSingle ? 'single' : 'double', capacity: isSingle ? 1 : 2,
      })
    }
    const { data: rooms } = await admin.from('rooms').insert(defs).select('id,capacity')
    await admin.from('allocations').insert(
      rooms.map(r => ({ company_id: compByName[company], room_id: r.id, project_id: projByHotel[hotel], start_date: startAlloc }))
    )
    // recuperar allocation_id por room
    const { data: allocs } = await admin.from('allocations').select('id,room_id').eq('project_id', projByHotel[hotel])
    const allocByRoom = Object.fromEntries(allocs.map(a => [a.room_id, a.id]))
    roomsByHotel[hotel] = rooms.map(r => ({ id: r.id, capacity: r.capacity, allocation_id: allocByRoom[r.id] }))
    totalRooms += rooms.length
    totalBeds += rooms.reduce((s, r) => s + r.capacity, 0)
  }
}
console.log(`\n🛏   ${totalRooms} habitaciones · ${totalBeds} camas`)

// ── 6. Camas (unidades ocupables) por empresa ──
const bedsByCompany = {}   // company → [{hotel, room_id, allocation_id}]
for (const [company, hotels] of Object.entries(GROUPS)) {
  const beds = []
  for (const hotel of hotels)
    for (const r of roomsByHotel[hotel])
      for (let b = 0; b < r.capacity; b++) beds.push({ hotel, room_id: r.id, allocation_id: r.allocation_id })
  bedsByCompany[company] = shuffle(beds)
}

// ── 7. Plan por empresa + huéspedes ──
// 80% camas ACTIVAS (ocupadas ahora) · 12% check-outs recientes (camas libres) · 6% arribos mañana
const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const RECENT_IN = [-2, -1, 0]          // antes de ayer, ayer, hoy
const OUT_DAYS  = [-2, -1, 0, 1]       // + mañana
const rnd = n => Math.floor(Math.random() * n)

const plan = {}
for (const company of KEEP_COMPANIES) {
  const total = bedsByCompany[company].length
  const nStable   = Math.round(total * 0.74)  // ocupadas todo el mes
  const nRecentIn = Math.round(total * 0.06)  // check-in -2/-1/0, siguen alojadas
  const nOut      = Math.round(total * 0.10)  // check-out -2/-1/0/+1 (camas libres)
  const nFuture   = Math.round(total * 0.04)  // arribo mañana (camas libres)
  plan[company] = { nStable, nRecentIn, nOut, nFuture, total: nStable + nRecentIn + nOut + nFuture }
}

const guestPool = {}
for (const company of KEEP_COMPANIES) {
  const rows = Array.from({ length: plan[company].total }, () => ({
    first_name: pick(NOMBRES), last_name_paterno: pick(APELLIDOS), last_name_materno: pick(APELLIDOS),
    rut: rut(), phone: `+569${Math.floor(10000000 + Math.random() * 90000000)}`, company_id: compByName[company],
  }))
  const { data } = await admin.from('guests').insert(rows).select('id')
  guestPool[company] = data.map(g => g.id)
}
console.log(`\n👤  Huéspedes: ${Object.values(guestPool).reduce((a, p) => a + p.length, 0)}`)

// ── 8. Estadías ──
const batch = []
let totalStays = 0
const flush = async () => { if (batch.length) await admin.from('stays').insert(batch.splice(0)) }

for (const company of KEEP_COMPANIES) {
  const beds = bedsByCompany[company]
  const pool = guestPool[company]
  const { nStable, nRecentIn, nOut, nFuture } = plan[company]
  let bi = 0, gi = 0
  const base = bed => ({
    room_id: bed.room_id, company_id: compByName[company],
    allocation_id: bed.allocation_id, project_id: projByHotel[bed.hotel],
    shift_type: pick(SHIFTS), notes: 'SEED80',
  })
  const push = s => { batch.push(s); totalStays++ }

  // 74% estables: ocupadas todo el mes (entrada justo antes/al inicio del mes)
  for (let k = 0; k < nStable; k++) {
    const bed = beds[bi++], guest_id = pool[gi++]
    const ci = at(addDays(monthStart, -rnd(4)), 15)
    push({ ...base(bed), guest_id, checked_in_at: ci.toISOString(), checked_out_at: null, estimated_checkout: ymd(addDays(now, 8 + rnd(20))) })
    if (batch.length >= 200) await flush()
  }
  // 6% check-in reciente (-2/-1/0), siguen alojados
  for (let k = 0; k < nRecentIn; k++) {
    const bed = beds[bi++], guest_id = pool[gi++]
    const ci = at(addDays(now, pick(RECENT_IN)), 15)
    push({ ...base(bed), guest_id, checked_in_at: ci.toISOString(), checked_out_at: null, estimated_checkout: ymd(addDays(now, 7 + rnd(14))) })
    if (batch.length >= 200) await flush()
  }
  // 10% check-out (-2/-1/0/+1) en camas libres
  for (let k = 0; k < nOut; k++) {
    const bed = beds[bi++], guest_id = pool[gi++]
    const co = at(addDays(now, pick(OUT_DAYS)), 11)
    const ci = at(addDays(co, -(5 + rnd(14))), 15)
    push({ ...base(bed), guest_id, checked_in_at: ci.toISOString(), checked_out_at: co.toISOString(), estimated_checkout: ymd(co) })
    if (batch.length >= 200) await flush()
  }
  // 4% arribos mañana (camas libres)
  for (let k = 0; k < nFuture; k++) {
    const bed = beds[bi++], guest_id = pool[gi++]
    const ci = at(addDays(now, 1), 15)
    push({ ...base(bed), guest_id, checked_in_at: ci.toISOString(), checked_out_at: null, estimated_checkout: ymd(addDays(ci, 7 + rnd(14))) })
    if (batch.length >= 200) await flush()
  }
}
await flush()

// ── 9. Resumen (ocupación real como la calcula el dashboard) ──
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
const diasMes = monthEnd.getDate()
const nochesEn = (s, ini, fin) => {
  const a = Math.max(new Date(s.checked_in_at).getTime(), ini.getTime())
  const b = Math.min((s.checked_out_at ? new Date(s.checked_out_at) : fin).getTime(), fin.getTime())
  return b <= a ? 0 : Math.ceil((b - a) / 86400000)
}
const { data: allStays } = await admin.from('stays').select('checked_in_at,checked_out_at').limit(5000)
const nochesMes = allStays.reduce((acc, s) => acc + nochesEn(s, monthStart, monthEnd), 0)
const gauge = Math.round(nochesMes / (totalBeds * diasMes) * 100)
const ocupadosHoy = allStays.filter(s => new Date(s.checked_in_at) <= now && (!s.checked_out_at || new Date(s.checked_out_at) > now)).length

// Movimientos por día
const dstr = d => ymd(addDays(now, d))
const movs = { '-2': { in: 0, out: 0 }, '-1': { in: 0, out: 0 }, '0': { in: 0, out: 0 }, '1': { in: 0, out: 0 } }
for (const s of allStays) {
  for (const d of [-2, -1, 0, 1]) {
    if (ymd(new Date(s.checked_in_at)) === dstr(d)) movs[d].in++
    if (s.checked_out_at && ymd(new Date(s.checked_out_at)) === dstr(d)) movs[d].out++
  }
}
console.log('\n╔════════════════════════════════════════╗')
console.log(`║  Estadías creadas   : ${String(totalStays).padEnd(15)} ║`)
console.log(`║  Camas totales      : ${String(totalBeds).padEnd(15)} ║`)
console.log(`║  Ocupados HOY       : ${String(ocupadosHoy + ' (' + Math.round(ocupadosHoy / totalBeds * 100) + '%)').padEnd(15)} ║`)
console.log(`║  Ocupación del mes  : ${String(gauge + '% (gauge dashboard)').padEnd(15)} ║`)
console.log('╠════════════════════════════════════════╣')
console.log(`║  Movimientos (in/out):                 ║`)
console.log(`║   antes de ayer: ${String(movs['-2'].in + ' in · ' + movs['-2'].out + ' out').padEnd(20)}  ║`)
console.log(`║   ayer         : ${String(movs['-1'].in + ' in · ' + movs['-1'].out + ' out').padEnd(20)}  ║`)
console.log(`║   hoy          : ${String(movs['0'].in + ' in · ' + movs['0'].out + ' out').padEnd(20)}  ║`)
console.log(`║   mañana       : ${String(movs['1'].in + ' in · ' + movs['1'].out + ' out').padEnd(20)}  ║`)
console.log('╚════════════════════════════════════════╝\n')
