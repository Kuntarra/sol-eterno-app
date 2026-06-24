// Modo demo: usuarios de prueba en tenants aislados (es_demo=true) para
// previsualizar cada modalidad con login REAL. NUNCA tocar Sol Eterno.
// La clave es compartida porque son cuentas desechables sin datos reales.
export const DEMO_PASSWORD = 'DemoDotia2026!'

export const DEMO_TENANTS = {
  proyecto: 'dd000000-0000-0000-0000-0000000000d1',
  proveedor: 'dd000000-0000-0000-0000-0000000000d2',
} as const

export type DemoNivel = 'admin_modulo' | 'actuador' | 'visor'

export type DemoUserDef = {
  email: string
  fullName: string
  group: 'Mandante' | 'Proveedor'
  label: string
  role: 'admin' | 'modulo'
  tenantId: string
  modulos?: { modulo: string; nivel: DemoNivel }[]
}

// Matriz de modalidades (set completo). Los sub-usuarios (role 'modulo')
// llevan sus permisos por módulo; el alcance (todo el proyecto vs solo el
// módulo) lo decide tenant.tipo en runtime.
export const DEMO_USERS: DemoUserDef[] = [
  // ── Mandante ──
  { email: 'proyecto-admin@demo.cl',      fullName: 'Mandante · Admin',           group: 'Mandante', label: 'Admin',                role: 'admin',  tenantId: DEMO_TENANTS.proyecto },
  { email: 'proyecto-supervisor@demo.cl', fullName: 'Mandante · Supervisor',      group: 'Mandante', label: 'Supervisor de módulo', role: 'modulo', tenantId: DEMO_TENANTS.proyecto, modulos: [{ modulo: 'hotel', nivel: 'admin_modulo' }, { modulo: 'transporte', nivel: 'admin_modulo' }] },
  { email: 'proyecto-revisor@demo.cl',    fullName: 'Mandante · Revisor',         group: 'Mandante', label: 'Revisor',              role: 'modulo', tenantId: DEMO_TENANTS.proyecto, modulos: [{ modulo: 'hotel', nivel: 'actuador' }, { modulo: 'transporte', nivel: 'actuador' }] },
  { email: 'proyecto-visor@demo.cl',      fullName: 'Mandante · Visualizador',    group: 'Mandante', label: 'Visualizador',         role: 'modulo', tenantId: DEMO_TENANTS.proyecto, modulos: [{ modulo: 'hotel', nivel: 'visor' }, { modulo: 'transporte', nivel: 'visor' }] },
  // ── Proveedor ──
  { email: 'prov-admin@demo.cl',          fullName: 'Proveedor · Admin',          group: 'Proveedor',           label: 'Admin',                role: 'admin',  tenantId: DEMO_TENANTS.proveedor },
  { email: 'prov-supervisor@demo.cl',     fullName: 'Proveedor · Supervisor',     group: 'Proveedor',           label: 'Supervisor de módulo', role: 'modulo', tenantId: DEMO_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'admin_modulo' }] },
  { email: 'prov-revisor@demo.cl',        fullName: 'Proveedor · Revisor',        group: 'Proveedor',           label: 'Revisor',              role: 'modulo', tenantId: DEMO_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'actuador' }] },
  { email: 'prov-visor@demo.cl',          fullName: 'Proveedor · Visualizador',   group: 'Proveedor',           label: 'Visualizador',         role: 'modulo', tenantId: DEMO_TENANTS.proveedor, modulos: [{ modulo: 'transporte', nivel: 'visor' }] },
]
