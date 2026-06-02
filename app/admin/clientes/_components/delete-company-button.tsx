'use client'

import { deleteCompany } from '@/app/actions/companies'

export function DeleteCompanyButton({ id }: { id: string }) {
  const action = deleteCompany.bind(null, id)

  return (
    <form action={action} onSubmit={(e) => {
      if (!confirm('¿Eliminar esta empresa? Esta acción no se puede deshacer.')) {
        e.preventDefault()
      }
    }}>
      <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
        Eliminar
      </button>
    </form>
  )
}
