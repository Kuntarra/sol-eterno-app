'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { puedeGestionar } from '@/lib/rbac'

// ── Colaciones ─────────────────────────────────────────────────
export async function createColacion(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  const { error } = await supabase.from('colaciones').insert({
    proyecto_id:   (formData.get('proyecto_id') as string) || null,
    dotacion_id:   (formData.get('dotacion_id') as string) || null,
    punto_entrega: (formData.get('punto_entrega') as string) || 'otro',
    sentido:       (formData.get('sentido') as string) || 'entrada',
    fecha:         (formData.get('fecha') as string) || null,
    contenido:     (formData.get('contenido') as string) || null,
    cantidad:      Number.isFinite(cant) ? cant : 1,
  })
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?success=1')
}

// Genera una colación por PERSONA para un alcance (persona/cuadrilla/todos en
// faena) en un punto de entrega, en un solo viaje (función SQL masiva).
export async function aplicarColaciones(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const scope = (formData.get('scope') as string) || 'persona'
  const ref = (formData.get('ref') as string) || null
  const fecha = formData.get('fecha') as string
  if (!fecha) redirect('/admin/colaciones?error=' + encodeURIComponent('Falta la fecha.'))
  if ((scope === 'persona' || scope === 'cuadrilla') && !ref) {
    redirect('/admin/colaciones?error=' + encodeURIComponent('Selecciona ' + (scope === 'persona' ? 'una persona' : 'una cuadrilla') + '.'))
  }
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  const { data, error } = await supabase.rpc('aplicar_colaciones_masivo' as never, {
    p_fecha:     fecha,
    p_punto:     (formData.get('punto_entrega') as string) || 'otro',
    p_sentido:   (formData.get('sentido') as string) || 'entrada',
    p_contenido: (formData.get('contenido') as string) || '',
    p_cantidad:  Number.isFinite(cant) ? cant : 1,
    p_scope:     scope,
    p_ref:       ref,
  } as never)
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?generadas=' + (Number(data) || 0))
}

// Genera (1 clic) las colaciones de SALIDA sugeridas: personas que terminan
// turno en la fecha y tienen bus de vuelta asignado.
export async function generarColacionesSalida(formData: FormData) {
  if (!(await puedeGestionar('colaciones'))) redirect('/admin/colaciones?error=' + encodeURIComponent('No tienes permiso de supervisor en Colaciones.'))
  const supabase = await createClient()
  const fecha = formData.get('fecha') as string
  if (!fecha) redirect('/admin/colaciones?error=' + encodeURIComponent('Falta la fecha.'))
  const { data, error } = await supabase.rpc('generar_colaciones_salida' as never, {
    p_fecha: fecha, p_generar: true, p_punto: (formData.get('punto') as string) || 'transporte_vuelta',
  } as never)
  if (error) redirect('/admin/colaciones?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/colaciones')
  redirect('/admin/colaciones?generadas=' + (Number(data) || 0))
}

export async function toggleColacionEntregada(id: string, entregada: boolean) {
  const supabase = await createClient()
  await supabase.from('colaciones').update({
    entregada,
    entregada_at: entregada ? new Date().toISOString() : null,
  }).eq('id', id)
  revalidatePath('/admin/colaciones')
}

// ── Alimentación ───────────────────────────────────────────────
export async function createPlanAlimentacion(formData: FormData) {
  if (!(await puedeGestionar('alimentacion'))) redirect('/admin/alimentacion?error=' + encodeURIComponent('No tienes permiso de supervisor en Alimentación.'))
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect('/admin/alimentacion?error=' + encodeURIComponent('Selecciona una persona.'))
  const { error } = await supabase.from('plan_alimentacion').upsert({
    dotacion_id: dotacionId,
    fecha:       formData.get('fecha') as string,
    desayuno:    (formData.get('desayuno') as string) || 'no',
    almuerzo:    (formData.get('almuerzo') as string) || 'no',
    cena:        (formData.get('cena') as string) || 'no',
  }, { onConflict: 'dotacion_id,fecha' })
  if (error) redirect('/admin/alimentacion?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/alimentacion')
  redirect('/admin/alimentacion?success=1')
}

