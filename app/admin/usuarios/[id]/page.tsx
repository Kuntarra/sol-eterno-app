import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateReceptionistProperties, deleteUser } from '@/app/actions/users'
import { DeleteUserButton } from '../_components/delete-user-button'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent transition-shadow'

export default async function UsuarioDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const adminClient = createAdminClient()

  const [{ data: profile }, { data: properties }, { data: companies }, { data: rp }] = await Promise.all([
    adminClient.from('user_profiles').select('*, companies(name)').eq('id', id).single(),
    adminClient.from('properties').select('id, name, type, cities(name)').eq('active', true).order('name'),
    adminClient.from('companies').select('id, name').eq('active', true).order('name'),
    adminClient.from('receptionist_properties').select('property_id').eq('user_id', id),
  ])

  if (!profile) notFound()

  const assignedPropertyIds = new Set((rp ?? []).map(r => r.property_id))

  const updatePropsWithId = updateReceptionistProperties.bind(null, id)
  const company = profile.companies as { name: string } | null

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/usuarios" className="text-[var(--gray-600)] hover:text-[var(--navy)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--navy)]">{profile.full_name ?? '—'}</h1>
            <p className="text-sm text-[var(--gray-600)]">{profile.email}</p>
          </div>
        </div>
        <DeleteUserButton id={id} />
      </div>

      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Usuario actualizado correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Recepcionista: gestión de propiedades */}
      {profile.role === 'receptionist' && (
        <form action={updatePropsWithId} className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-1">Propiedades asignadas</h2>
          <p className="text-xs text-[var(--gray-600)] mb-5">El recepcionista solo verá estas propiedades</p>

          <div className="space-y-2 mb-5">
            {(properties ?? []).map((p) => (
              <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--gray-50)] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name="property_ids"
                  value={p.id}
                  defaultChecked={assignedPropertyIds.has(p.id)}
                  className="w-4 h-4 rounded border-[var(--gray-200)] accent-[var(--navy)] cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--navy)]">{p.name}</p>
                  <p className="text-xs text-[var(--gray-600)]">{(p.cities as unknown as { name: string } | null)?.name}</p>
                </div>
              </label>
            ))}
          </div>

          <button type="submit" className="px-6 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Guardar propiedades
          </button>
        </form>
      )}

      {/* Cliente: empresa asociada */}
      {profile.role === 'client' && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6">
          <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Empresa asociada</h2>
          <p className="text-sm text-[var(--gray-900)] font-medium">{company?.name ?? 'Sin empresa'}</p>
          <p className="text-xs text-[var(--gray-600)] mt-1">Para cambiar la empresa, elimina este usuario y créalo de nuevo.</p>
        </div>
      )}
    </div>
  )
}
