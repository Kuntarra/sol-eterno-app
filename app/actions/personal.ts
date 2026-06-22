'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cleanRut, isValidRut } from '@/lib/rut'

const NUEVO = '/admin/personal/nuevo'

// Crea (o reutiliza) una persona global por documento y la agrega
// al directorio de mi empresa, con su oficio.
export async function createPersona(formData: FormData) {
  const supabase = await createClient()

  const tipo = ((formData.get('tipo_documento') as string) || 'rut').trim()
  const rawDoc = ((formData.get('numero_documento') as string) || '').trim()

  // Normalización + validación del documento
  let numero = rawDoc
  if (tipo === 'rut') {
    if (!isValidRut(rawDoc)) {
      redirect(NUEVO + '?error=' + encodeURIComponent('El RUT no es válido. Revisa el número y el dígito verificador.'))
    }
    const c = cleanRut(rawDoc)
    numero = c.slice(0, -1) + '-' + c.slice(-1) // canónico: 12345678-9
  }
  if (!numero) {
    redirect(NUEVO + '?error=' + encodeURIComponent('Falta el número de documento.'))
  }

  const nombres = (formData.get('nombres') as string)?.trim()
  const apPat = (formData.get('apellido_paterno') as string)?.trim()
  const apMat = ((formData.get('apellido_materno') as string) || '').trim() || null
  const telefono = ((formData.get('telefono') as string) || '').trim() || null
  const nacionalidad = ((formData.get('nacionalidad') as string) || '').trim() || null
  const fechaNacimiento = ((formData.get('fecha_nacimiento') as string) || '').trim() || null

  if (!nombres || !apPat) {
    redirect(NUEVO + '?error=' + encodeURIComponent('Nombres y apellido paterno son obligatorios.'))
  }

  // 1) Persona global (deduplica por documento)
  const { data: personaId, error: pErr } = await supabase.rpc('find_or_create_persona', {
    p_tipo_documento: tipo,
    p_numero_documento: numero,
    p_nombres: nombres,
    p_apellido_paterno: apPat,
    p_apellido_materno: apMat,
    p_telefono: telefono,
    p_pais_documento: tipo === 'rut' ? 'CL' : ((formData.get('pais_documento') as string) || 'CL'),
    p_fecha_nacimiento: fechaNacimiento,
    p_nacionalidad: nacionalidad,
  })
  if (pErr) redirect(NUEVO + '?error=' + encodeURIComponent(pErr.message))

  // 2) Oficio: reutiliza el del catálogo o lo crea (find-or-create por nombre)
  let oficioId: string | null = null
  const oficioNombre = ((formData.get('oficio') as string) || '').trim()
  if (oficioNombre) {
    const { data: existing } = await supabase
      .from('oficios').select('id').ilike('nombre', oficioNombre).limit(1).maybeSingle()
    if (existing) {
      oficioId = existing.id
    } else {
      const { data: nuevo, error: oErr } = await supabase
        .from('oficios').insert({ nombre: oficioNombre }).select('id').single()
      if (oErr) redirect(NUEVO + '?error=' + encodeURIComponent(oErr.message))
      oficioId = nuevo.id
    }
  }

  // 3) Directorio: la persona entra a mi empresa (tenant lo asigna el trigger)
  const { error: dErr } = await supabase
    .from('persona_directorio')
    .upsert({ persona_id: personaId, oficio_id: oficioId }, { onConflict: 'tenant_id,persona_id' })
  if (dErr) redirect(NUEVO + '?error=' + encodeURIComponent(dErr.message))

  revalidatePath('/admin/personal')
  redirect('/admin/personal?success=creado')
}
