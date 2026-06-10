// Símbolo de marca Sol Eterno — sol dorado calado, fondo transparente.
// (Antes era un SVG con wordmark + tagline viejo incrustados; ahora el símbolo limpio.)

interface BrandLogoProps {
  symbolSize?: number      // Lado del símbolo cuadrado en px
  className?: string
  // Props legados — mantenidos por compatibilidad
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-simbolo.png"
      alt="Sol Eterno"
      width={symbolSize}
      height={symbolSize}
      style={{ width: symbolSize, height: symbolSize }}
      className={`object-contain select-none ${className}`.trim()}
      draggable={false}
    />
  )
}
