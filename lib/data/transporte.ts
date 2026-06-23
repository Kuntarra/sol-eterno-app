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

export function updatePasajeroEstado(supabase: ServerClient, pasajeroId: string, patch: Record<string, unknown>) {
  return supabase.from('traslado_pasajeros').update(patch as never).eq('id', pasajeroId)
}