// Aplica el plan de comidas de un día a un alcance (persona/cuadrilla/todos en
// faena) en un solo viaje a la base (función SQL masiva, escala a miles).
export async function aplicarAlimentacion(formData: FormData) {
  if (!(await puedeGestionar('alimentacion'))) redirect('/admin/alimentacion?error=' + encodeURIComponent('No tienes permiso de supervisor en Alimentación.'))
  const supabase = await createClient()
  const scope = (formData.get('scope') as string) || 'persona'
  const ref = (formData.get('ref') as string) || null
  const fecha = formData.get('fecha') as string
  if (!fecha) redirect('/admin/alimentacion?error=' + encodeURIComponent('Falta la fecha.'))
  if ((scope === 'persona' || scope === 'cuadrilla') && !ref) {
    redirect('/admin/alimentacion?error=' + encodeURIComponent('Selecciona ' + (scope === 'persona' ? 'una persona' : 'una cuadrilla') + '.'))
  }
  const modo = (formData.get('modo') as string) || 'dia'
  const comidas = {
    p_desayuno: (formData.get('desayuno') as string) || 'no',
    p_almuerzo: (formData.get('almuerzo') as string) || 'no',
    p_cena:     (formData.get('cena') as string) || 'no',
  }

  // "Por turno" = todos los días de la rotación que contiene la fecha (opcional
  // excluir 1er/último día). "Un día" = solo esa fecha. rpc casteado (función nueva).
  const { data, error } = modo === 'turno'
    ? await supabase.rpc('aplicar_alimentacion_turno' as never, {
        p_fecha: fecha, ...comidas, p_scope: scope, p_ref: ref,
        p_excl_primer: formData.get('excl_primer') === 'on',
        p_excl_ultimo: formData.get('excl_ultimo') === 'on',
      } as never)
    : await supabase.rpc('aplicar_alimentacion_masivo' as never, {
        p_fecha: fecha, ...comidas, p_scope: scope, p_ref: ref,
      } as never)

  if (error) redirect('/admin/alimentacion?error=' + encodeURIComponent((error as { message: string }).message))
  revalidatePath('/admin/alimentacion')
  redirect('/admin/alimentacion?aplicados=' + (Number(data) || 0) + '&modo=' + modo)
}

// ── Lavandería ─────────────────────────────────────────────────
export async function createPrenda(formData: FormData) {
  const supabase = await createClient()
  const nombre = (formData.get('nombre') as string)?.trim()
  if (nombre) await supabase.from('prendas_catalogo').insert({ nombre })
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=prenda')
}

export async function createBolsa(formData: FormData) {
  if (!(await puedeGestionar('lavanderia'))) redirect('/admin/lavanderia?error=' + encodeURIComponent('No tienes permiso de supervisor en Lavandería.'))
  const supabase = await createClient()
  const dotacionId = formData.get('dotacion_id') as string
  if (!dotacionId) redirect('/admin/lavanderia?error=' + encodeURIComponent('Selecciona una persona.'))
  const { data: dot } = await supabase.from('dotaciones').select('persona_id').eq('id', dotacionId).maybeSingle()
  const { error } = await supabase.from('lavanderia_bolsas').insert({
    dotacion_id:   dotacionId,
    persona_id:    dot?.persona_id ?? null,
    entregada_por: (formData.get('entregada_por') as string) || null,
  })
  if (error) redirect('/admin/lavanderia?error=' + encodeURIComponent(error.message))
  revalidatePath('/admin/lavanderia')
  redirect('/admin/lavanderia?success=bolsa')
}

const FLUJO: Record<string, string> = {
  recepcionada: 'en_lavanderia', en_lavanderia: 'en_proceso', en_proceso: 'entregada', entregada: 'entregada',
}
export async function avanzarBolsa(id: string, estadoActual: string) {
  const supabase = await createClient()
  await supabase.from('lavanderia_bolsas')
    .update({ estado: FLUJO[estadoActual] ?? estadoActual, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/lavanderia')
}

// ── Vínculos (match proveedor por RUT) ─────────────────────────
export async function createVinculo(proyectoId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/proyectos/${proyectoId}`
  const rut = ((formData.get('proveedor_rut') as string) || '').trim()
  if (!rut) redirect(back + '?error=' + encodeURIComponent('Ingresa el RUT del proveedor.'))

  // ¿El proveedor ya está en el SaaS? (match por RUT del tenant)
  const { data: tenantProv } = await supabase.from('tenants').select('id, name').eq('rut', rut).maybeSingle()

  const { error } = await supabase.from('proyecto_proveedores').insert({
    proyecto_id:        proyectoId,
    proveedor_rut:      rut,
    proveedor_nombre:   (formData.get('proveedor_nombre') as string) || tenantProv?.name || null,
    tenant_proveedor_id: tenantProv?.id ?? null,
    modulo:             (formData.get('modulo') as string) || 'transporte',
    estado:             tenantProv ? 'activo' : 'stub',
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  revalidatePath(back)
  redirect(back + '?success=vinculo')
}

// Recursos que el proveedor compromete a este proyecto (ej. 3 buses, 3 sprinters).
export async function addRecursoVinculo(proyectoId: string, vinculoId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/proyectos/${proyectoId}`
  const tipo = ((formData.get('tipo') as string) || '').trim()
  const cant = parseInt((formData.get('cantidad') as string) || '1', 10)
  if (!tipo) redirect(back + '?error=' + encodeURIComponent('Indica el tipo de recurso (ej. Bus, Sprinter).'))

  const { error } = await supabase.from('proyecto_proveedor_recursos').insert({
    vinculo_id: vinculoId,
    tipo,
    cantidad: Number.isFinite(cant) && cant >= 0 ? cant : 1,
    notas: ((formData.get('notas') as string) || '').trim() || null,
  })
  if (error) redirect(back + '?error=' + encodeURIComponent(error.message))
  revalidatePath(back)
  redirect(back + '?success=recurso')
}

export async function deleteRecursoVinculo(proyectoId: string, recursoId: string) {
  const supabase = await createClient()
  await supabase.from('proyecto_proveedor_recursos').delete().eq('id', recursoId)
  revalidatePath(`/admin/proyectos/${proyectoId}`)
}
