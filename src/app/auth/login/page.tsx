'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ChefHat, Loader2, Mail } from 'lucide-react'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

export const dynamic = 'force-dynamic'

type Modo = 'password' | 'magic-link'

export default function PaginaLogin() {
  const supabase = obtenerClienteNavegador()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [modo, setModo] = useState<Modo>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ?? null
  )
  const [magicLinkEnviado, setMagicLinkEnviado] = useState(false)

  const redirigirA = searchParams.get('redirigir_a') ?? '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    try {
      if (modo === 'magic-link') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirigirA}`,
          },
        })
        if (err) throw err
        setMagicLinkEnviado(true)
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (err) {
          if (err.message.includes('Invalid login credentials')) {
            setError('Email o contraseña incorrectos.')
          } else {
            throw err
          }
          return
        }
        router.push(redirigirA)
        router.refresh()
      }
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(mensaje)
    } finally {
      setCargando(false)
    }
  }

  if (magicLinkEnviado) {
    return (
      <div className="min-h-dvh bg-fondo-base flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-acento-suave flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-acento" />
          </div>
          <h2 className="font-display text-xl font-bold text-texto-primario mb-2">
            Revisa tu email
          </h2>
          <p className="text-sm font-sans text-texto-apagado mb-6">
            Enviamos un enlace de acceso a{' '}
            <span className="text-texto-secundario font-medium">{email}</span>.
            Úsalo para ingresar a ChefOS.
          </p>
          <button
            onClick={() => { setMagicLinkEnviado(false); setError(null) }}
            className="text-sm text-acento underline"
          >
            Volver al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-fondo-base flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-acento flex items-center justify-center mb-4 shadow-acento">
            <ChefHat size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-texto-primario">
            ChefOS
          </h1>
          <p className="text-sm font-sans text-texto-apagado mt-1">
            Inteligencia operativa para cocinas
          </p>
        </div>

        <div className="flex bg-fondo-card border border-fondo-borde rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setModo('password'); setError(null) }}
            className={[
              'flex-1 h-9 rounded-lg text-sm font-sans font-medium transition-all',
              modo === 'password'
                ? 'bg-fondo-elevado text-texto-primario shadow-card'
                : 'text-texto-apagado',
            ].join(' ')}
          >
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => { setModo('magic-link'); setError(null) }}
            className={[
              'flex-1 h-9 rounded-lg text-sm font-sans font-medium transition-all',
              modo === 'magic-link'
                ? 'bg-fondo-elevado text-texto-primario shadow-card'
                : 'text-texto-apagado',
            ].join(' ')}
          >
            Magic Link
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="campo-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chef@restaurante.com"
              className="campo-input"
            />
          </div>

          {modo === 'password' && (
            <div>
              <label htmlFor="password" className="campo-label">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="campo-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-icono w-8 h-8"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-peligro-suave border border-peligro/20 px-4 py-3">
              <p className="text-sm font-sans text-peligro-texto">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando || !email || (modo === 'password' && !password)}
            className="btn-primario flex items-center justify-center gap-2 mt-2"
          >
            {cargando ? <Loader2 size={16} className="animate-spin" /> : null}
            {cargando
              ? 'Ingresando...'
              : modo === 'magic-link'
              ? 'Enviar enlace de acceso'
              : 'Ingresar'
            }
          </button>
        </form>

        <p className="text-center text-xs font-sans text-texto-apagado mt-8">
          ChefOS · Para uso interno del restaurante
        </p>
      </div>
    </div>
  )
                  }
