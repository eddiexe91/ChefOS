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
  const [modo, setModo] = useState<'crear' | 'unir'>('crear')
  const [paso, setPaso] = useState(1)
  const [clave, setClave] = useState('')
  async function registrar(event: React.FormEvent) {
    event.preventDefault(); setEnviando(true); setError('')
    try {
    const { data, error: registroError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: nombre, ...(modo === 'crear' ? { restaurant_name: restaurante } : { clave_equipo: clave.trim() }) } } })
    if (registroError) setError(modo === 'unir' ? 'No se pudo crear la cuenta. Revisa la clave con quien te invitó: puede estar usada o vencida. ' + registroError.message : registroError.message)
    else if (data.session) router.push('/dashboard')
    else setConfirmado(true)
    } catch {
      setError('No se pudo conectar. Comprueba tu conexión y vuelve a intentar.')
    } finally { setEnviando(false) }
  }
  if (confirmado) return <div className="min-h-dvh bg-fondo-base flex items-center justify-center px-6"><div className="w-full max-w-sm text-center space-y-3"><h1 className="text-xl font-display font-bold text-texto-primario">Revisa tu correo</h1><p className="text-sm text-texto-secundario">Confirma tu cuenta y luego vuelve a ChefOS para iniciar sesión.</p><Link href="/auth/login" className="text-sm text-acento underline">Ir al inicio de sesión</Link></div></div>
  return <div className="min-h-dvh bg-fondo-base flex items-center justify-center px-6 py-10"><div className="w-full max-w-sm space-y-5"><h1 className="text-2xl font-display font-bold">{modo === 'crear' ? 'Crea tu restaurante' : 'Únete a tu cocina'}</h1><p className="text-sm text-texto-secundario">Paso {paso} de 2 · {paso === 1 ? 'El restaurante primero' : 'Tu cuenta personal'}</p>
    {paso === 1 ? <form className="space-y-4" onSubmit={e=>{e.preventDefault();setPaso(2)}}><div className="flex gap-3 text-sm"><button type="button" onClick={()=>setModo('crear')} className={modo==='crear'?'text-acento':'text-texto-secundario'}>Crear restaurante</button><button type="button" onClick={()=>setModo('unir')} className={modo==='unir'?'text-acento':'text-texto-secundario'}>Unirme a un restaurante</button></div>{modo === 'crear' ? <label className="block text-sm">Nombre del restaurante<input required maxLength={120} value={restaurante} onChange={e=>setRestaurante(e.target.value)} className="campo-input mt-2" /></label> : <label className="block text-sm">Clave del equipo<input required autoComplete="off" value={clave} onChange={e=>setClave(e.target.value)} className="campo-input mt-2" /><span className="block text-xs text-texto-apagado mt-2">Pídela al dueño, administración o chef ejecutivo.</span></label>}<button className="btn-primario">Continuar</button></form> : <form onSubmit={registrar} className="space-y-4"><p className="text-sm">{modo==='crear'?`Crearás ${restaurante} como dueño. Después podrás invitar al equipo y asignar roles.`:'Tu rol será el asignado en la invitación y compartirás los datos del restaurante.'}</p><label className="block text-sm">Tu nombre<input required autoComplete="name" value={nombre} onChange={e=>setNombre(e.target.value)} className="campo-input mt-1" /></label><label className="block text-sm">Correo<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="campo-input mt-1" /></label><label className="block text-sm">Contraseña personal<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="campo-input mt-1" /></label>{error&&<p role="alert" className="text-sm text-peligro-texto">{error}</p>}<button disabled={enviando} className="btn-primario">{enviando?'Creando…':modo==='crear'?'Crear restaurante y mi cuenta':'Crear cuenta y unirme'}</button><button type="button" onClick={()=>setPaso(1)} className="text-acento text-sm">Volver</button></form>}<Link href="/auth/login" className="block text-center text-sm text-acento">Ya tengo una cuenta</Link></div></div>
}
