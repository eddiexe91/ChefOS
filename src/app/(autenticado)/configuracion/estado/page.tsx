'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react'

type Estado = { version?: string; historialPos?: { disponible: boolean; mensaje: string }; ok: boolean; configuracion: { supabaseUrl: boolean; supabaseAnonKey: boolean; anthropic: boolean }; autenticado: boolean; storage: { accesible: boolean; buckets: string[] } }

export default function EstadoSistemaPage() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { fetch('/api/health').then((response) => { if (!response.ok) throw new Error('No se pudo comprobar el backend.'); return response.json() }).then((data: Estado) => setEstado(data)).catch(() => setError('No se pudo comprobar el backend. Revisa internet y vuelve a abrir esta pantalla.')) }, [])
  if (error) return <p className="px-4 py-6 text-texto-primario" role="alert">{error}</p>
  const fila = (texto: string, activo: boolean) => <div className="flex items-center justify-between py-3 border-b border-fondo-borde last:border-0"><span className="text-sm text-texto-secundario">{texto}</span>{activo ? <CheckCircle2 size={18} className="text-exito" /> : <CircleAlert size={18} className="text-advertencia" />}</div>
  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5 text-texto-primario">
    <h1 className="text-xl font-display font-bold flex gap-3"><ShieldCheck className="text-info-texto" />Estado del sistema</h1>
    {!estado ? <p>Comprobando conexión…</p> : <>
      <section className="tarjeta p-4 space-y-2"><p>Backend ChefOS {estado.version ?? 'sin versión'}</p><p className="text-sm text-texto-secundario">La versión Android se consulta en Ajustes del teléfono → Aplicaciones → ChefOS.</p>{fila('Historial POS', estado.historialPos?.disponible === true)}<p className="text-sm">{estado.historialPos?.mensaje ?? 'Este backend aún no informa el estado del historial.'}</p></section>
      <section className="tarjeta p-4">{fila('URL de Supabase', estado.configuracion.supabaseUrl)}{fila('Clave pública de Supabase', estado.configuracion.supabaseAnonKey)}{fila('Sesión de usuario', estado.autenticado)}{fila('Storage accesible', estado.storage.accesible)}{fila(estado.configuracion.anthropic ? 'Chef IA avanzado (Claude)' : 'Chef IA básico', true)}</section>
      <section className="tarjeta p-4"><h2 className="text-sm mb-2">Buckets disponibles</h2><p className="text-sm text-texto-secundario">{estado.storage.buckets.join(' · ') || 'No se detectaron buckets.'}</p></section>
    </>}
    <a className="block text-acento min-h-12" href="https://github.com/eddiexe91/ChefOS/blob/main/GUIA_TESTEO_CHEFOS_1.3.0.md" target="_blank" rel="noopener noreferrer">Guía completa de testeo 1.3.0 →</a>
  </div>
}
