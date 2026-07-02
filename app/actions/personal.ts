'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cleanRut, isValidRut } from '@/lib/rut'
import { getCupoPersonas, getMyTenantId } from '@/lib/tenant'
import { registrarActividad } from './_log'

const NUEVO = '/admin/personal/nuevo'

// Solo la ADMINISTRACIÓN (admin de la empresa o super admin) gestiona el
// directorio de personas. La UI ya lo oculta a los demás, pero las acciones de
// servidor son invocables directamente: este guard lo impide en el servidor.
async function requireAdministracion(supabase: Awaited<ReturnType<typeof createClient>>, back: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('user_profiles').select('role, is_super_admin').eq('id', user.id).single()
  if (prof?.role !== 'admin' && !prof?.is_super_admin) {
    redirect(back + '?error=' + encodeURIComponent('Solo la administración puede gestionar el personal.'))
  }
}

// Activa/desactiva una persona en el directorio. Solo la ADMINISTRACIÓN
// (admin de la empresa o super admin) puede cambiarlo. Inactivo = sigue en la
// base pero ya no continúa la rotación de turnos.
export async function setPersonaActiva(personaId: string, activa: boolean) {
  const supabase = await createClient()
  const back = `/admin/personal/${personaId}`
  await requireAdministracion(supabase, back)
  await supabase
    .from('persona_directorio')
    .update({ activa })
    .eq('persona_id', personaId)
    .eq('tenant_id', await getMyTenantId())
  await registrarActividad('persona', personaId, activa ? 'activar' : 'desactivar')
  revalidatePath(back)
  redirect(back + '?success=estado')
}

// Edita los datos descriptivos de una persona (no el documento). Pasa por una
// función SECURITY DEFINER que verifica que la persona esté en el directorio de
// mi empresa (personas es global y solo tiene policies de lectura).
export async function editarPersona(personaId: string, formData: FormData) {
  const supabase = await createClient()
  const back = `/admin/personal/${personaId}`
  const backEdit = `${back}/editar`
  await requireAdministracion(supabase, back)

  const nombres = ((formData.get('nombres') as string) || '').trim()
  const apPat = ((formData.get('apellido_paterno') as string) || '').trim()
  if (!nombres || !apPat) redirect(backEdit + '?error=' + encodeURIComponent('Nombres y apellido paterno son obligatorios.'))

  const { error } = await supabase.rpc('actualizar_persona', {
    p_persona_id: personaId,
    p_nombres: nombres,
    p_apellido_paterno: apPat,
    p_apellido_materno: ((formData.get('apellido_materno') as string) || '').trim() || undefined,
    p_telefono: ((formData.get('telefono') as string) || '').trim() || undefined,
    p_nacionalidad: ((formData.get('nacionalidad') as string) || '').trim() || undefined,
    p_fecha_nacimiento: ((formData.get('fecha_nacimiento') as string) || '').trim() || undefined,
    p_contacto_emergencia_nombre: ((formData.get('contacto_emergencia_nombre') as string) || '').trim() || undefined,
    p_contacto_emergencia_telefono: ((formData.get('contacto_emergencia_telefono') as string) || '').trim() || undefined,
  })
  if (error) redirect(backEdit + '?error=' + encodeURIComponent(error.message))

  await registrarActividad('persona', personaId, 'editar', { nombres, apellido_paterno: apPat })
  revalidatePath(back)
  redirect(back + '?success=editado')
}

