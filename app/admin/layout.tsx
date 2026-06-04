import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from './_components/admin-sidebar'
import { AdminTopBar } from './_components/admin-topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const fullName = profile?.full_name ?? user.email ?? 'Admin'

  return (
    <div className="flex min-h-screen">
      <AdminSidebar fullName={fullName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopBar fullName={fullName} />
        <main className="flex-1 overflow-auto bg-[var(--gray-100)] pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
