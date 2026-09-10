'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Camera, RefreshCw } from 'lucide-react'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import { useApp } from '@/providers/AppProvider'

type Fila = { id: string; nombre: string; cantidad_gramos: number; stock_minimo_gramos: number }
type Analisis = { id?: string; producto_id: string; consumo_teorico_g: number; consumo_real_g: number; desviacion_pct: number | null; clasificacion: string }
type Snapshot = { id: string; fecha: string; tipo_snapshot: string; cantidad_gramos: number; producto_id: string }

const fechaHoy = new Date().toISOString().slice(0, 10)
const fechaInicial = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

export default function AnaliticaPage() {
  const { restaurante, usuario } = useApp()
  const [productos, setProductos] = useState<Fila[]>([])
  const [analisis, setAnalisis] = useState<Analisis[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [inicio, setInicio] = useState(fechaInicial)
  const [fin, setFin] = useState(fechaHoy)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [calculando, setCalculando] = useState(false)

  useEffect(() => { void cargar() }, [restaurante?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    if (!restaurante?.id) return
    const supabase = obtenerClienteNavegador()
    const [{ data: filas }, { data: resultados }, { data: conteos }] = await Promise.all([
      supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos').eq('restaurante_id', restaurante.id).eq('activo', true).order('nombre'),
      supabase.from('analisis_consumo').select('id,producto_id,consumo_teorico_g,consumo_real_g,desviacion_pct,clasificacion').eq('restaurante_id', restaurante.id).order('desviacion_pct', { ascending: false }).limit(30),
      supabase.from('inventario_snapshots').select('id,fecha,tipo_snapshot,cantidad_gramos,producto_id').eq('restaurante_id', restaurante.id).order('fecha', { ascending: false }).limit(30),
    ])
    setProductos((filas ?? []) as Fila[])
    setAnalisis((resultados ?? []) as Analisis[])
    setSnapshots((conteos ?? []) as Snapshot[])
  }

  async function snapshot() {
    if (!restaurante?.id || !productos.length || cargando) return
    setCargando(true); setMensaje('')
    const supabase = obtenerClienteNavegador()
    const filas = productos.map((p) => ({ restaurante_id: restaurante.id, producto_id: p.id, fecha: fin, tipo_snapshot: 'manual', cantidad_gramos: p.cantidad_gramos, registrado_por: usuario?.id }))
    const { error } = await supabase.from('inventario_snapshots').upsert(filas, { onConflict: 'restaurante_id,producto_id,fecha,tipo_snapshot' })
    setMensaje(error ? `No se pudo guardar: ${error.message}` : 'Snapshot guardado para todos los productos activos.')
    if (!error) await cargar()
    setCargando(false)
  }

  async function calcular() {
    if (!restaurante?.id || calculando) return
    setCalculando(true); setMensaje('')
    const supabase = obtenerClienteNavegador()
    const { error } = await supabase.rpc('calcular_analisis_consumo', { p_restaurante_id: restaurante.id, p_inicio: inicio, p_fin: fin, p_periodo: 'personalizado' })
    setMensaje(error ? `No se pudo calcular: ${error.message}` : 'Análisis actualizado para el periodo seleccionado.')
    if (!error) await cargar()
    setCalculando(false)
  }

  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5">
    <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-info-suave flex items-center justify-center"><BarChart3 className="text-info-texto" /></div><div><h1 className="text-xl font-display font-bold text-texto-primario">Analítica operativa</h1><p className="text-xs text-texto-apagado">Desviaciones y conteos físicos del inventario</p></div></div>
    <section className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3"><div className="grid grid-cols-2 gap-3"><label className="text-xs text-texto-apagado">Desde<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl bg-fondo-card border border-fondo-borde px-3 text-sm text-texto-primario" /></label><label className="text-xs text-texto-apagado">Hasta<input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl bg-fondo-card border border-fondo-borde px-3 text-sm text-texto-primario" /></label></div><div className="grid grid-cols-2 gap-2"><button onClick={() => void calcular()} disabled={calculando} className="min-h-11 rounded-xl border border-acento text-acento flex items-center justify-center gap-2 disabled:opacity-50"><RefreshCw size={16} className={calculando ? 'animate-spin' : ''} />{calculando ? 'Calculando…' : 'Calcular análisis'}</button><button onClick={() => void snapshot()} disabled={cargando || !productos.length} className="min-h-11 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50"><Camera size={16} />Guardar snapshot</button></div>{mensaje && <p className="text-xs text-texto-secundario" role="status">{mensaje}</p>}</section>
    <section className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-4"><h2 className="text-sm font-medium text-texto-primario mb-3">Desviaciones del periodo</h2>{analisis.length === 0 ? <p className="text-xs text-texto-apagado">Calcula un periodo para ver consumo teórico frente a consumo real.</p> : <div className="space-y-3">{analisis.map((fila) => { const porcentaje = Math.min(100, Math.abs(Number(fila.desviacion_pct ?? 0))); return <div key={fila.id ?? fila.producto_id} className="space-y-1"><div className="flex justify-between text-xs"><span className="text-texto-secundario">Producto {fila.producto_id.slice(0, 8)}</span><span className={fila.clasificacion === 'critica' ? 'text-peligro' : 'text-texto-primario'}>{fila.desviacion_pct ?? 0}% · {fila.clasificacion}</span></div><div className="h-2 rounded-full bg-fondo-card overflow-hidden"><div className={`h-full rounded-full ${fila.clasificacion === 'critica' ? 'bg-peligro' : 'bg-acento'}`} style={{ width: `${porcentaje}%` }} /></div><p className="text-2xs text-texto-apagado">Teórico {Number(fila.consumo_teorico_g).toLocaleString('es-CL')} g · real {Number(fila.consumo_real_g).toLocaleString('es-CL')} g</p></div> })}</div>}</section>
    <section className="rounded-2xl border border-fondo-borde bg-fondo-elevado p-4"><h2 className="text-sm font-medium text-texto-primario mb-3">Snapshots recientes</h2>{snapshots.length === 0 ? <p className="text-xs text-texto-apagado">Todavía no hay conteos físicos guardados.</p> : <div className="space-y-2">{snapshots.map((fila) => <div key={fila.id} className="flex items-center justify-between text-xs"><span className="text-texto-secundario">{fila.fecha} · {fila.producto_id.slice(0, 8)}</span><span className="text-texto-primario font-mono">{Number(fila.cantidad_gramos).toLocaleString('es-CL')} g</span></div>)}</div>}</section>
  </div>
}