// Crea (o reutiliza) una persona global por documento y la agrega
// al directorio de mi empresa, con su oficio.
export async function createPersona(formData: FormData) {
  const supabase = await createClient()
  await requireAdministracion(supabase, NUEVO)

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

  // Cupo: si la persona es NUEVA en mi directorio y no queda cupo, se bloquea.
  // (Reutilizar una persona ya existente no consume cupo nuevo.)
  const { disponibles, limite } = await getCupoPersonas()
  if (disponibles <= 0) {
    redirect(NUEVO + '?error=' + encodeURIComponent(`Alcanzaste el cupo contratado (${limite} personas). Pídele al administrador del sistema ampliarlo.`))
  }

  // 1) Persona global (deduplica por documento)
  const { data: personaId, error: pErr } = await supabase.rpc('find_or_create_persona', {
    p_tipo_documento: tipo,
    p_numero_documento: numero,
    p_nombres: nombres,
    p_apellido_paterno: apPat,
    p_apellido_materno: apMat ?? undefined,
    p_telefono: telefono ?? undefined,
    p_pais_documento: tipo === 'rut' ? 'CL' : ((formData.get('pais_documento') as string) || 'CL'),
    p_fecha_nacimiento: fechaNacimiento ?? undefined,
    p_nacionalidad: nacionalidad ?? undefined,
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

  await registrarActividad('persona', personaId as string, 'crear', { nombres, apellido_paterno: apPat, documento: numero })

  revalidatePath('/admin/personal')
  redirect('/admin/personal?success=creado')
}

// Carga masiva desde Excel. Lee la primera hoja, mapea columnas por
// nombre de encabezado, valida RUT, deduplica y agrega al directorio.
export async function importPersonas(formData: FormData) {
  const supabase = await createClient()
  await requireAdministracion(supabase, '/admin/personal/importar')
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    redirect('/admin/personal/importar?error=' + encodeURIComponent('Selecciona un archivo Excel (.xlsx).'))
  }

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load((await file.arrayBuffer()) as any)
  const ws = wb.worksheets[0]
  if (!ws) redirect('/admin/personal/importar?error=' + encodeURIComponent('El archivo no tiene hojas.'))

  const norm = (s: unknown) =>
    (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const col: Record<string, number> = {}
  ws.getRow(1).eachCell((cell, c) => { col[norm(cell.text)] = c })

  const cellOf = (row: import('exceljs').Row, names: string[]) => {
    for (const n of names) {
      if (col[n]) {
        const v = row.getCell(col[n]).text
        if (v != null && v.toString().trim() !== '') return v.toString().trim()
      }
    }
    return ''
  }

  // Se valida y normaliza cada fila en memoria (rápido, sin tocar la base) y
  // se envía TODO en una sola llamada: la función SQL importar_personas hace el
  // dedup, los oficios, el cupo y el directorio en un único viaje. Antes era un
  // bucle con ~4 consultas por fila (≈16.000 viajes para 4.000 personas).
  let errores = 0
  const filas: Record<string, string>[] = []

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i)
    const rut = cellOf(row, ['rut', 'documento', 'numero documento', 'n documento'])
    const nombres = cellOf(row, ['nombres', 'nombre'])
    const apPat = cellOf(row, ['apellido paterno', 'apellidopaterno', 'paterno', 'apellido'])
    if (!rut && !nombres && !apPat) continue // fila vacía

    if (!isValidRut(rut) || !nombres || !apPat) { errores++; continue }

    const c = cleanRut(rut)
    filas.push({
      numero: c.slice(0, -1) + '-' + c.slice(-1),
      nombres,
      apellido_paterno: apPat,
      apellido_materno: cellOf(row, ['apellido materno', 'apellidomaterno', 'materno']),
      telefono: cellOf(row, ['telefono', 'fono', 'celular']),
      nacionalidad: cellOf(row, ['nacionalidad', 'pais']),
      oficio: cellOf(row, ['oficio', 'rol', 'cargo']),
    })
  }

  let creadas = 0, reusadas = 0, omitidas = 0
  if (filas.length) {
    const { data, error } = await supabase.rpc('importar_personas', { p_rows: filas })
    if (error) {
      redirect('/admin/personal/importar?error=' + encodeURIComponent(error.message))
    }
    const res = (data ?? {}) as { creadas?: number; reusadas?: number; omitidas?: number }
    creadas = res.creadas ?? 0
    reusadas = res.reusadas ?? 0
    omitidas = res.omitidas ?? 0
  }

  revalidatePath('/admin/personal')
  redirect(`/admin/personal?creadas=${creadas}&reusadas=${reusadas}&errores=${errores}&omitidas=${omitidas}`)
}
