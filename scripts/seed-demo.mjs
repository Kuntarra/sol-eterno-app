// Siembra los usuarios demo (Auth API requiere service role). Idempotente.
// Uso: node scripts/seed-demo.mjs   (lee .env.local → apunta al proyecto actual)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'DemoDotia2026!'
const T = { proyecto: 'dd000000-0000-0000-0000-0000000000d1', proveedor: 'dd000000-0000-0000-0000-0000000000d2' }

const USERS = [
  { email: 'proyecto-admin@demo.cl',      fullName: 'Proyecto · Admin',        role: 'admin',  tenantId: T.proyecto },
  { email: 'proyecto-supervisor@demo.cl', fullName: 'Proyecto · Supervisor',   role: 'modulo', tenantId: T.proyecto, modulos: [['hotel','admin_modulo'],['transporte','admin_modulo']] },
  { email: 'proyecto-revisor@demo.cl',    fullName: 'Proyecto · Revisor',      role: 'modulo', tenantId: T.proyecto, modulos: [['hotel','actuador'],['transporte','actuador']] },
  { email: 'proyecto-visor@demo.cl',      fullName: 'Proyecto · Visualizador', role: 'modulo', tenantId: T.proyecto, modulos: [['hotel','visor'],['transporte','visor']] },
  { email: 'prov-admin@demo.cl',          fullName: 'Proveedor · Admin',       role: 'admin',  tenantId: T.proveedor },
  { email: 'prov-supervisor@demo.cl',     fullName: 'Proveedor · Supervisor',  role: 'modulo', tenantId: T.proveedor, modulos: [['transporte','admin_modulo']] },
  { email: 'prov-revisor@demo.cl',        fullName: 'Proveedor · Revisor',     role: 'modulo', tenantId: T.proveedor, modulos: [['transporte','actuador']] },
  { email: 'prov-visor@demo.cl',          fullName: 'Proveedor · Visualizador',role: 'modulo', tenantId: T.proveedor, modulos: [['transporte','visor']] },
]

for (const u of USERS) {
  let { data: prof } = await admin.from('user_profiles').select('id').eq('email', u.email).maybeSingle()
  let userId = prof?.id
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email, password: DEMO_PASSWORD, email_confirm: true,
      user_metadata: { role: u.role, full_name: u.fullName, tenant_id: u.tenantId },
    })
    if (error) { console.log('SKIP', u.email, error.message); continue }
    userId = data.user.id
  }
  await admin.from('user_profiles').upsert({ id: userId, role: u.role, full_name: u.fullName, email: u.email, tenant_id: u.tenantId })
  if (u.modulos) {
    await admin.from('user_modulos').delete().eq('user_id', userId).is('proyecto_id', null)
    await admin.from('user_modulos').insert(u.modulos.map(([modulo, nivel]) => ({ user_id: userId, modulo, nivel, tenant_id: u.tenantId })))
  }
  console.log('OK  ', u.email, userId)
}
console.log('\nClave de todos los usuarios demo:', DEMO_PASSWORD)
