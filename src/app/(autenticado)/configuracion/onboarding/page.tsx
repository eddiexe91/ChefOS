'use client'

import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { useApp } from '@/providers/AppProvider'

const PASOS = [
  ['Identidad', 'Confirma el nombre y la zona horaria de tu restaurante.'],
  ['Catálogo', 'Luego podrás importar tus recetas desde CSV.'],
  ['Inventario', 'Carga productos, unidades y stock mínimo.'],
  ['Equipo', 'Invita a chefs y cocineros con sus permisos.'],
  ['Listo', 'Tu briefing operativo quedará preparado cada mañana.'],
]

export default function OnboardingPage() {
  const { restaurante } = useApp()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState(restaurante?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipoImportacion, setTipoImportacion] = useState<'recetas' | 'productos'>('recetas')
  const [mensajeImportacion, setMensajeImportacion] = useState('')

  async function importar() {
    if (!archivo) return
    setGuardando(true)
    const form = new FormData()
    form.set('archivo', archivo)
    form.set('tipo', tipoImportacion)
    const response = await fetch('/api/onboarding/importar', { method: 'POST', body: form })
    const data = await response.json() as { importados?: number; error?: string }
    setMensajeImportacion(response.ok ? `${data.importados ?? 0} registros importados.` : (data.error ?? 'No se pudo importar.'))
    setGuardando(false)
  }

  async function continuar() {
    if (paso < PASOS.length - 1) return setPaso((actual) => actual + 1)
    setGuardando(true)
    const supabase = obtenerClienteNavegador()
    await supabase.from('restaurantes').update({ nombre, onboarding_completado: true }).eq('id', restaurante?.id ?? '')
    setGuardando(false)
  }

  return <div className="px-4 pt-8 pb-28 max-w-lg mx-auto space-y-6">
    <div><p className="text-xs uppercase tracking-wide text-acento">Configuración inicial</p><h1 className="text-2xl font-display font-bold text-texto-primario mt-1">Pongamos ChefOS a trabajar</h1><p className="text-sm text-texto-secundario mt-2">Cinco pasos breves para adaptar la operación a tu restaurante.</p></div>
    <div className="flex gap-1">{PASOS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-acento' : 'bg-fondo-borde'}`} />)}</div>
    <div className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 min-h-56"><div className="w-12 h-12 rounded-2xl bg-acento-suave flex items-center justify-center mb-4"><Check className="text-acento" /></div><h2 className="text-lg font-display font-bold text-texto-primario">{PASOS[paso][0]}</h2><p className="text-sm text-texto-secundario mt-2 leading-relaxed">{PASOS[paso][1]}</p>{paso === 0 && <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-5 w-full min-h-12 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" placeholder="Nombre del restaurante" />}{paso === 1 && <div className="mt-5 space-y-3"><select value={tipoImportacion} onChange={(e) => setTipoImportacion(e.target.value as 'recetas' | 'productos')} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="recetas">Importar recetas</option><option value="productos">Importar inventario</option></select><input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="w-full text-xs text-texto-secundario" />{archivo && <button type="button" onClick={() => void importar()} disabled={guardando} className="w-full min-h-10 rounded-xl border border-acento text-acento text-sm disabled:opacity-50">{guardando ? 'Importando…' : 'Importar CSV ahora'}</button>}{mensajeImportacion && <p className="text-xs text-exito-texto">{mensajeImportacion}</p>}</div>}</div>
    <button onClick={continuar} disabled={guardando} className="w-full min-h-12 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50">{paso === PASOS.length - 1 ? 'Terminar configuración' : 'Continuar'}<ChevronRight size={18} /></button>
  </div>
}
