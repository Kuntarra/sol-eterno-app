import { LoginForm } from './_components/login-form'
import { BrandLogo } from '@/app/_components/brand-logo'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — identidad de marca ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(160deg, #0d1f35 0%, #1B3A5C 50%, #142d47 100%)' }}
      >
        {/* Fondos decorativos */}
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(245 181 32 / 0.07), transparent 65%)' }} />
        <div className="absolute -bottom-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(245 181 32 / 0.09), transparent 65%)' }} />

        {/* Patrón de puntos */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.045] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="login-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dots)"/>
        </svg>

        {/* Contenido — centrado verticalmente */}
        <div className="relative flex flex-col items-center justify-center h-full px-14 py-16 text-center">

          {/* Logo — tarjeta blanca flotante */}
          <div className="bg-white rounded-2xl px-12 py-9 mb-12
                          shadow-[0_12px_48px_rgb(0_0_0/0.35),0_2px_0_rgb(255_255_255/0.15)]">
            <BrandLogo symbolSize={130} />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] shrink-0" />
            <span className="text-white/65 text-xs font-medium">Sistema de Gestión Corporativo</span>
          </div>

          {/* Headline */}
          <h1 className="text-white text-[2.5rem] font-black leading-[1.12] tracking-[-0.02em] mb-5 max-w-[400px]">
            La estadía de tu equipo,{' '}
            <span style={{ color: 'var(--amber)' }}>ordenada</span>{' '}
            y bajo control.
          </h1>

          <p className="text-white/45 text-sm leading-relaxed max-w-[360px]">
            Simplifica la gestión de propiedades y alojamientos corporativos con nuestra plataforma inteligente diseñada para la eficiencia.
          </p>

          {/* Ciudades */}
          <div className="flex items-center justify-center gap-5 mt-10">
            {['Iquique', 'Antofagasta', 'Calama'].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-[var(--amber)] opacity-70">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-white/50 text-xs font-medium">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative px-14 pb-8 text-white/18 text-[10px] font-semibold tracking-[0.2em] uppercase text-center">
          Sol Eterno Management System
        </p>
      </div>

      {/* ── Panel derecho — fondo blanco directo, sin card flotante ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[390px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo symbolSize={52} textSize="text-[15px]" subtitleSize="text-[10px]" />
          </div>

          {/* Encabezado */}
          <div className="mb-8">
            <h2 className="text-[2rem] font-black text-[var(--navy)] tracking-[-0.02em] leading-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-sm text-[var(--gray-600)] mt-2 leading-relaxed">
              Ingresa tus credenciales para acceder al panel de gestión.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm error={error} />

          {/* Footer */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {['Términos', 'Privacidad', 'Seguridad'].map(t => (
              <span key={t}
                className="text-xs text-[var(--gray-400)] hover:text-[var(--navy)] cursor-pointer transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
