import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecepcionSidebar } from './_components/recepcion-sidebar'

export default async function RecepcionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'receptionist' && profile?.role !== 'admin') redirect('/login')

  // Propiedades asignadas (para mostrar en sidebar)
  const { data: rpRows } = await supabase
    .from('receptionist_properties')
    .select('properties(name, cities(name))')
    .eq('user_id', user.id)

  const properties = (rpRows ?? []).map(row => {
    const p = row.properties as unknown as { name: string; cities: { name: string } | null } | null
    return { name: p?.name ?? '', city: p?.cities?.name ?? '' }
  }).filter(p => p.name)

  return (
    <div className="flex min-h-screen">
      <RecepcionSidebar
        fullName={profile?.full_name ?? user.email ?? 'Recepcionista'}
        properties={properties}
      />
      <main className="flex-1 overflow-auto bg-[var(--gray-100)] min-w-0 p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
