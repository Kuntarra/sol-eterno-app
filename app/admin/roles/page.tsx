import { createClient } from '@/lib/supabase/server'
import { assignModulo, removeModulo } from '@/app/actions/roles'
import { ShieldCheck, X } from 'lucide-react'

interface Props { searchParams: Promise<{ error?: string; success?: string }> }

const INPUT = 'px-3 py-2 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]'
const LABEL = 'block text-xs font-medium text-[var(--gray-600)] mb-1'
const MODULOS = ['personal', 'transporte', 'hotel', 'alimentacion', 'colaciones', 'lavanderia']
const MOD_LABEL: Record<string, string> = {
  personal: 'Personal', transporte: 'Transporte', hotel: 'Hotel', alimentacion: 'Alimentación', colaciones: 'Colaciones', lavanderia: 'Lavandería',
}
const NIVEL_LABEL: Record<string, string> = {
  admin_modulo: 'Administrador', actuador: 'Revisor', visor: 'Visualizador',
}
const NIVEL_BADGE: Record<string, string> = {
  admin_modulo: 'badge-green', actuador: 'badge-amber', visor: 'badge-gray',
}

export default async function RolesPage({ searchParams }: Props) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const [{ data: usuarios }, { data: asignaciones }, { data: proyectos }] = await Promise.all([
    supabase.from('user_profiles').select('id, full_name, role').neq('role', 'admin').order('full_name'),
    supabase.from('user_modulos').select('*, proyectos(nombre)').order('created_at', { ascending: false }),
    supabase.from('proyectos').select('id, nombre').order('nombre'),
  ])

  const nombreUsuario = (id: string) => (usuarios ?? []).find((u) => u.id === id)?.full_name ?? id.slice(0, 8)

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--gray-200)] mb-6">
        <span className="section-label">Configuración</span>
        <h1 className="font-display text-[2rem] font-semibold text-[var(--navy)] leading-tight tracking-tight">Roles por módulo</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">Administrador (crea) · Revisor (registra en terreno) · Visualizador (solo ve). Los administradores de la empresa tienen acceso total.</p>
      </div>

      <div className="px-8 pb-8">
        {error && <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}
        {success && <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Asignación guardada.</div>}

        {!usuarios?.length ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-12 text-center">
            <div className="w-14 h-14 bg-[var(--gray-100)] rounded-2xl flex items-center justify-center mx-auto mb-3"><ShieldCheck size={24} strokeWidth={1.5} stroke="var(--gray-600)" /></div>
            <p className="text-sm text-[var(--gray-600)]">No hay usuarios (no administradores) para asignar. Crea usuarios en la sección Usuarios.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 mb-6">
              <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Asignar acceso a un módulo</h2>
              <form action={assignModulo} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div className="col-span-2">
                  <label htmlFor="user_id" className={LABEL}>Usuario</label>
                  <select id="user_id" name="user_id" required className={`${INPUT} w-full`} defaultValue="">
                    <option value="" disabled>Selecciona…</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{u.full_name ?? u.id.slice(0, 8)} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="modulo" className={LABEL}>Módulo</label>
                  <select id="modulo" name="modulo" className={`${INPUT} w-full`} defaultValue="personal">
                    {MODULOS.map((m) => <option key={m} value={m}>{MOD_LABEL[m]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="nivel" className={LABEL}>Nivel</label>
                  <select id="nivel" name="nivel" className={`${INPUT} w-full`} defaultValue="visor">
                    <option value="visor">Visualizador (solo lee)</option>
                    <option value="actuador">Revisor (registra en terreno: check-in/out, entregas, embarques)</option>
                    <option value="admin_modulo">Administrador (gestiona el módulo)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="proyecto_id" className={LABEL}>Alcance (opcional)</label>
                  <select id="proyecto_id" name="proyecto_id" className={`${INPUT} w-full`} defaultValue="">
                    <option value="">Todo el operador</option>
                    {(proyectos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-5">
                  <button type="submit" className="px-5 py-2 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">Asignar</button>
                </div>
              </form>
            </div>

            <h2 className="text-sm font-semibold text-[var(--navy)] mb-3">Asignaciones ({asignaciones?.length ?? 0})</h2>
            {!asignaciones?.length ? (
              <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-10 text-center text-sm text-[var(--gray-600)]">Sin asignaciones todavía</div>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)]">
                {asignaciones.map((a) => {
                  const quitar = removeModulo.bind(null, a.id)
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[var(--navy)]">{nombreUsuario(a.user_id)}</span>
                        <span className="badge badge-gray">{MOD_LABEL[a.modulo] ?? a.modulo}</span>
                        <span className={`badge ${NIVEL_BADGE[a.nivel] ?? 'badge-gray'}`}>{NIVEL_LABEL[a.nivel] ?? a.nivel}</span>
                        {(a.proyectos as unknown as { nombre: string } | null)?.nombre && (
                          <span className="text-xs text-[var(--gray-600)]">· {(a.proyectos as unknown as { nombre: string }).nombre}</span>
                        )}
                      </div>
                      <form action={quitar}>
                        <button className="text-[var(--gray-600)] hover:text-red-600" title="Quitar"><X size={16} strokeWidth={2} /></button>
                      </form>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
