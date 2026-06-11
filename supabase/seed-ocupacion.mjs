/**
 * seed-ocupacion.mjs — Ocupación multi-año 2023-2026
 *
 * - Regenera estadías para los 3 hostales del seed (Norte, Minero, Sol)
 * - Crea habitaciones + estadías para Hostal Juan Martinez
 * - Agrega estadías para Hostal Sol Eterno Vivar
 * - Datos variados: turnos, fechas, huéspedes aleatorios, estacionalidad, crecimiento anual
 *
 * Uso:  node --env-file=.env.local supabase/seed-ocupacion.mjs
 */

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Configuración ─────────────────────────────────────────────────────────────

const START_DATE = new Date('2023-01-01')
const END_DATE   = new Date('2026-06-30')

// Ocupación base por empresa (probabilidad de que una hab esté ocupada en temporada normal)
const BASE_OCC = {
  'MinCorp SA':             0.88,
  'CopperTech Ltda':        0.74,
  'NorteMine SpA':          0.60,
  'AndeanMining SA':        0.46,
  'Exploraciones Norte SpA':0.32,
  'Echeverria izquiero':    0.68,
}

// Factor de crecimiento anual (el negocio crece con los años)
const YEAR_FACTOR = { 2023: 0.62, 2024: 0.80, 2025: 1.00, 2026: 1.12 }

// Estacionalidad mensual (minería más activa en invierno/otoño)
const SEASONAL = [0.72, 0.76, 0.84, 0.90, 1.06, 1.12, 1.18, 1.12, 1.06, 0.94, 0.84, 0.68]

// Duración en días por turno (on, off)
const SHIFT_CYCLES = {
  '14x14': { on: 14, off: 14 },
  '7x7':   { on: 7,  off: 7  },
  '4x3':   { on: 4,  off: 3  },
  'día':   { on: 1,  off: 1  },
  'noche': { on: 1,  off: 1  },
}

// ── Nombres chilenos ───────────────────────────────────────────────────────────

const NOMBRES = ['Carlos','María','Juan','Ana','Luis','Sofía','Pedro','Carmen','Diego','Isabel',
  'Rodrigo','Patricia','Felipe','Valentina','Miguel','Claudia','Andrés','Fernanda','Roberto','Alejandra',
  'Marcos','Lorena','Cristóbal','Verónica','Héctor','Cecilia','Patricio','Natalia','Eduardo','Pilar',
  'Sebastián','Mónica','Nicolás','Sandra','Tomás','Gloria','Ignacio','Francisca','Jaime','Catalina',
  'Matías','Javiera','Benjamín','Daniela','Gonzalo','Constanza','Francisco','Camila','Álvaro','Paula',
  'Agustín','Renata','Maximiliano','Isidora','Vicente','Antonia','Emilio','Florencia','Sergio','Carla',
  'Raúl','Bárbara','Enrique','Marcela','Gustavo','Viviana','Alfredo','Ximena','Osvaldo','Cecilia']

const APELLIDOS = ['González','Muñoz','Rodríguez','López','Martínez','García','Pérez','Sánchez',
  'Ramírez','Torres','Flores','Rivera','Díaz','Reyes','Morales','Jiménez','Herrera','Medina','Castro',
  'Ortega','Vásquez','Fuentes','Espinoza','Contreras','Rojas','Bravo','Navarro','Soto','Valenzuela',
  'Ramos','Guerrero','Delgado','Mendoza','Vidal','Aguilar','Cortés','Salinas','Olivares','Castillo','Guzmán',
  'Pizarro','Acevedo','Miranda','Tapia','Figueroa','Sepúlveda','Araya','Cárdenas','Meza','Ríos']

