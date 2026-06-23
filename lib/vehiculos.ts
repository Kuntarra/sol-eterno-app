// Tipos de vehículo de la flota con su capacidad máxima permitida.
// La capacidad es modificable pero acotada al tope de cada tipo.
export type TipoVehiculo = {
  key: string
  label: string
  max: number   // capacidad máxima permitida
  def: number   // capacidad sugerida por defecto
}

export const TIPOS_VEHICULO: TipoVehiculo[] = [
  { key: 'bus',           label: 'Bus',               max: 54, def: 45 },
  { key: 'bus_dos_pisos', label: 'Bus dos pisos',     max: 70, def: 60 },
  { key: 'minibus',       label: 'Minibús',           max: 22, def: 20 },
  { key: 'sprinter',      label: 'Sprinter',          max: 22, def: 18 },
  { key: 'taxi',          label: 'Taxi',              max: 4,  def: 4 },
  { key: 'camioneta',     label: 'Camioneta pick-up', max: 4,  def: 4 },
]

// Etiquetas para renderizar (incluye claves antiguas para datos ya cargados).
export const TIPO_VEHICULO_LABEL: Record<string, string> = {
  ...Object.fromEntries(TIPOS_VEHICULO.map((t) => [t.key, t.label])),
  vehiculo: 'Vehículo',
  otro: 'Otro',
}

// Capacidad máxima de un tipo (fallback amplio para claves desconocidas).
export function capMaxVehiculo(tipo: string): number {
  return TIPOS_VEHICULO.find((t) => t.key === tipo)?.max ?? 80
}

// Acota la capacidad ingresada al rango válido del tipo.
export function clampCapacidad(tipo: string, capacidad: number): number {
  const max = capMaxVehiculo(tipo)
  if (!Number.isFinite(capacidad)) return 1
  return Math.min(Math.max(Math.trunc(capacidad), 1), max)
}
