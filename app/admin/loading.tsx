// Esqueleto de carga: se muestra al instante al cambiar de pantalla,
// mientras el servidor prepara el contenido. Mejora la sensación de rapidez.
export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Encabezado */}
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <div className="h-3 w-24 bg-[var(--gray-200)] rounded mb-3" />
        <div className="h-8 w-56 bg-[var(--gray-200)] rounded mb-2" />
        <div className="h-3 w-40 bg-[var(--gray-100)] rounded" />
      </div>

      {/* Contenido */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--gray-200)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-[var(--gray-200)] rounded" />
                <div className="h-5 w-14 bg-[var(--gray-100)] rounded-full" />
              </div>
              <div className="h-3 w-40 bg-[var(--gray-100)] rounded mb-4" />
              <div className="h-3 w-24 bg-[var(--gray-100)] rounded border-t border-[var(--gray-100)] pt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
