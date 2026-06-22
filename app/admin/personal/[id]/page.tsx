import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, IdCard, Phone, Globe, Cake, ShieldAlert, FolderKanban, Lock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatRut } from '@/lib/rut'

interface Props { params: Promise<{ id: string }> }

export default async function FichaPersonaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!persona) notFound()

  const [{ data: dir }, { data: dotaciones }] = await Promise.all([
    supabase.from('persona_directorio').select('activa, oficios(nombre)').eq('persona_id', id).maybeSingle(),
    supabase
      .from('dotaciones')
      .select('id, proyecto_id, estado, turno_dias_trabajo, turno_dias_descanso, proyectos(nombre)')
      .eq('persona_id', id)
      .order('created_at', { ascending: false }),
  ])

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

      {/* Acceso y permisos — próximos pasos */}
      <div className="bg-[var(--gray-100)] rounded-2xl border border-dashed border-[var(--gray-200)] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={15} strokeWidth={2} className="text-[var(--gray-600)]" />
          <h2 className="text-sm font-semibold text-[var(--navy)]">Acceso y permisos</h2>
        </div>
        <p className="text-sm text-[var(--gray-600)]">
          Aquí podrás darle acceso al sistema (correo y clave) y marcar sus permisos por módulo
          (Supervisor / Revisor / Visualizador). En construcción — siguiente paso.
        </p>
      </div>
    </div>
  )
}