// ── Helpers ────────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function rut() {
  const n = 7000000 + Math.floor(Math.random() * 8000000)
  const digits = String(n).split('').reverse()
  const factors = [2,3,4,5,6,7,2,3,4]
  const sum = digits.reduce((acc, d, i) => acc + parseInt(d) * factors[i], 0)
  const rem = 11 - (sum % 11)
  const dv = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem)
  return `${n}-${dv}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function occProb(companyName, date) {
  const base = BASE_OCC[companyName] ?? 0.55
  const yr   = YEAR_FACTOR[date.getFullYear()] ?? 1.0
  const seas = SEASONAL[date.getMonth()]
  return Math.min(0.97, base * yr * seas)
}

// ── Paso 1: leer propiedades, empresas, allocations ───────────────────────────
console.log('\n🏨  Sol Eterno — Seed ocupación multi-año 2023-2026\n')

const { data: properties } = await admin.from('properties').select('id, name').eq('active', true)
const { data: companies }  = await admin.from('companies').select('id, name').eq('active', true)
const { data: allocsAll }  = await admin
  .from('allocations')
  .select('id, room_id, company_id, rooms(id, number, type, capacity, property_id, properties(name)), companies(name)')

const propByName  = Object.fromEntries(properties.map(p => [p.name, p.id]))
const compByName  = Object.fromEntries(companies.map(c => [c.name, c.id]))

console.log('Propiedades:', properties.map(p => p.name).join(', '))
console.log('Empresas:', companies.map(c => c.name).join(', '))

// ── Paso 2: crear habitaciones para Hostal Juan Martinez ──────────────────────
const jmId = propByName['hostal Sol Eterno Juan Martinez']
const ecId = compByName['Echeverria izquiero']

if (jmId) {
  const { data: jmRooms } = await admin.from('rooms').select('id').eq('property_id', jmId)

  if (!jmRooms?.length) {
    console.log('\n🔨  Creando habitaciones para Hostal Juan Martinez...')

    const roomDefs = [
      // Piso 1
      ...['double','double','triple','shared','shared'].map((t, i) => ({
        property_id: jmId, number: `10${i+1}`, floor: 1, type: t,
        capacity: t==='double'?2 : t==='triple'?3 : t==='shared'?6 : 1
      })),
      // Piso 2
      ...['single','single','double','double','triple','suite'].map((t, i) => ({
        property_id: jmId, number: `20${i+1}`, floor: 2, type: t,
        capacity: t==='single'?1 : t==='double'?2 : t==='triple'?3 : 2
      })),
      // Piso 3
      ...['single','double','double','triple','suite'].map((t, i) => ({
        property_id: jmId, number: `30${i+1}`, floor: 3, type: t,
        capacity: t==='single'?1 : t==='double'?2 : t==='triple'?3 : 2
      })),
    ]

    const { data: newRooms } = await admin.from('rooms').insert(roomDefs).select('id')
    console.log(`  ✅  ${newRooms.length} habitaciones creadas`)

    // Crear allocations para Echeverria izquiero si existe
    if (ecId && newRooms?.length) {
      await admin.from('allocations').insert(
        newRooms.map(r => ({ company_id: ecId, room_id: r.id, start_date: '2022-01-01' }))
      )
      console.log(`  ✅  ${newRooms.length} allocations creadas → Echeverria izquiero`)
    }
  } else {
    console.log(`\nℹ️   Hostal Juan Martinez ya tiene ${jmRooms.length} habitaciones`)
  }
}

// ── Paso 3: recargar allocations (incluye las nuevas) ─────────────────────────
const { data: allocs } = await admin
  .from('allocations')
  .select('id, room_id, company_id, rooms(id, number, type, capacity, property_id, properties(name)), companies(name)')

console.log(`\n📋  Total allocations: ${allocs.length}`)

// ── Paso 4: borrar estadías anteriores del seed (por empresa seed) ─────────────
const seedCompanyIds = Object.values(compByName)
console.log('\n🗑   Limpiando estadías anteriores del seed...')
await admin.from('stays').delete().in('company_id', seedCompanyIds)
await admin.from('guests').delete().in('company_id', seedCompanyIds)
console.log('  ✅  Limpieza completa')

// ── Paso 5: crear pool de huéspedes por empresa ───────────────────────────────
console.log('\n👤  Creando pool de huéspedes...')

const guestPool = {}  // companyId → [guestId]

for (const comp of companies) {
  const qty = Math.ceil((BASE_OCC[comp.name] ?? 0.5) * 80) + 10  // 18–80 huéspedes
  const rows = Array.from({ length: qty }, (_, i) => ({
    first_name:        pick(NOMBRES),
    last_name_paterno: pick(APELLIDOS),
    last_name_materno: pick(APELLIDOS),
    rut:               rut(),
    phone:             `+569${Math.floor(10000000 + Math.random() * 90000000)}`,
    company_id:        comp.id,
  }))

  const { data: inserted } = await admin.from('guests').insert(rows).select('id')
  guestPool[comp.id] = (inserted ?? []).map(g => g.id)
  console.log(`  ${comp.name}: ${guestPool[comp.id].length} huéspedes`)
}

// ── Paso 6: generar estadías ──────────────────────────────────────────────────
console.log('\n📅  Generando estadías 2023-2026...')

const SHIFTS = Object.keys(SHIFT_CYCLES)

let totalStays = 0
const BATCH = 200
let batch = []

async function flushBatch() {
  if (!batch.length) return
  await admin.from('stays').insert(batch)
  totalStays += batch.length
  batch = []
}

// Asignar turno dominante por habitación (varía por tipo)
function dominantShift(roomType) {
  if (roomType === 'shared') return pick(['14x14','14x14','7x7'])
  if (roomType === 'suite')  return pick(['14x14','7x7','4x3'])
  return pick(['14x14','14x14','7x7','4x3'])
}

const now = new Date()

for (const alloc of allocs) {
  const room    = alloc.rooms
  const company = alloc.companies
  if (!room || !company) continue

  const pool = guestPool[alloc.company_id]
  if (!pool?.length) continue

  const dominant = dominantShift(room.type)
  let cursor = new Date(START_DATE)

  while (cursor < END_DATE && cursor < now) {
    // Elegir turno: 70% dominante, 30% aleatorio
    const shift = Math.random() < 0.70 ? dominant : pick(SHIFTS)
    const { on, off } = SHIFT_CYCLES[shift]

    const prob = occProb(company.name, cursor)

    if (Math.random() < prob) {
      const checkIn  = new Date(cursor)
      const checkOut = addDays(cursor, on)

      // Estadías futuras o actualmente en curso → sin checkout
      const isActive = checkOut > now
      const guestId  = pool[Math.floor(Math.random() * pool.length)]

      batch.push({
        guest_id:           guestId,
        room_id:            alloc.room_id,
        company_id:         alloc.company_id,
        allocation_id:      alloc.id,
        shift_type:         shift,
        checked_in_at:      new Date(checkIn.getTime() + 14 * 3600000).toISOString(),   // 14:00
        checked_out_at:     isActive ? null : new Date(checkOut.getTime() + 11 * 3600000).toISOString(), // 11:00
        estimated_checkout: checkOut.toISOString().split('T')[0],
      })

      if (batch.length >= BATCH) await flushBatch()
      cursor = addDays(cursor, on)
    }

    // Avanzar el tiempo libre (off) + pequeña variación aleatoria
    cursor = addDays(cursor, off + Math.floor(Math.random() * 3))
  }
}

await flushBatch()

// ── Paso 7: resumen ────────────────────────────────────────────────────────────
const { count: stayTotal }  = await admin.from('stays').select('*',  { count: 'exact', head: true })
const { count: activeTotal } = await admin.from('stays').select('*', { count: 'exact', head: true }).is('checked_out_at', null)
const { count: guestTotal } = await admin.from('guests').select('*', { count: 'exact', head: true })

console.log('\n╔══════════════════════════════════════╗')
console.log('║         SEED COMPLETADO              ║')
console.log('╠══════════════════════════════════════╣')
console.log(`║  Estadías generadas : ${String(totalStays).padEnd(13)}║`)
console.log(`║  Total en BD        : ${String(stayTotal).padEnd(13)}║`)
console.log(`║  Estadías activas   : ${String(activeTotal).padEnd(13)}║`)
console.log(`║  Huéspedes          : ${String(guestTotal).padEnd(13)}║`)
console.log('╚══════════════════════════════════════╝\n')
