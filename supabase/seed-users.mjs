/**
 * seed-users.mjs — Usuarios de prueba para Sol Eterno
 *
 * Crea 1 admin, 4 recepcionistas y 5 clientes usando los datos
 * del seed-anual-2025 (propiedades y empresas con UUIDs fijos).
 *
 * Uso:
 *   node --env-file=.env.local supabase/seed-users.mjs
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Faltan variables: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'SolEterno2025!'
const DOMAIN   = 'demo.soleterno.cl'

// ── Cargar IDs desde la base de datos ────────────────────────────────────────
const { data: propRows } = await admin.from('properties').select('id, name').eq('active', true)
const { data: compRows } = await admin.from('companies').select('id, name').eq('active', true)

const prop = Object.fromEntries((propRows ?? []).map(r => [r.name, r.id]))
const comp = Object.fromEntries((compRows ?? []).map(r => [r.name, r.id]))

console.log(`📦  Propiedades encontradas: ${Object.keys(prop).join(', ') || '(ninguna)'}`)
console.log(`🏢  Empresas encontradas:    ${Object.keys(comp).join(', ') || '(ninguna)'}`)

if (!Object.keys(prop).length) {
  console.warn('\n⚠️  No hay propiedades. Ejecuta seed-anual-2025.sql primero si quieres asignar recepcionistas.')
}
if (!Object.keys(comp).length) {
  console.warn('⚠️  No hay empresas. Ejecuta seed-anual-2025.sql primero si quieres crear clientes.')
}

// ── Definición de usuarios ────────────────────────────────────────────────────
const USERS = [
  // ── Recepcionistas ──────────────────────────────────────────────────────────
  {
    email:      `recepcion.norte@${DOMAIN}`,
    full_name:  'Ana Recepción Norte',
    role:       'receptionist',
    properties: [prop['Hostal Norte']].filter(Boolean),
  },
  {
    email:      `recepcion.minero@${DOMAIN}`,
    full_name:  'Pedro Recepción Minero',
    role:       'receptionist',
    properties: [prop['Hostal Minero']].filter(Boolean),
  },
  {
    email:      `recepcion.sol@${DOMAIN}`,
    full_name:  'Sofía Recepción Sol',
    role:       'receptionist',
    properties: [prop['Hostal del Sol']].filter(Boolean),
  },
  {
    email:      `recepcion.multi@${DOMAIN}`,
    full_name:  'Carlos Recepción Multi',
    role:       'receptionist',
    properties: Object.values(prop),  // todas las propiedades activas
  },

  // ── Clientes ────────────────────────────────────────────────────────────────
  {
    email:      `cliente.mincorp@${DOMAIN}`,
    full_name:  'MinCorp — Contacto Cliente',
    role:       'client',
    company_id: comp['MinCorp SA'],
  },
  {
    email:      `cliente.coppertech@${DOMAIN}`,
    full_name:  'CopperTech — Contacto Cliente',
    role:       'client',
    company_id: comp['CopperTech Ltda'],
  },
  {
    email:      `cliente.nortemine@${DOMAIN}`,
    full_name:  'NorteMine — Contacto Cliente',
    role:       'client',
    company_id: comp['NorteMine SpA'],
  },
  {
    email:      `cliente.andean@${DOMAIN}`,
    full_name:  'AndeanMining — Contacto Cliente',
    role:       'client',
    company_id: comp['AndeanMining SA'],
  },
  {
    email:      `cliente.explora@${DOMAIN}`,
    full_name:  'Explora Norte — Contacto Cliente',
    role:       'client',
    company_id: comp['Exploraciones Norte SpA'],
  },
].filter(u => {
  // Omitir usuarios para los que faltan datos requeridos
  if (u.role === 'client' && !u.company_id) {
    console.warn(`  ⚠️  Omitiendo ${u.email} (empresa no encontrada en BD)`)
    return false
  }
  return true
})

// ── Helpers ───────────────────────────────────────────────────────────────────
async function deleteExistingUser(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = data?.users?.find(u => u.email === email)
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id)
    console.log(`  🗑  Eliminado usuario previo: ${email}`)
  }
}

async function createUser(def) {
  await deleteExistingUser(def.email)

  const { data, error } = await admin.auth.admin.createUser({
    email:         def.email,
    password:      PASSWORD,
    email_confirm: true,
    user_metadata: { role: def.role, full_name: def.full_name },
  })

  if (error) {
    console.error(`  ❌  Error creando ${def.email}: ${error.message}`)
    return
  }

  const userId = data.user.id

  // Upsert perfil con empresa si aplica
  const profile = {
    id:        userId,
    role:      def.role,
    full_name: def.full_name,
    ...(def.company_id ? { company_id: def.company_id } : {}),
  }

  const { error: profileError } = await admin.from('user_profiles').upsert(profile)
  if (profileError) {
    console.error(`  ❌  Error en perfil ${def.email}: ${profileError.message}`)
    return
  }

  // Asignar propiedades al recepcionista
  if (def.properties?.length) {
    await admin.from('receptionist_properties').delete().eq('user_id', userId)
    await admin.from('receptionist_properties').insert(
      def.properties.map(pid => ({ user_id: userId, property_id: pid }))
    )
  }

  const tag = def.role === 'receptionist'
    ? `Recepcionista (${def.properties?.length} propiedad${def.properties?.length !== 1 ? 'es' : ''})`
    : `Cliente`

  console.log(`  ✅  ${def.full_name} — ${tag}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n🏨  Sol Eterno — Creando usuarios de prueba\n')
console.log(`📧  Dominio: @${DOMAIN}`)
console.log(`🔑  Contraseña: ${PASSWORD}\n`)

console.log('─── Recepcionistas ─────────────────────────────────────────────')
for (const u of USERS.filter(u => u.role === 'receptionist')) {
  await createUser(u)
}

console.log('\n─── Clientes ───────────────────────────────────────────────────')
for (const u of USERS.filter(u => u.role === 'client')) {
  await createUser(u)
}

console.log('\n\n╔══════════════════════════════════════════════════════════════╗')
console.log('║              CREDENCIALES DE ACCESO                        ║')
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log('║  Contraseña (todos): SolEterno2025!                        ║')
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log('║  RECEPCIONISTAS                                             ║')
console.log(`║  recepcion.norte@${DOMAIN}    → solo Norte      ║`)
console.log(`║  recepcion.minero@${DOMAIN}   → solo Minero     ║`)
console.log(`║  recepcion.sol@${DOMAIN}      → solo Sol        ║`)
console.log(`║  recepcion.multi@${DOMAIN}    → los 3 hostales  ║`)
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log('║  CLIENTES                                                   ║')
console.log(`║  cliente.mincorp@${DOMAIN}    → MinCorp   88%   ║`)
console.log(`║  cliente.coppertech@${DOMAIN} → Copper    72%   ║`)
console.log(`║  cliente.nortemine@${DOMAIN}  → Norte     58%   ║`)
console.log(`║  cliente.andean@${DOMAIN}     → Andean    44%   ║`)
console.log(`║  cliente.explora@${DOMAIN}    → Explora   31%   ║`)
console.log('╚══════════════════════════════════════════════════════════════╝\n')
