'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedePlanificar } from '@/lib/rbac'
import { registrarActividad } from './_log'

// Asigna una persona del directorio a un proyecto (crea la DOTACIÓN/contrato)
// y auto-genera las rotaciones esperadas desde el turno + duración.
export async function createDotacion(proyectoId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/proyectos/${proyectoId}`
  if (!(await puedePlanificar())) redirect(back + '?error=' + encodeURIComponent('Solo quien planifica puede gestionar dotaciones.'))

  const personaId = formData.get('persona_id') as string
  if (!personaId) redirect(back + '?error=' + encodeURIComponent('Selecciona una persona.'))

  const diasTrabajo = parseInt((formData.get('turno_dias_trabajo') as string) || '', 10)
  const diasDescanso = parseInt((formData.get('turno_dias_descanso') as string) || '', 10)

  // Oficio heredado del directorio de la persona
  const { data: dir } = await supabase
    .from('persona_directorio')
    .select('oficio_id')
    .eq('persona_id', personaId)
    .maybeSingle()

  const { data: dot, error } = await supabase
    .from('dotaciones')
    .insert({
      persona_id:            personaId,
      proyecto_id:           proyectoId,
      oficio_id:             dir?.oficio_id ?? null,
      turno_dias_trabajo:    Number.isFinite(diasTrabajo) ? diasTrabajo : null,
      turno_dias_descanso:   Number.isFinite(diasDescanso) ? diasDescanso : null,
      fecha_inicio_contrato: (formData.get('fecha_inicio_contrato') as string) || null,
      fecha_fin_contrato:    (formData.get('fecha_fin_contrato') as string) || null,
      estado:                'activa',
    })
    .select('id')
    .single()

  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))

  // Auto-generar rotaciones esperadas (si hay turno + fechas)
  await supabase.rpc('generar_rotaciones', { p_dotacion_id: dot.id })

  await registrarActividad('dotacion', dot.id, 'crear_dotacion', { proyecto_id: proyectoId, persona_id: personaId })

  revalidatePath(back)
  redirect(back + '?success=asignada')
}
