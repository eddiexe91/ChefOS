'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

export default function RegistroPage() {
  const router = useRouter()
  const supabase = obtenerClienteNavegador()
  const [nombre, setNombre] = useState('')
  const [restaurante, setRestaurante] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  async function registrar(event: React.FormEvent) {
    event.preventDefault(); setEnviando(true); setError('')
    const { data, error: registroError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: nombre, restaurant_name: restaurante } } })
    if (registroError) setError(registroError.message)
    else if (data.session) router.push('/dashboard')
    else setConfirmado(true)
    setEnviando(false)
  }
  if (confirmado) return <div className="min-h-dvh bg-fondo-base flex items-center justify-center px-6"><div className="w-full max-w-sm text-center space-y-3"><h1 className="text-xl font-display font-bold text-texto-primario">Revisa tu correo</h1><p className="text-sm text-texto-secundario">Confirma tu cuenta y luego vuelve a ChefOS para iniciar sesión.</p><Link href="/auth/login" className="text-sm text-acento underline">Ir al inicio de sesión</Link></div></div>
  return <div className="min-h-dvh bg-fondo-base flex items-center justify-center px-6"><div className="w-full max-w-sm"><h1 className="text-2xl font-display font-bold text-texto-primario">Crear restaurante</h1><p className="text-sm text-texto-apagado mt-1 mb-6">Empieza a organizar tu operación con ChefOS.</p><form onSubmit={registrar} className="space-y-4"><input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="campo-input" /><input required value={restaurante} onChange={(e) => setRestaurante(e.target.value)} placeholder="Nombre del restaurante" className="campo-input" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="campo-input" /><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8 caracteres)" className="campo-input" />{error && <p className="text-sm text-peligro-texto">{error}</p>}<button disabled={enviando} className="btn-primario disabled:opacity-50">{enviando ? 'Creando…' : 'Crear cuenta'}</button></form><p className="text-center text-xs text-texto-apagado mt-5"><Link href="/auth/login" className="text-acento underline">Ya tengo una cuenta</Link></p></div></div>
}
