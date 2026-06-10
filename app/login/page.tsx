import { LoginForm } from './_components/login-form'

interface Props {
  searchParams: Promise<{ error?: string }>
}

function Lockup({ size = 56, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-simbolo.png" alt="Sol Eterno" width={size} height={size}
        className="object-contain select-none" draggable={false} style={{ height: size, width: size }} />
      <div className="text-left leading-none">
        <div className="font-display font-semibold tracking-[-0.01em]"
          style={{ fontSize: size * 0.42, color: dark ? '#fff' : 'var(--navy)' }}>Sol Eterno</div>
        <div className="font-semibold uppercase mt-1.5"
          style={{ fontSize: Math.max(8, size * 0.13), letterSpacing: '0.22em', color: 'var(--amber)' }}>
          Gestión de Alojamientos
        </div>
      </div>
    </div>
  )
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-dvh flex">

      {/* ── Panel izquierdo — identidad de marca ── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: 'radial-gradient(ellipse 190% 120% at 50% -10%, #134d85 0%, transparent 52%), linear-gradient(160deg, #0d1f35 0%, #0A2C4A 52%, #06203A 100%)' }}
      >
        {/* Halos dorados */}
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(224 163 58 / 0.08), transparent 65%)' }} />
        <div className="absolute -bottom-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgb(224 163 58 / 0.06), transparent 65%)' }} />

        {/* Patrón de puntos */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="login-dots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dots)" />
        </svg>

        {/* Marca arriba */}
        <div className="relative px-14 pt-12">
          <Lockup size={52} dark />
        </div>

        {/* Contenido — centrado */}
        <div className="relative flex flex-col justify-center flex-1 px-14 pb-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 mb-7 self-start">
            <span className="w-6 h-px bg-[var(--amber)]" />
            <span className="text-[var(--amber-light)] text-[11px] font-semibold tracking-[0.24em] uppercase">
              Sistema de gestión corporativo
            </span>
          </div>

          {/* Headline editorial */}
          <h1 className="font-display text-white font-medium leading-[1.08] tracking-[-0.015em] mb-6"
            style={{ fontSize: 'clamp(2.4rem, 4vw, 3.3rem)', maxWidth: '15ch' }}>
            La estadía de su equipo,{' '}
            <span style={{ color: 'var(--amber-light)', fontStyle: 'italic' }}>en tiempo real.</span>
          </h1>

          <p className="text-white/55 text-[15px] font-light leading-relaxed" style={{ maxWidth: '42ch' }}>
            Sepa quién está alojado, dónde y desde cuándo. La plataforma propia de Sol Eterno para
            gestionar su dotación con una sola contraparte.
          </p>

          {/* Ciudades */}
          <div className="flex items-center gap-6 mt-12 pt-7 border-t border-white/12">
            {['Iquique', 'Antofagasta', 'Calama'].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="text-[var(--amber)] opacity-75">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-white/55 text-xs font-medium tracking-wide">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative px-14 pb-9 text-white/20 text-[10px] font-semibold tracking-[0.24em] uppercase">
          Sol Eterno · Gestión de Alojamientos
        </p>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[392px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-10">
            <Lockup size={48} />
          </div>

          {/* Encabezado */}
          <div className="mb-8">
            <h2 className="font-display text-[var(--navy)] font-semibold tracking-[-0.015em] leading-tight"
              style={{ fontSize: '2.1rem' }}>
              Bienvenido de nuevo
            </h2>
            <p className="text-[15px] text-[var(--gray-600)] mt-2.5 leading-relaxed font-light">
              Ingrese sus credenciales para acceder al panel de gestión.
            </p>
          </div>

          {/* Formulario */}
          <LoginForm error={error} />

          {/* Footer */}
          <div className="flex items-center justify-center gap-6 mt-9">
            {['Términos', 'Privacidad', 'Seguridad'].map(t => (
              <span key={t}
                className="text-xs text-[var(--gray-500)] hover:text-[var(--navy)] cursor-pointer transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
