'use client'

import { useTransition } from 'react'
import { checkOut } from '@/app/actions/stays'

export function CheckoutButton({ stayId }: { stayId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => checkOut(stayId))}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--amber)] hover:bg-amber-500 text-[var(--navy)] transition-colors disabled:opacity-50"
    >
      {pending ? 'Procesando…' : 'Check-out'}
    </button>
  )
}
