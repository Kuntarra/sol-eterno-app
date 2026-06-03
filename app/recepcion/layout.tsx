import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecepcionNav } from './_components/recepcion-nav'
import { logout } from '@/app/actions/auth'

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

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">
      <header className="bg-[var(--navy)] text-white px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-bold leading-tight">Sol Eterno</p>
              <p className="text-xs text-white/50">Recepción</p>
            </div>
            <RecepcionNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 hidden sm:block">{profile?.full_name}</span>
            <form action={logout}>
              <button type="submit" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
