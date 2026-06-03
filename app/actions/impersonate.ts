'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function impersonate(userId: string, href: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Solo admins pueden impersonar
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') return

  const cookieStore = await cookies()
  cookieStore.set('sol_impersonate', userId, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  })

  redirect(href)
}

export async function stopImpersonate() {
  const cookieStore = await cookies()
  cookieStore.delete('sol_impersonate')
  redirect('/admin')
}
