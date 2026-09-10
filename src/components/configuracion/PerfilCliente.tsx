'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '@/providers/AppProvider'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

export default function PerfilCliente() {
  const { usuario } = useApp()
  const supabase = obtenerClienteNavegador()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!usuario || !nombre.trim()) return

    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: nombre.trim() })
      .eq('id', usuario.id)

    setGuardando(false)
    setMensaje(error ? 'No se pudo guardar el cambio.' : 'Perfil actualizado.')
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">
      <Link href="/configuracion" className="inline-flex items-center gap-2 text-xs text-texto-apagado">
        <ArrowLeft size={15} /> Configuración
      </Link>
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario">Mi perfil</h1>
        <p className="text-xs text-texto-apagado mt-1">Actualiza la información visible en ChefOS.</p>
      </section>
      <form onSubmit={guardar} className="space-y-4 rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
        <div>
          <label htmlFor="nombre" className="campo-label">Nombre</label>
          <input
            id="nombre"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            className="campo-input"
            required
            maxLength={120}
          />
        </div>
        <div>
          <p className="campo-label">Correo</p>
          <p className="text-sm text-texto-secundario">{usuario?.email ?? '—'}</p>
        </div>
        <button type="submit" className="btn-primario" disabled={guardando || !nombre.trim()}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {mensaje && <p className="text-xs text-texto-apagado" role="status">{mensaje}</p>}
      </form>
    </div>
  )
}
