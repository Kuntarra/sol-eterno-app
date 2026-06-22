'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  className,
  pendingText = 'Guardando…',
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={`${className ?? ''} disabled:opacity-60 disabled:cursor-wait`}>
      {pending ? pendingText : children}
    </button>
  )
}
