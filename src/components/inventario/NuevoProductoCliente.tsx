'use client'

import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { inventarioKeys } from '@/lib/queries'
import { useCategoriasProducto } from '@/hooks/useDominio'
import type { CategoriaProducto } from '@/types'

const UNIDADES = ['g', 'kg', 'ml', 'lt', 'unidad', 'docena', 'caja', 'bandeja', 'porcion']

interface Props { onClose: () => void }

export default function NuevoProductoCliente({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [stock, setStock] = useState('')
  const [minimo, setMinimo] = useState('')
  const [costo, setCosto] = useState('')
  const [peso, setPeso] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const categorias = useCategoriasProducto()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    const response = await fetch('/api/inventario/productos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, unidad_medida: unidad, stock, stock_minimo: minimo, costo_unitario: costo, peso_unitario_gramos: peso || undefined, categoria_id: categoriaId || undefined }),
    })
    const data = await response.json() as { error?: string }
    setGuardando(false)
    if (!response.ok) { setError(data.error ?? 'No se pudo crear el producto.'); return }
    await queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
    await queryClient.invalidateQueries({ queryKey: ['actividad-operativa'] })
    onClose()
  }

  return <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Nuevo producto">
    <form onSubmit={guardar} className="w-full max-w-lg mb-[calc(64px+env(safe-area-inset-bottom))] rounded-2xl bg-fondo-elevado p-5 space-y-4 pb-5">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-acento">Inventario</p><h2 className="text-lg font-display font-bold text-texto-primario">Nuevo producto</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} className="text-texto-apagado" /></button></div>
      <div className="space-y-1.5"><label htmlFor="nuevo-nombre" className="text-xs font-medium text-texto-secundario">Nombre del producto</label><input id="nuevo-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ejemplo: Leche entera" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario placeholder:text-texto-apagado" /></div>
      <div className="space-y-1.5"><label htmlFor="nuevo-categoria" className="text-xs font-medium text-texto-secundario">Categoría</label><select id="nuevo-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario"><option value="">Sin categoría</option>{(categorias.data ?? []).map((categoria: CategoriaProducto) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><label htmlFor="nuevo-unidad" className="text-xs font-medium text-texto-secundario">Unidad de medida</label><select id="nuevo-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario">{UNIDADES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="space-y-1.5"><label htmlFor="nuevo-stock" className="text-xs font-medium text-texto-secundario">Stock actual</label><input id="nuevo-stock" required type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario placeholder:text-texto-apagado" /></div></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><label htmlFor="nuevo-minimo" className="text-xs font-medium text-texto-secundario">Stock mínimo</label><input id="nuevo-minimo" required type="number" min="0" step="0.001" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="0" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario placeholder:text-texto-apagado" /></div><div className="space-y-1.5"><label htmlFor="nuevo-costo" className="text-xs font-medium text-texto-secundario">Costo unitario</label><input id="nuevo-costo" type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario placeholder:text-texto-apagado" /></div></div>
      {['unidad', 'docena', 'caja', 'bandeja', 'porcion'].includes(unidad) && <div className="space-y-1.5"><label htmlFor="nuevo-peso" className="text-xs font-medium text-texto-secundario">Peso de una unidad (gramos)</label><input id="nuevo-peso" required type="number" min="0.001" step="0.001" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ejemplo: 100" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario placeholder:text-texto-apagado" /></div>}
      {error && <p className="text-xs text-peligro-texto" role="alert">{error}</p>}
      <button disabled={guardando} className="w-full min-h-12 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={18} />{guardando ? 'Guardando…' : 'Crear producto'}</button>
    </form>
  </div>
}
