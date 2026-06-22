import type { Metadata, Viewport } from 'next'
import { Inter, Spectral } from 'next/font/google'
import './globals.css'
import { AdminOverlay } from './_components/admin-overlay'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sol Eterno — Gestión de Alojamientos',
  description: 'Plataforma de gestión de alojamientos para empresas mineras del norte de Chile.',
  appleWebApp: { capable: true, title: 'Sol Eterno', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#0A2C4A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${spectral.variable}`}>
      <body className="min-h-screen bg-[var(--gray-50)]">
        {children}
        <AdminOverlay />
      </body>
    </html>
  )
}
