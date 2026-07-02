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

  let diasTrabajo: number | null = Number.isFinite(parseInt((formData.get('turno_dias_trabajo') as string) || '', 10)) ? parseInt((formData.get('turno_dias_trabajo') as string), 10) : null
  let diasDescanso: number | null = Number.isFinite(parseInt((formData.get('turno_dias_descanso') as string) || '', 10)) ? parseInt((formData.get('turno_dias_descanso') as string), 10) : null
  const tipoTurnoId = (formData.get('tipo_turno_id') as string) || null

  // Si se eligió un tipo de turno del catálogo y no se ingresaron días a mano,
  // se denormalizan desde el catálogo (así la ficha y las rotaciones los usan).
  if (tipoTurnoId && diasTrabajo === null) {
    const { data: tt } = await supabase
      .from('tipos_turno')
      .select('dias_trabajo, dias_descanso')
      .eq('id', tipoTurnoId)
      .maybeSingle()
    if (tt) {
      diasTrabajo = tt.dias_trabajo
      diasDescanso = diasDescanso ?? tt.dias_descanso
    }
  }

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
      tipo_turno_id:         tipoTurnoId,
      turno_dias_trabajo:    diasTrabajo,
      turno_dias_descanso:   diasDescanso,
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
