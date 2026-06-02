import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  receptionist: '/recepcion',
  client: '/alojamiento',
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'client'
  redirect(ROLE_HOME[role] ?? '/alojamiento')
}
