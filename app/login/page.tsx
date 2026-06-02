import { login } from '@/app/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-100)] px-4">
      <div className="w-full max-w-sm">

        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--navy)] mb-4 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="11" r="6" fill="var(--amber)" />
              <path
                d="M16 17c-6.627 0-12 2.686-12 6v1a1 1 0 001 1h22a1 1 0 001-1v-1c0-3.314-5.373-6-12-6z"
                fill="#ffffff"
                fillOpacity="0.15"
              />
              <path d="M10 28l6-4 6 4" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--navy)] tracking-tight">Sol Eterno</h1>
          <p className="text-sm text-[var(--gray-600)] mt-1">Gestión Integral de Alojamientos</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-8">
          <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--gray-900)] mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="usuario@empresa.cl"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)]
                           text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-600)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent
                           transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--gray-900)] mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)]
                           text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-600)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--navy)] focus:border-transparent
                           transition-shadow"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--navy)] hover:bg-[var(--navy-dark)]
                         text-white text-sm font-semibold tracking-wide
                         transition-colors duration-150 mt-2"
            >
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--gray-600)] mt-6">
          © {new Date().getFullYear()} Sol Eterno — Norte de Chile
        </p>
      </div>
    </div>
  )
}
