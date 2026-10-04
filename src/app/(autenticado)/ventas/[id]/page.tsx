'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = { id: string; nombre_original: string; nombre_normalizado: string | null; confianza_match: number | null; requiere_revision: boolean; cantidad_vendida: number; total: number; receta_id: string | null }
type Receta = { id: string; nombre: string }

export default function RevisionVentasPage({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<Item[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [estado, setEstado] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aplicado, setAplicado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [historico, setHistorico] = useState(false)
  useEffect(() => { fetch(`/api/ventas/importaciones/${params.id}`).then((r) => r.json()).then((j: { data?: { importacion?: { modo?: string; descuento_inventario_aplicado?: boolean }; items: Item[]; recetas: Receta[] } }) => { setAplicado(j.data?.importacion?.descuento_inventario_aplicado === true); setCargando(false); setHistorico(j.data?.importacion?.modo === 'historico'); setItems(j.data?.items ?? []); setRecetas(j.data?.recetas ?? []) }) }, [params.id])
  async function asignar(item: Item, recetaId: string) {
    if (aplicado || confirmando) return
    const receta = recetas.find((fila) => fila.id === recetaId)
    const response = await fetch(`/api/ventas/items/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ receta_id: recetaId || null, nombre_normalizado: receta?.nombre ?? null }) })
    if (response.ok) setItems((actuales) => actuales.map((actual) => actual.id === item.id ? { ...actual, receta_id: recetaId || null, nombre_normalizado: receta?.nombre ?? null, requiere_revision: !recetaId, confianza_match: recetaId ? 1 : 0 } : actual))
  }
  async function confirmar() {
    if (aplicado || confirmando) return
    setConfirmando(true)
    try {
    const response = await fetch(`/api/ventas/importaciones/${params.id}/confirmar`, { method: 'POST' })
    const j = await response.json()
    if (!response.ok) throw new Error(j.error ?? 'No se pudo confirmar la importación.')
    setAplicado(true)
    setEstado(j.ya_aplicado ? 'El consumo ya estaba confirmado. No se descontó de nuevo.' : 'Consumo confirmado. No se volverá a descontar al reabrir.')
    } catch (e) { setEstado(e instanceof Error ? e.message : 'Respuesta no recibida. Consulta la venta antes de reintentar.') }
    finally { setConfirmando(false) }
    setConfirmando(false)
  }
  const pendientes = items.filter((item) => item.requiere_revision).length
  if (historico) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5 text-texto-primario"><h1 className="text-xl font-display font-bold">Historial de ventas</h1><p>Estas ventas aportan memoria al Briefing y no descuentan inventario actual.</p><Link href="/ventas/mapeos" className="btn-primario">Revisar productos POS</Link><Link href="/ventas/analitica" className="block text-acento">Consultar analítica</Link><Link href="/ventas/importar" className="block text-acento">Importar otro paquete</Link></div>
  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5"><Link href="/ventas" className="text-xs text-texto-apagado">← Ventas</Link><div><h1 className="text-xl font-display font-bold text-texto-primario">Revisión de ventas</h1><p className="text-xs text-texto-apagado mt-1">{items.length} líneas · {pendientes} pendientes</p></div><div className="space-y-3">{items.map((item) => <article key={item.id} className={`tarjeta p-4 space-y-3 ${item.requiere_revision ? 'border-advertencia' : ''}`}><div className="flex justify-between gap-3"><div><p className="text-sm text-texto-primario">{item.nombre_original}</p><p className="text-xs text-texto-apagado mt-1">{item.cantidad_vendida} unidades · ${item.total}</p></div><span className={item.requiere_revision ? 'badge-advertencia' : 'badge-exito'}>{item.requiere_revision ? 'Revisar' : 'OK'}</span></div><select disabled={aplicado || confirmando} value={item.receta_id ?? ''} onChange={(e) => void asignar(item, e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="">Sin coincidencia</option>{recetas.map((receta) => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}</select></article>)}</div><button onClick={confirmar} disabled={cargando || aplicado || confirmando || pendientes > 0 || items.length === 0} className="btn-primario w-full disabled:opacity-50">{aplicado ? 'Consumo ya confirmado' : confirmando ? 'Confirmando…' : 'Confirmar y descontar inventario'}</button>{estado && <p className="text-xs text-exito-texto" role="status">{estado}</p>}</div>
}
