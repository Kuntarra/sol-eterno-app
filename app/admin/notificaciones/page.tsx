import { createClient } from '@/lib/supabase/server'
import { addRecipient, toggleRecipient, deleteRecipient, sendTestNow } from '@/app/actions/digest'
import { Mail, Send, Trash2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata = { title: 'Notificaciones · Sol Eterno' }

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { ok, error } = await searchParams
  const supabase = await createClient()
  const { data: recipients, error: dbError } = await supabase
    .from('digest_recipients')
    .select('id, email, name, active, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="px-8 py-8 max-w-3xl">
      <span className="section-label">Configuración</span>
      <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-[-0.01em]">
        Resumen diario por correo
      </h1>
      <p className="text-sm text-[var(--gray-600)] mt-1 flex items-center gap-1.5">
        <Clock size={14} strokeWidth={1.75} />
        Se envía automáticamente cada día a las <strong className="text-[var(--navy)]">8:00 AM</strong> con los check-in y check-out del día anterior.
      </p>

      {ok && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={2.25} className="shrink-0" />{decodeURIComponent(ok)}
        </div>
      )}
      {error && (
        <div className="mt-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={2} className="shrink-0" />{decodeURIComponent(error)}
        </div>
      )}

      {dbError ? (
        <div className="mt-6 bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">Falta crear la tabla de destinatarios</p>
          <p className="text-xs text-[var(--gray-600)]">
            Ejecuta el script <code className="font-mono bg-[var(--gray-100)] px-1.5 py-0.5 rounded">supabase/add-digest-recipients.sql</code> en el editor SQL de Supabase y recarga.
          </p>
        </div>
      ) : (
        <>
          {/* Enviar prueba */}
          <div className="mt-6 bg-white rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--navy)]">Enviar prueba ahora</p>
              <p className="text-xs text-[var(--gray-600)] mt-0.5">Envía el resumen de ayer a todos los destinatarios activos para verificar la configuración.</p>
            </div>
            <form action={sendTestNow}>
              <button type="submit" className="btn-primary shrink-0">
                <Send size={15} strokeWidth={2} />
                Enviar prueba
              </button>
            </form>
          </div>

          {/* Agregar destinatario */}
          <div className="mt-4 bg-white rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-5">
            <p className="text-sm font-semibold text-[var(--navy)] mb-3">Agregar destinatario</p>
            <form action={addRecipient} className="flex flex-col sm:flex-row gap-3">
              <input name="email" type="email" required placeholder="correo@empresa.cl" className="input-premium flex-1" />
              <input name="name" type="text" placeholder="Nombre (opcional)" className="input-premium flex-1" />
              <button type="submit" className="btn-primary shrink-0">
                <Mail size={15} strokeWidth={2} />
                Agregar
              </button>
            </form>
          </div>

          {/* Lista */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="section-label !mb-0">Destinatarios</span>
              <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full font-medium">{recipients?.length ?? 0}</span>
            </div>

            {!recipients?.length ? (
              <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-10 text-center text-sm text-[var(--gray-500)]">
                Aún no hay destinatarios. Agrega el primero arriba.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--gray-200)] overflow-hidden shadow-[var(--shadow-sm)] divide-y divide-[var(--gray-100)]">
                {recipients.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgb(224 163 58 / 0.12)', color: 'var(--amber-dark)' }}>
                      <Mail size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--navy)] truncate">{r.email}</p>
                      {r.name && <p className="text-xs text-[var(--gray-500)] truncate">{r.name}</p>}
                    </div>
                    <form action={toggleRecipient.bind(null, r.id, !r.active)}>
                      <button type="submit"
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          r.active ? 'badge badge-green' : 'badge badge-gray'
                        }`}
                        title={r.active ? 'Activo · clic para pausar' : 'Pausado · clic para activar'}>
                        {r.active ? 'Activo' : 'Pausado'}
                      </button>
                    </form>
                    <form action={deleteRecipient.bind(null, r.id)}>
                      <button type="submit" className="text-[var(--gray-400)] hover:text-red-600 transition-colors p-1" title="Eliminar" aria-label="Eliminar destinatario">
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
