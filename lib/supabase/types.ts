import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Cliente Supabase tipado contra nuestro esquema. Lo usan las funciones de la
// capa de datos (lib/data/*) para recibir el cliente ya creado (server o admin)
// sin volver a instanciarlo, preservando sesión/RLS.
export type ServerClient = SupabaseClient<Database>
