import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const sessionOnly = cookieStore.get('se_remember')?.value === '0'
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts =
                sessionOnly && name.startsWith('sb-')
                  ? { ...options, maxAge: undefined, expires: undefined }
                  : options
              cookieStore.set(name, value, opts)
            })
          } catch {
            // En Server Components las cookies son de solo lectura; el middleware las actualiza
          }
        },
      },
    }
  )
}
