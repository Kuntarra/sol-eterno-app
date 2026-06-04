// El SVG del logo real tiene viewBox="330 420 850 740" (contenido recortado).
// La imagen incluye: símbolo circular + wordmark "Sol Eterno" + tagline.
// La altura del símbolo ocupa ~77% del alto total (577/740 ≈ 0.78).

interface BrandLogoProps {
  symbolSize?: number      // Controla el alto del símbolo → escala el logo completo
  className?: string
  // Props legados — mantenidos para compatibilidad pero ignorados (texto está en el SVG)
  textSize?: string
  subtitleSize?: string
  gap?: string
  showSubtitle?: boolean
}

export function BrandLogo({
  symbolSize = 56,
  className = '',
  textSize: _t,
  subtitleSize: _s,
  gap: _g,
  showSubtitle: _sh,
}: BrandLogoProps) {
  // El SVG tiene ratio 850:740 ≈ 1.149:1
  // Si el símbolo debe medir symbolSize px de alto, el logo completo mide symbolSize/0.78 px
  const height = Math.round(symbolSize / 0.78)
  const width  = Math.round(height * (850 / 740))

  return (
    <img
      src="/logo-sol-eterno.svg"
      alt="Sol Eterno – Gestión Integral de Alojamientos"
      width={width}
      height={height}
      className={`object-contain select-none ${className}`.trim()}
      draggable={false}
    />
  )
}
