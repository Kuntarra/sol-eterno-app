'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'

export function LoginForm({ error }: { error?: string }) {
  const [showPwd, setShowPwd] = useState(false)

  return (
    <form action={login} className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[var(--navy)] mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input
            id="email" name="email" type="email"
            autoComplete="email" required
            placeholder="usuario@soleterno.com"
            className="input-premium"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-[var(--navy)]">
            Contraseña
          </label>
          <Link href="/forgot-password"
            className="text-xs text-[var(--amber-dark)] font-medium hover:text-[var(--amber)] transition-colors py-2 -my-2 inline-block">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            id="password" name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password" required
            placeholder="••••••••"
            className="input-premium"
            style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-[var(--navy)] transition-colors">
            {showPwd ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Recordar sesión */}
      <label className="flex items-center gap-2.5 cursor-pointer w-fit py-1">
        <input
          type="checkbox"
          name="remember"
          className="w-[18px] h-[18px] rounded border-[var(--gray-300)] accent-[var(--navy)] cursor-pointer"
        />
        <span className="text-sm text-[var(--gray-600)]">Recordar sesión</span>
      </label>

      {/* Submit */}
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 px-6
                   bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white
                   text-sm font-semibold rounded-xl transition-all duration-150
                   shadow-[var(--shadow-navy)] hover:shadow-[0_6px_20px_rgb(10_44_74/0.35)]
                   hover:-translate-y-px active:translate-y-0">
        Ingresar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      {/* No tengo cuenta */}
      <p className="text-center text-xs text-[var(--gray-500)] border-t border-[var(--gray-200)] pt-5">
        ¿No tienes una cuenta corporativa?{' '}
        <Link href="mailto:contacto@soleterno.cl"
          className="text-[var(--amber-dark)] font-semibold hover:text-[var(--amber)] transition-colors">
          Contacta con soporte técnico
        </Link>
      </p>
    </form>
  )
}
