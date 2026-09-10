'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useReceta } from '@/hooks/useDominio'

export default function EditarRecetaCliente({ recetaId }: { recetaId: string }) {
  const { data: receta, isPending, isError } = useReceta(recetaId)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [rendimiento, setRendimiento] = useState('1')
  const [unidad, setUnidad] = useState('porción')
  const [precio, setPrecio] = useState('')
  const [tiempo, setTiempo] = useState('')
  const [dificultad, setDificultad] = useState('')
  const [enCarta, setEnCarta] = useState(true)
  const [esProduccion, setEsProduccion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  useEffect(() => { if (receta) { setNombre(receta.nombre); setDescripcion(receta.descripcion ?? ''); setRendimiento(String(receta.rendimiento_porciones)); setUnidad(receta.unidad_rendimiento); setPrecio(receta.precio_venta == null ? '' : String(receta.precio_venta)); setTiempo(receta.tiempo_preparacion == null ? '' : String(receta.tiempo_preparacion)); setDificultad(receta.dificultad ?? ''); setEnCarta(receta.en_carta); setEsProduccion(receta.es_produccion) } }, [receta])
  if (isPending) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto"><div className="skeleton h-6 w-2/3" /></div>
  if (isError || !receta) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-3"><Link href="/biblioteca" className="text-xs text-acento">← Biblioteca</Link><p className="text-sm text-peligro-texto">No se pudo cargar la receta.</p></div>
  async function guardar() {
    if (!nombre.trim() || !Number.isInteger(Number(rendimiento)) || Number(rendimiento) <= 0) { setMensaje('Completa un nombre y un rendimiento válido.'); return }
    setGuardando(true); setMensaje('')
    try { const response = await fetch(`/api/biblioteca/recetas/${recetaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, descripcion, rendimiento_porciones: Number(rendimiento), unidad_rendimiento: unidad, precio_venta: precio || null, tiempo_preparacion: tiempo || null, dificultad: dificultad || null, en_carta: enCarta, es_produccion: esProduccion }) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error ?? 'No se pudo guardar.'); window.location.assign(`/biblioteca/${recetaId}`) } catch (error) { setMensaje(error instanceof Error ? error.message : 'No se pudo guardar.') } finally { setGuardando(false) }
  }
  return <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto"><Link href={`/biblioteca/${recetaId}`} className="inline-flex items-center gap-2 text-xs text-texto-apagado"><ArrowLeft size={15} /> Receta</Link><section><h1 className="text-xl font-display font-bold text-texto-primario">Editar receta</h1><p className="text-xs text-texto-apagado mt-1">Actualiza los datos operativos sin perder el costeo existente.</p></section><div className="space-y-4"><label className="campo-label">Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} className="campo-input mt-1" /></label><label className="campo-label">Descripción<textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="campo-input mt-1 min-h-20" /></label><div className="grid grid-cols-2 gap-3"><label className="campo-label">Rendimiento<input type="number" min="1" step="1" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} className="campo-input mt-1" /></label><label className="campo-label">Unidad<input value={unidad} onChange={(e) => setUnidad(e.target.value)} className="campo-input mt-1" /></label></div><div className="grid grid-cols-2 gap-3"><label className="campo-label">Precio venta<input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="campo-input mt-1" /></label><label className="campo-label">Tiempo (min)<input type="number" min="0" step="1" value={tiempo} onChange={(e) => setTiempo(e.target.value)} className="campo-input mt-1" /></label></div><label className="campo-label">Dificultad<select value={dificultad} onChange={(e) => setDificultad(e.target.value)} className="campo-input mt-1"><option value="">Sin especificar</option><option value="basica">Básica</option><option value="intermedia">Intermedia</option><option value="avanzada">Avanzada</option></select></label><div className="flex gap-5 text-sm text-texto-secundario"><label className="flex items-center gap-2"><input type="checkbox" checked={enCarta} onChange={(e) => setEnCarta(e.target.checked)} /> En carta</label><label className="flex items-center gap-2"><input type="checkbox" checked={esProduccion} onChange={(e) => setEsProduccion(e.target.checked)} /> Producción</label></div></div>{mensaje && <p className="text-sm text-peligro-texto">{mensaje}</p>}<button type="button" onClick={() => void guardar()} disabled={guardando} className="btn-primario disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
}
