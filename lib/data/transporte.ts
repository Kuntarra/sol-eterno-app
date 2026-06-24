import type { ServerClient } from '@/lib/supabase/types'

// ── Capa de acceso a datos: Transporte ─────────────────────────────────────
// Única dueña de las consultas supabase del dominio Transporte. Las páginas y
// las acciones llaman a estas funciones en vez de tocar supabase.from(...).
// No parsea FormData ni redirige: solo lee/escribe datos.

// Listado paginado de traslados (lista principal).
export async function listTraslados(supabase: ServerClient, from: number, size: number) {
  const { data, count } = await supabase
    .from('traslados')
    .select('*, proyectos(nombre), vehiculos(tipo, identificador), traslado_pasajeros(id)', { count: 'exact' })
    .order('fecha', { ascending: false })
    .range(from, from + size - 1)
  return { rows: data ?? [], total: count ?? 0 }
}

// Detalle de un traslado (con proyecto y vehículo).
export async function getTraslado(supabase: ServerClient, id: string) {
  const { data } = await supabase
    .from('traslados')
    .select('*, proyectos(nombre), vehiculos(tipo, identificador, capacidad)')
    .eq('id', id)
    .maybeSingle()
  return data
}

// Dotaciones candidatas a pasajero (del proyecto del traslado, si lo tiene).
export async function listDotacionesCandidatas(supabase: ServerClient, proyectoId: string | null) {
  let q = supabase
    .from('dotaciones')
    .select('id, personas(nombres, apellido_paterno)')
    .order('created_at', { ascending: false })
  if (proyectoId) q = q.eq('proyecto_id', proyectoId)
  const { data } = await q
  return data ?? []
}

// Manifiesto: pasajeros de un traslado.
export async function listPasajeros(supabase: ServerClient, trasladoId: string) {
  const { data } = await supabase
    .from('traslado_pasajeros')
    .select('id, estado, lugar_bajada, personas(nombres, apellido_paterno)')
    .eq('traslado_id', trasladoId)
    .order('created_at')
  return data ?? []
}

// Flota completa (pantalla Flota).
export async function listVehiculos(supabase: ServerClient) {
  const { data } = await supabase.from('vehiculos').select('*').order('created_at', { ascending: false })
  return data ?? []
}

// Opciones para el form "Nuevo traslado".
export async function listProyectoOptions(supabase: ServerClient) {
  const { data } = await supabase.from('proyectos').select('id, nombre').order('nombre')
  return data ?? []
}
export async function listVehiculoOptions(supabase: ServerClient) {
  const { data } = await supabase.from('vehiculos').select('id, tipo, identificador').eq('activo', true).order('tipo')
  return data ?? []
}

// ── Escrituras ──────────────────────────────────────────────────────────────
type VehiculoInput = { tipo: string; identificador: string | null; capacidad: number; descripcion: string | null }
export function insertVehiculo(supabase: ServerClient, values: VehiculoInput) {
  return supabase.from('vehiculos').insert(values)
}

type TrasladoInput = {
  proyecto_id: string | null
  vehiculo_id: string | null
  tipo: string
  sentido: string
  fecha: string | null
  hora: string | null
  origen: string | null
  destino: string | null
  conductor_nombre: string | null
}
export function insertTraslado(supabase: ServerClient, values: TrasladoInput) {
  return supabase.from('traslados').insert(values).select('id').single()
}

export function updateTrasladoEstado(supabase: ServerClient, id: string, estado: string) {
  return supabase.from('traslados').update({ estado }).eq('id', id)
}

export async function getDotacionPersonaId(supabase: ServerClient, dotacionId: string) {
  const { data } = await supabase.from('dotaciones').select('persona_id').eq('id', dotacionId).maybeSingle()
  return data?.persona_id ?? null
}

type PasajeroInput = { traslado_id: string; dotacion_id: string; persona_id: string | null }
export function insertPasajero(supabase: ServerClient, values: PasajeroInput) {
  return supabase.from('traslado_pasajeros').insert(values)
}
export function insertPasajeros(supabase: ServerClient, rows: PasajeroInput[]) {
  return supabase.from('traslado_pasajeros').insert(rows)
}

// Opciones de cuadrilla para el manifiesto masivo (solo planificación).
export async function listCuadrillaOptions(supabase: ServerClient) {
  const { data } = await supabase.from('cuadrillas').select('id, nombre').eq('activa', true).order('nombre')
  return data ?? []
}

// dotacion_id ya presentes en el manifiesto (para no duplicar).
export async function listPasajeroDotacionIds(supabase: ServerClient, trasladoId: string) {
  const { data } = await supabase.from('traslado_pasajeros').select('dotacion_id').eq('traslado_id', trasladoId)
  return (data ?? []).map((r) => r.dotacion_id).filter(Boolean) as string[]
}

// Candidatos por alcance para PLANIFICAR el manifiesto (no es embarque):
// 'cuadrilla' = dotaciones activas de la cuadrilla; 'todos' = dotaciones con una
// rotación que cubre la fecha (en faena). Acota al proyecto del traslado si lo hay.
export async function listDotacionesByCuadrilla(supabase: ServerClient, cuadrillaId: string, proyectoId: string | null) {
  let q = supabase.from('dotaciones').select('id, persona_id').eq('cuadrilla_id', cuadrillaId).eq('estado', 'activa')
  if (proyectoId) q = q.eq('proyecto_id', proyectoId)
  const { data } = await q
  return data ?? []
}
export async function listDotacionesEnFaena(supabase: ServerClient, fecha: string, proyectoId: string | null) {
  const { data: rots } = await supabase
    .from('rotaciones')
    .select('dotacion_id')
    .lte('fecha_inicio', fecha)
    .gte('fecha_fin_esperada', fecha)
  const ids = [...new Set((rots ?? []).map((r) => r.dotacion_id).filter(Boolean))] as string[]
  if (!ids.length) return []
  let q = supabase.from('dotaciones').select('id, persona_id').in('id', ids).eq('estado', 'activa')
  if (proyectoId) q = q.eq('proyecto_id', proyectoId)
  const { data } = await q
  return data ?? []
}

export function updatePasajeroEstado(supabase: ServerClient, pasajeroId: string, patch: Record<string, unknown>) {
  return supabase.from('traslado_pasajeros').update(patch as never).eq('id', pasajeroId)
}

// ── Tramos (legs) de una movilización ─────────────────────────────────────────
type TramoInput = { orden: number; modo: string; origen: string | null; destino: string | null; fecha: string | null; hora: string | null; notas: string | null }
export function insertTramos(supabase: ServerClient, trasladoId: string, tramos: TramoInput[]) {
  return supabase.from('traslado_tramos').insert(tramos.map((t) => ({ ...t, traslado_id: trasladoId })))
}
export async function listTramos(supabase: ServerClient, trasladoId: string) {
  const { data } = await supabase
    .from('traslado_tramos')
    .select('id, orden, modo, origen, destino, fecha, hora, notas')
    .eq('traslado_id', trasladoId)
    .order('orden')
  return data ?? []
}
