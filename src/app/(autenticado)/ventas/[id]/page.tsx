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
  useEffect(() => { fetch(`/api/ventas/importaciones/${params.id}`).then((r) => r.json()).then((j: { data?: { items: Item[]; recetas: Receta[] } }) => { setItems(j.data?.items ?? []); setRecetas(j.data?.recetas ?? []) }) }, [params.id])
  async function asignar(item: Item, recetaId: string) {
    const receta = recetas.find((fila) => fila.id === recetaId)
    const response = await fetch(`/api/ventas/items/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ receta_id: recetaId || null, nombre_normalizado: receta?.nombre ?? null }) })
    if (response.ok) setItems((actuales) => actuales.map((actual) => actual.id === item.id ? { ...actual, receta_id: recetaId || null, nombre_normalizado: receta?.nombre ?? null, requiere_revision: !recetaId, confianza_match: recetaId ? 1 : 0 } : actual))
  }
  async function confirmar() {
    setConfirmando(true)
    const response = await fetch(`/api/ventas/importaciones/${params.id}/confirmar`, { method: 'POST' })
    setEstado(response.ok ? 'Ventas confirmadas e inventario descontado.' : 'No se pudo confirmar la importación.')
    setConfirmando(false)
  }
  const pendientes = items.filter((item) => item.requiere_revision).length
  return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5"><Link href="/ventas" className="text-xs text-texto-apagado">← Ventas</Link><div><h1 className="text-xl font-display font-bold text-texto-primario">Revisión de ventas</h1><p className="text-xs text-texto-apagado mt-1">{items.length} líneas · {pendientes} pendientes</p></div><div className="space-y-3">{items.map((item) => <article key={item.id} className={`tarjeta p-4 space-y-3 ${item.requiere_revision ? 'border-advertencia' : ''}`}><div className="flex justify-between gap-3"><div><p className="text-sm text-texto-primario">{item.nombre_original}</p><p className="text-xs text-texto-apagado mt-1">{item.cantidad_vendida} unidades · ${item.total}</p></div><span className={item.requiere_revision ? 'badge-advertencia' : 'badge-exito'}>{item.requiere_revision ? 'Revisar' : 'OK'}</span></div><select value={item.receta_id ?? ''} onChange={(e) => void asignar(item, e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="">Sin coincidencia</option>{recetas.map((receta) => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}</select></article>)}</div><button onClick={confirmar} disabled={confirmando || pendientes > 0 || items.length === 0} className="btn-primario w-full disabled:opacity-50">{confirmando ? 'Confirmando…' : 'Confirmar y descontar inventario'}</button>{estado && <p className="text-xs text-exito-texto" role="status">{estado}</p>}</div>
}
