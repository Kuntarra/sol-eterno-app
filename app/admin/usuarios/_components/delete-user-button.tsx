'use client'

import { deleteUser } from '@/app/actions/users'

export function DeleteUserButton({ id }: { id: string }) {
  const action = deleteUser.bind(null, id)

  return (
    <form action={action} onSubmit={(e) => {
      if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) {
        e.preventDefault()
      }
    }}>
      <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
        Eliminar usuario
      </button>
    </form>
  )
}
