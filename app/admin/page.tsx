import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">
      <header className="bg-[var(--navy)] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Sol Eterno</h1>
          <p className="text-xs text-white/60">Panel de Administración</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80">{profile?.full_name ?? user.email}</span>
          <form action={logout}>
            <button type="submit" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="p-8">
        <p className="text-[var(--gray-600)] text-sm">Dashboard admin — en construcción.</p>
      </main>
    </div>
  )
}
