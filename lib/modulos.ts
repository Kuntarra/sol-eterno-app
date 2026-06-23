// Fuente única de verdad de los módulos del sistema.
// Agregar un módulo aquí lo propaga a permisos, activación por empresa y UI.
export const MODULOS = [
  { k: 'personal', label: 'Personal' },
  { k: 'transporte', label: 'Transporte' },
  { k: 'hotel', label: 'Hotel' },
  { k: 'alimentacion', label: 'Alimentación' },
  { k: 'colaciones', label: 'Colaciones' },
  { k: 'lavanderia', label: 'Lavandería' },
] as const

export type ModuloKey = (typeof MODULOS)[number]['k']

// Solo las claves, para validaciones y recorridos.
export const MODULO_KEYS: ModuloKey[] = MODULOS.map((m) => m.k)

// Ruta de la pantalla principal de cada módulo (para enrutar sub-usuarios).
export const MODULO_RUTA: Record<ModuloKey, string> = {
  personal: '/admin/personal',
  transporte: '/admin/transporte',
  hotel: '/admin/estadias',
  alimentacion: '/admin/alimentacion',
  colaciones: '/admin/colaciones',
  lavanderia: '/admin/lavanderia',
}
