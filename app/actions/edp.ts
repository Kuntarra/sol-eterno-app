'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/super'

function periodoActual() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

// Emite el EDP del período para un operador (con desfase de factura a +30 días).
export async function emitirEDP(formData: FormData) {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const tenantId = formData.get('tenant_id') as string
  if (!tenantId) redirect('/super/edp?error=' + encodeURIComponent('Selecciona un operador.'))

  const periodo = (formData.get('periodo') as string) || periodoActual()

  // Monto: el del formulario o el mensual del operador
  let monto = formData.get('monto') ? Number(formData.get('monto')) : null
  if (monto == null) {
    const { data: t } = await admin.from('tenants').select('monthly_amount').eq('id', tenantId).maybeSingle()
    monto = t?.monthly_amount ?? null
  }

  // Factura estimada ~ +30 días del envío del EDP
  const fact = new Date()
  fact.setDate(fact.getDate() + 30)

  const { error } = await admin.from('edp').insert({
    tenant_id: tenantId,
    periodo,
    monto,
    factura_fecha: fact.toISOString().slice(0, 10),
    notas: (formData.get('notas') as string) || null,
  })
  if (error) redirect('/super/edp?error=' + encodeURIComponent(error.message))

  revalidatePath('/super/edp')
  redirect('/super/edp?success=emitido')
}

export async function setEdpEstado(id: string, estado: 'emitido' | 'facturado' | 'pagado') {
  await requireSuperAdmin()
  const admin = createAdminClient()
  await admin.from('edp').update({ estado }).eq('id', id)

  // Si se paga, deja al operador al día hasta fin de mes
  if (estado === 'pagado') {
    const { data: e } = await admin.from('edp').select('tenant_id').eq('id', id).maybeSingle()
    if (e?.tenant_id) {
      const now = new Date()
      const finDeMes = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      await admin.from('tenants').update({
        payment_status: 'al_dia',
        paid_until: finDeMes.toISOString().slice(0, 10),
      }).eq('id', e.tenant_id)
    }
  }
  revalidatePath('/super/edp')
}
