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
