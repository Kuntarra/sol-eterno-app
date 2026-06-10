// Logo Sol Eterno — símbolo dorado calado (sol), fondo transparente.

interface LogoProps {
  size?: number
  variant?: 'full' | 'mark'  // mantenido por compatibilidad; ambos rinden el símbolo cuadrado
  theme?: 'dark' | 'light'   // mantenido por compatibilidad
}

export function SolEternoLogo({ size = 40, variant = 'mark' }: LogoProps) {
  const side = variant === 'full' ? Math.round(size * 1.4) : size
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-simbolo.png"
      alt="Sol Eterno"
      width={side}
      height={side}
      style={{ width: side, height: side }}
      className="object-contain select-none"
      draggable={false}
    />
  )
}
