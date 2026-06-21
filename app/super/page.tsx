import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/super'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plus, Building2, Users, BedDouble, CheckCircle2 } from 'lucide-react'

type TenantRow = {
  id: string; name: string; slug: string; active: boolean
  rut: string | null; contact_name: string | null
  billing_day: number | null; monthly_amount: number | null
  payment_status: 'al_dia' | 'pendiente' | 'moroso'; paid_until: string | null
  companies: number; properties: number; users: number; active_stays: number; total_stays: number
}

const CLP = (n: number | null) =>
  n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CL')

const PAY_BADGE: Record<string, string> = {
  al_dia:    'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  moroso:    'bg-red-100 text-red-700',
}
const PAY_LABEL: Record<string, string> = {
  al_dia: 'Al día', pendiente: 'Pendiente', moroso: 'Moroso',
}

export default async function SuperPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  await requireSuperAdmin()
  const params = await searchParams

  const admin = createAdminClient()
  const { data } = await admin.rpc('tenants_overview')
  const tenants = (data ?? []) as TenantRow[]

  const activos = tenants.filter(t => t.active).length
  const ingresoMensual = tenants
    .filter(t => t.active && t.payment_status !== 'moroso')
    .reduce((acc, t) => acc + (t.monthly_amount ?? 0), 0)

  return (
    <div>
      {params.success && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={2.25} className="shrink-0" />
          {params.success === 'creado' ? 'Operador creado correctamente.' : 'Cambios guardados.'}
        </div>
      )}

      {/* Encabezado + KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-[1.9rem] font-semibold text-[var(--navy)] tracking-tight leading-tight">Operadores</h2>
          <p className="text-sm text-[var(--gray-600)] mt-1">{tenants.length} operador{tenants.length !== 1 ? 'es' : ''} · {activos} activo{activos !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl border border-[var(--gray-200)] px-5 py-3 shadow-[var(--shadow-xs)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gray-500)]">Ingreso mensual estimado</p>
            <p className="font-display text-[1.6rem] font-semibold text-[var(--navy)] leading-none mt-1">{CLP(ingresoMensual)}</p>
          </div>
          <Link href="/super/nuevo" className="btn-primary shrink-0">
            <Plus size={16} strokeWidth={2.25} />
            Nuevo operador
          </Link>
        </div>
      </div>

      {/* Tabla de operadores */}
      {!tenants.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-16 text-center">
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">Aún no hay operadores</p>
          <p className="text-xs text-[var(--gray-600)] mb-4">Crea el primero para empezar a gestionar.</p>
          <Link href="/super/nuevo" className="text-sm text-[var(--navy)] font-semibold hover:underline">Crear operador →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-xs)]">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Uso (empresas · props · usuarios · activos)</th>
                  <th>Cobro mensual</th>
                  <th>Día</th>
                  <th>Estado pago</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className={!t.active ? 'opacity-50' : ''}>
                    <td>
                      <Link href={`/super/${t.id}`} className="font-semibold text-[var(--navy)] hover:text-[var(--amber-dark)] hover:underline">
                        {t.name}
                      </Link>
                      <div className="text-[11px] text-[var(--gray-500)]">{t.rut ?? 'sin RUT'} {!t.active && '· suspendido'}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 text-xs text-[var(--gray-600)]">
                        <span className="inline-flex items-center gap-1"><Building2 size={13} strokeWidth={1.75} />{t.companies}</span>
                        <span className="inline-flex items-center gap-1"><BedDouble size={13} strokeWidth={1.75} />{t.properties}</span>
                        <span className="inline-flex items-center gap-1"><Users size={13} strokeWidth={1.75} />{t.users}</span>
                        <span className="text-emerald-600 font-medium">{t.active_stays} activos</span>
                      </div>
                    </td>
                    <td className="font-semibold text-[var(--navy)]">{CLP(t.monthly_amount)}</td>
                    <td className="text-[var(--gray-600)]">{t.billing_day ? `día ${t.billing_day}` : '—'}</td>
                    <td>
                      <span className={`badge ${PAY_BADGE[t.payment_status]}`}>{PAY_LABEL[t.payment_status]}</span>
                    </td>
                    <td className="text-right">
                      <Link href={`/super/${t.id}`} className="text-[var(--navy)] text-xs font-semibold hover:underline">Gestionar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
