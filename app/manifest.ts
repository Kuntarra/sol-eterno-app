import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sol Eterno · Gestión',
    short_name: 'Sol Eterno',
    description: 'Trazabilidad de personal y gestión de alojamientos en faena.',
    start_url: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A2C4A',
    theme_color: '#0A2C4A',
    icons: [
      { src: '/logo-simbolo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo-simbolo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo-simbolo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
