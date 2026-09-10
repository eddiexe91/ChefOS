'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react'

type Estado = { ok: boolean; configuracion: { supabaseUrl: boolean; supabaseAnonKey: boolean; anthropic: boolean }; autenticado: boolean; storage: { accesible: boolean; buckets: string[] } }

export default function EstadoSistemaPage() {
  const [estado, setEstado] = useState<Estado | null>(null)
  useEffect(() => { fetch('/api/health').then((response) => response.json()).then((data: Estado) => setEstado(data)) }, [])
  const fila = (texto: string, activo: boolean) => <div className="flex items-center justify-between py-3 border-b border-fondo-borde last:border-0"><span className="text-sm text-texto-secundario">{texto}</span>{activo ? <CheckCircle2 size={18} className="text-exito" /> : <CircleAlert size={18} className="text-advertencia" />}</div>
  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-info-suave flex items-center justify-center"><ShieldCheck className="text-info-texto" /></div><div><h1 className="text-xl font-display font-bold text-texto-primario">Estado del sistema</h1><p className="text-xs text-texto-apagado">Diagnóstico de Supabase, Storage y Chef IA</p></div></div>{!estado ? <div className="tarjeta p-4 text-sm text-texto-apagado">Comprobando conexión…</div> : <><div className="tarjeta p-4">{fila('URL de Supabase', estado.configuracion.supabaseUrl)}{fila('Clave pública de Supabase', estado.configuracion.supabaseAnonKey)}{fila('Sesión de usuario', estado.autenticado)}{fila('Storage accesible', estado.storage.accesible)}{estado.configuracion.anthropic ? fila('Chef IA avanzado (Claude)', true) : <div className="flex items-center justify-between py-3 border-b border-fondo-borde"><span className="text-sm text-texto-secundario">Chef IA básico</span><CheckCircle2 size={18} className="text-exito" /></div>}</div><div className="tarjeta p-4"><p className="text-xs uppercase tracking-wide text-texto-apagado mb-2">Buckets disponibles</p>{estado.storage.buckets.length ? <p className="text-sm text-texto-secundario">{estado.storage.buckets.join(' · ')}</p> : <p className="text-sm text-texto-apagado">No se detectaron buckets.</p>}</div></>}</div>
}
