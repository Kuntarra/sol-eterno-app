// Componente de logo Sol Eterno usando el SVG oficial de la marca.
// viewBox="330 420 850 740" → contenido recortado sin espacios blancos.
// Ratio: 850:740 ≈ 1.149:1

interface LogoProps {
  size?: number
  variant?: 'full' | 'mark'  // full = logo completo, mark = solo el símbolo visual
  theme?: 'dark' | 'light'   // mantenido por compatibilidad
}

export function SolEternoLogo({ size = 40, variant = 'mark' }: LogoProps) {
  if (variant === 'mark') {
    // Muestra el logo completo escalado; el símbolo circular domina visualmente.
    const height = size
    const width  = Math.round(height * (850 / 740))
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-sol-eterno.svg"
        alt="Sol Eterno"
        width={width}
        height={height}
        className="object-contain select-none"
        draggable={false}
      />
    )
  }

  // full: logo con proporciones mayores para contextos con más espacio
  const height = Math.round(size * 1.8)
  const width  = Math.round(height * (850 / 740))
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-sol-eterno.svg"
      alt="Sol Eterno – Gestión Integral de Alojamientos"
      width={width}
      height={height}
      className="object-contain select-none"
      draggable={false}
    />
  )
}
