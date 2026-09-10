'use client'

import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'

type Especialista = 'tecnico' | 'ejecutivo' | 'instructor'
type Mensaje = { rol: 'usuario' | 'asistente'; contenido: string }

export default function PaginaChefIA() {
  const [especialista, setEspecialista] = useState<Especialista>('ejecutivo')
  const [mensaje, setMensaje] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [conversacionId, setConversacionId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function preguntar(event: React.FormEvent) {
    event.preventDefault()
    if (!mensaje.trim()) return
    setCargando(true)
    try {
      const res = await fetch('/api/ia/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ especialista, mensaje, conversacionId }) })
      const data = await res.json() as { respuesta?: string; error?: string; conversacionId?: string | null }
      const contenido = data.respuesta ?? data.error ?? 'No se pudo obtener una respuesta.'
      setRespuesta(contenido)
      setMensajes((actuales) => [...actuales, { rol: 'usuario', contenido: mensaje }, { rol: 'asistente', contenido }])
      if (data.conversacionId) setConversacionId(data.conversacionId)
      setMensaje('')
    } finally {
      setCargando(false)
    }
  }

  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5">
    <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-acento-suave flex items-center justify-center"><Sparkles className="text-acento" size={23} /></div><div><h1 className="text-xl font-display font-bold text-texto-primario">Chef IA</h1><p className="text-xs text-texto-apagado">Tu equipo de especialistas operativos</p></div></div>
    <div className="grid grid-cols-3 gap-2">{(['tecnico', 'ejecutivo', 'instructor'] as Especialista[]).map((item) => <button key={item} onClick={() => { setEspecialista(item); setConversacionId(null); setRespuesta(''); setMensajes([]) }} className={`min-h-12 rounded-xl border text-xs capitalize ${especialista === item ? 'border-acento bg-acento-suave text-acento' : 'border-fondo-borde bg-fondo-elevado text-texto-secundario'}`}>{item}</button>)}</div>
    <div className="min-h-48 max-h-[28rem] overflow-y-auto rounded-2xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3"><p className="text-xs uppercase tracking-wide text-texto-apagado">Conversación</p>{mensajes.length === 0 ? <p className="text-sm leading-relaxed text-texto-primario">Pregunta por costos, producción, mermas, recetas o capacitación.</p> : mensajes.map((item, indice) => <div key={`${item.rol}-${indice}`} className={`rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${item.rol === 'usuario' ? 'ml-6 bg-acento-suave text-texto-primario' : 'mr-6 bg-fondo-card text-texto-primario'}`}><p className="text-[10px] uppercase tracking-wide text-texto-apagado mb-1">{item.rol === 'usuario' ? 'Tú' : 'Chef IA'}</p>{item.contenido}</div>)}</div>
    <form onSubmit={preguntar} className="flex gap-2"><input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="¿Qué necesitas resolver?" className="flex-1 min-h-12 rounded-xl border border-fondo-borde bg-fondo-elevado px-3 text-sm text-texto-primario outline-none focus:border-acento" /><button disabled={cargando} className="w-12 rounded-xl bg-acento text-white flex items-center justify-center disabled:opacity-50" aria-label="Enviar"><Send size={18} /></button></form>
  </div>
}
