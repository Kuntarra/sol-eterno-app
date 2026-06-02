import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  receptionist: 'Recepcionista',
  client:       'Cliente',
}

const ROLE_COLORS: Record<string, string> = {
  admin:        'bg-[var(--navy)] text-white',
  receptionist: 'bg-emerald-100 text-emerald-700',
  client:       'bg-[var(--amber)]/20 text-[var(--navy)]',
}

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*, companies(name), receptionist_properties(property_id, properties(name))')
    .order('role')
    .order('full_name')

  const searchParams_success = undefined // handled via URL in real use

  const grouped = (profiles ?? []).reduce<Record<string, typeof profiles>>((acc, p) => {
    const role = p.role ?? 'client'
    if (!acc[role]) acc[role] = []
    acc[role]!.push(p)
    return acc
  }, {})

  const roleOrder = ['admin', 'receptionist', 'client']

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Usuarios</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">{profiles?.length ?? 0} usuarios registrados</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/usuarios/nuevo-recepcionista" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
            + Recepcionista
          </Link>
          <Link href="/admin/usuarios/nuevo-cliente" className="px-4 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            + Cliente
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {roleOrder.map(role => {
          const users = grouped[role]
          if (!users?.length) return null

          return (
            <div key={role}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold text-[var(--gray-600)] uppercase tracking-widest">{ROLE_LABELS[role]}s</h2>
                <div className="flex-1 h-px bg-[var(--gray-200)]" />
                <span className="text-xs text-[var(--gray-600)]">{users.length}</span>
              </div>

              <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                {users.map((user, i) => {
                  const props = (user.receptionist_properties as { properties: { name: string } | null }[] | null) ?? []
                  const company = user.companies as { name: string } | null

                  return (
                    <Link
                      key={user.id}
                      href={role !== 'admin' ? `/admin/usuarios/${user.id}` : '#'}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-[var(--gray-50)] transition-colors ${i > 0 ? 'border-t border-[var(--gray-100)]' : ''} ${role === 'admin' ? 'cursor-default' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--gray-100)] flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[var(--navy)]">
                          {(user.full_name ?? user.email ?? '?').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--navy)] truncate">{user.full_name ?? '—'}</p>
                        <p className="text-xs text-[var(--gray-600)] truncate">{user.email ?? '—'}</p>
                        {props.length > 0 && (
                          <p className="text-xs text-[var(--gray-600)] mt-0.5 truncate">
                            {props.map(p => p.properties?.name).filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {company && (
                          <p className="text-xs text-[var(--gray-600)] mt-0.5">{company.name}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
