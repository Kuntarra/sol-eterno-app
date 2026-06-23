import { createClient } from '@/lib/supabase/server'
import { crearAccesoPersona, guardarPermisos } from '@/app/actions/acceso'
import { SubmitButton } from '@/app/_components/submit-button'
import { ArrowLeft, IdCard, Phone, Globe, Cake, ShieldAlert, FolderKanban, Lock, KeyRound, Save, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'
import { MODULOS } from '@/lib/modulos'

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }

export default async function FichaPersonaPage({ params, searchParams }: Props) {
  const { id } = await params
  const { success, error } = await searchParams
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!persona) notFound()

  const [{ data: dir }, { data: dotaciones }, { data: login }] = await Promise.all([
    supabase.from('persona_directorio').select('activa, oficios(nombre)').eq('persona_id', id).maybeSingle(),
    supabase
      .from('dotaciones')
      .select('id, proyecto_id, estado, turno_dias_trabajo, turno_dias_descanso, proyectos(nombre)')
      .eq('persona_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('id, email').eq('persona_id', id).maybeSingle(),
  ])

  // Permisos actuales (alcance general) del login de la persona
  const permisos: Record<string, string> = {}
  if (login) {
    const { data: ums } = await supabase.from('user_modulos').select('modulo, nivel').eq('user_id', login.id).is('proyecto_id', null)
    for (const u of ums ?? []) permisos[u.modulo] = u.nivel
  }
  const crearAcceso = crearAccesoPersona.bind(null, id)
  const guardarPerms = guardarPermisos.bind(null, id)

  const nombre = `${persona.nombres} ${persona.apellido_paterno}${persona.apellido_materno ? ' ' + persona.apellido_materno : ''}`
  const doc = persona.tipo_documento === 'rut' ? formatRut(persona.numero_documento) : persona.numero_documento
  const oficio = (dir?.oficios as unknown as { nombre: string } | null)?.nombre

  const datos = [
    { icon: <IdCard size={15} strokeWidth={1.75} />, label: 'Documento', value: `${doc} (${persona.tipo_documento})` },
    { icon: <Phone size={15} strokeWidth={1.75} />, label: 'Teléfono', value: persona.telefono ?? '—' },
    { icon: <Globe size={15} strokeWidth={1.75} />, label: 'Nacionalidad', value: persona.nacionalidad ?? '—' },
    { icon: <Cake size={15} strokeWidth={1.75} />, label: 'Fecha de nacimiento', value: persona.fecha_nacimiento ?? '—' },
    { icon: <ShieldAlert size={15} strokeWidth={1.75} />, label: 'Contacto de emergencia', value: persona.contacto_emergencia_nombre ? `${persona.contacto_emergencia_nombre}${persona.contacto_emergencia_telefono ? ' · ' + persona.contacto_emergencia_telefono : ''}` : '—' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/personal" className="text-[var(--gray-600)] hover:text-[var(--navy)]"><ArrowLeft size={18} strokeWidth={2} /></Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--amber)] flex items-center justify-center shrink-0">
            <span className="text-[var(--navy)] text-sm font-black uppercase">{persona.nombres.slice(0, 1)}{persona.apellido_paterno.slice(0, 1)}</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--navy)] tracking-[-0.01em] leading-tight">{nombre}</h1>
            <p className="text-sm text-[var(--gray-600)]">
              {doc}{oficio ? ` · ${oficio}` : ''}
              {dir && <span className={`ml-2 badge ${dir.activa ? 'badge-green' : 'badge-gray'}`}>{dir.activa ? 'Activa' : 'Inactiva'}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[var(--navy)] mb-4">Datos de la persona</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {datos.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[var(--gray-600)]">{d.icon}</span>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--gray-600)] font-semibold">{d.label}</p>
                <p className="text-sm text-[var(--navy)]">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proyectos donde está asignada */}
      <h2 className="text-sm font-semibold text-[var(--navy)] mb-3">Proyectos asignados ({dotaciones?.length ?? 0})</h2>
      {!dotaciones?.length ? (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-8 text-center text-sm text-[var(--gray-600)] mb-6">
          <FolderKanban size={22} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gray-600)]" />
          Aún no está asignada a ningún proyecto
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] divide-y divide-[var(--gray-100)] mb-6">
          {dotaciones.map((d) => (
            <Link key={d.id} href={`/admin/proyectos/${d.proyecto_id}/dotacion/${d.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--gray-100)]/50">
              <span className="text-sm font-medium text-[var(--navy)]">{(d.proyectos as unknown as { nombre: string } | null)?.nombre ?? 'Sin proyecto'}</span>
              <span className="text-xs text-[var(--gray-600)]">
                {d.turno_dias_trabajo ? `${d.turno_dias_trabajo}x${d.turno_dias_descanso ?? 0}` : '—'} · {d.estado}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Acceso y permisos */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={15} strokeWidth={2} className="text-[var(--navy)]" />
          <h2 className="text-sm font-semibold text-[var(--navy)]">Acceso y permisos</h2>
        </div>

        {success === 'acceso' && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Acceso creado. Ahora marca sus permisos por módulo.</div>}
        {success === 'permisos' && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Permisos guardados.</div>}
        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{decodeURIComponent(error)}</div>}

        {!login ? (
          /* Paso A: crear el acceso */
          <form action={crearAcceso} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Correo de acceso</label>
              <input id="email" name="email" type="email" required placeholder="persona@empresa.cl" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--gray-600)] mb-1">Clave (mín. 6)</label>
              <input id="password" name="password" type="text" required minLength={6} placeholder="clave inicial" className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]" />
            </div>
            <SubmitButton pendingText="Creando acceso…" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
              <KeyRound size={15} strokeWidth={2.25} /> Crear acceso
            </SubmitButton>
            <p className="md:col-span-3 text-xs text-[var(--gray-600)]">Esto crea el usuario para que esta persona pueda iniciar sesión. Luego marcas sus módulos y nivel.</p>
          </form>
        ) : (
          /* Paso B: marcar permisos por módulo */
          <>
            <p className="text-xs text-[var(--gray-600)] mb-4 flex items-center gap-1.5">
              <CheckCircle2 size={13} strokeWidth={2} className="text-green-600" /> Acceso activo: <strong className="text-[var(--navy)]">{login.email}</strong>
            </p>
            <form action={guardarPerms} className="space-y-2">
              {MODULOS.map((m) => {
                const activo = permisos[m.k] !== undefined
                return (
                  <div key={m.k} className="flex items-center gap-3 py-1.5">
                    <label className="flex items-center gap-2 w-40 shrink-0 cursor-pointer">
                      <input type="checkbox" name={`mod_${m.k}`} defaultChecked={activo} className="w-4 h-4 accent-[var(--navy)]" />
                      <span className="text-sm text-[var(--navy)] font-medium">{m.label}</span>
                    </label>
                    <select name={`nivel_${m.k}`} defaultValue={permisos[m.k] ?? 'visor'} className="px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--navy)]">
                      <option value="admin_modulo">Supervisor de módulo</option>
                      <option value="actuador">Revisor</option>
                      <option value="visor">Visualizador</option>
                    </select>
                  </div>
                )
              })}
              <SubmitButton pendingText="Guardando…" className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[var(--navy)] hover:bg-[var(--navy-dark)] text-white text-sm font-semibold rounded-lg">
                <Save size={15} strokeWidth={2.25} /> Guardar permisos
              </SubmitButton>
              <p className="text-xs text-[var(--gray-600)] mt-1">Marca el módulo y elige el nivel. El alcance (todo el proyecto o solo el módulo) lo aplica el sistema según el tipo de empresa.</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
