'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProyecto(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proyectos')
    .insert({
      nombre:             formData.get('nombre') as string,
      ciudad_id:          (formData.get('ciudad_id') as string) || null,
      faena:              (formData.get('faena') as string) || null,
      fecha_inicio:       (formData.get('fecha_inicio') as string) || null,
      fecha_fin_estimada: (formData.get('fecha_fin_estimada') as string) || null,
      estado:             (formData.get('estado') as string) || 'planificado',
      descripcion:        (formData.get('descripcion') as string) || null,
    })
    .select('id')
    .single()

  if (error) redirect('/admin/proyectos/nuevo?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/proyectos')
  redirect(`/admin/proyectos/${data.id}`)
}

export async function updateProyectoEstado(id: string, estado: string) {
  const supabase = await createClient()
  await supabase.from('proyectos').update({ estado }).eq('id', id)
  revalidatePath('/admin/proyectos')
  revalidatePath(`/admin/proyectos/${id}`)
}
