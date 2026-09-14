'use client'

import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X } from 'lucide-react'
import { inventarioKeys } from '@/lib/queries'
import { useCategoriasProducto } from '@/hooks/useDominio'
import type { CategoriaProducto, Producto } from '@/types'

const UNIDADES = ['g', 'kg', 'ml', 'lt', 'unidad', 'docena', 'caja', 'bandeja', 'porcion']

export default function EditarProductoCliente({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const qc = useQueryClient()
  const categorias = useCategoriasProducto()
  const [nombre, setNombre] = useState(producto.nombre)
  const [categoriaId, setCategoriaId] = useState(producto.categoria_id ?? '')
  const [unidad, setUnidad] = useState(producto.unidad_medida)
  const [stock, setStock] = useState(String(producto.stock_actual))
  const [minimo, setMinimo] = useState(String(producto.stock_minimo))
  const [costo, setCosto] = useState(String(producto.costo_unitario_actual))
  const [peso, setPeso] = useState(producto.peso_unitario_gramos ? String(producto.peso_unitario_gramos) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    const r = await fetch(`/api/inventario/productos/${producto.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, categoria_id: categoriaId || undefined, unidad_medida: unidad, stock, stock_minimo: minimo, costo_unitario: costo, peso_unitario_gramos: peso || undefined }) })
    const d = await r.json() as { error?: string }
    if (!r.ok) { setError(d.error ?? 'No se pudo guardar'); setBusy(false); return }
    await qc.invalidateQueries({ queryKey: inventarioKeys.all }); await qc.invalidateQueries({ queryKey: ['actividad-operativa'] }); onClose()
  }

  async function eliminar() {
    if (!window.confirm(`¿Archivar ${producto.nombre}?`)) return
    setBusy(true)
    const r = await fetch(`/api/inventario/productos/${producto.id}`, { method: 'DELETE' })
    if (!r.ok) { setError('No se pudo archivar'); setBusy(false); return }
    await qc.invalidateQueries({ queryKey: inventarioKeys.all }); await qc.invalidateQueries({ queryKey: ['actividad-operativa'] }); onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center pb-[calc(64px+env(safe-area-inset-bottom))]" role="dialog" aria-modal="true">
      <form onSubmit={guardar} className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-2xl bg-fondo-elevado p-5 space-y-4">
        <div className="flex justify-between"><div><p className="text-xs uppercase tracking-wide text-acento">Inventario</p><h2 className="text-lg font-display font-bold text-texto-primario">Editar producto</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <input required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm" />
        <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm"><option value="">Sin categoría</option>{(categorias.data ?? []).map((categoria: CategoriaProducto) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><select value={unidad} onChange={e => setUnidad(e.target.value)} className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm">{UNIDADES.map(u => <option key={u}>{u}</option>)}</select><input required type="number" min="0" step="0.001" value={stock} onChange={e => setStock(e.target.value)} className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3"><input required type="number" min="0" step="0.001" value={minimo} onChange={e => setMinimo(e.target.value)} className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm" /><input type="number" min="0" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} placeholder="Costo unitario" className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm" /></div>
        {['unidad', 'docena', 'caja', 'bandeja', 'porcion'].includes(unidad) && <input required type="number" min="0.001" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Peso unitario en gramos" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm" />}
        {error && <p className="text-xs text-peligro-texto">{error}</p>}
        <div className="flex gap-2"><button type="button" onClick={eliminar} disabled={busy} className="min-h-12 px-4 rounded-xl border border-peligro text-peligro flex items-center gap-2"><Trash2 size={16} />Archivar</button><button disabled={busy} className="flex-1 min-h-12 rounded-xl bg-acento text-white flex justify-center gap-2 items-center"><Pencil size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </div>
  )
}
