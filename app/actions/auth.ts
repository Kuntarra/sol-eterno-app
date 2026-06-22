'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  modulo: '/admin',
  receptionist: '/recepcion',
  client: '/alojamiento',
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const remember = formData.get('remember') === 'on'

  // Guardar la preferencia ANTES de autenticar: cuando es "no recordar",
  // server.ts y el middleware convierten las cookies sb-* en cookies de sesión.
  const cookieStore = await cookies()
  cookieStore.set('se_remember', remember ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    ...(remember ? { maxAge: 60 * 60 * 24 * 60 } : {}),
  })

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return redirect('/login?error=Credenciales%20incorrectas')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login?error=Error%20de%20autenticaci%C3%B3n')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'client'
  const home = ROLE_HOME[role] ?? '/alojamiento'

  revalidatePath('/', 'layout')
  redirect(home)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
