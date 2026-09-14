'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

export default function InvitacionPage() {
  const router = useRouter()
  const supabase = obtenerClienteNavegador()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function completar(evento: React.FormEvent) {
    evento.preventDefault(); setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirmacion) { setError('Las contraseñas no coinciden.'); return }
    setGuardando(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setGuardando(false); return }
    router.replace('/dashboard'); router.refresh()
  }

  return <main className="min-h-dvh bg-fondo-base flex items-center justify-center px-6"><section className="w-full max-w-sm"><p className="text-xs uppercase tracking-wide text-acento">Invitación ChefOS</p><h1 className="text-2xl font-display font-bold text-texto-primario mt-2">Activa tu cuenta</h1><p className="text-sm text-texto-secundario mt-2 mb-6">Define una contraseña para entrar al restaurante al que te invitaron.</p><form onSubmit={completar} className="space-y-4"><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8 caracteres)" className="campo-input" /><input required minLength={8} type="password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder="Repite la contraseña" className="campo-input" />{error && <p className="text-sm text-peligro-texto">{error}</p>}<button disabled={guardando} className="btn-primario disabled:opacity-50">{guardando ? 'Guardando…' : 'Activar cuenta'}</button></form></section></main>
}
