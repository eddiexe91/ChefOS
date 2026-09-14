'use client'

import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { inventarioKeys } from '@/lib/queries'

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
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    const response = await fetch('/api/inventario/productos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, unidad_medida: unidad, stock, stock_minimo: minimo, costo_unitario: costo, peso_unitario_gramos: peso || undefined }),
    })
    const data = await response.json() as { error?: string }
    setGuardando(false)
    if (!response.ok) { setError(data.error ?? 'No se pudo crear el producto.'); return }
    await queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
    onClose()
  }

  return <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Nuevo producto">
    <form onSubmit={guardar} className="w-full max-w-lg rounded-t-2xl bg-fondo-elevado p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-acento">Inventario</p><h2 className="text-lg font-display font-bold text-texto-primario">Nuevo producto</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} className="text-texto-apagado" /></button></div>
      <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre, por ejemplo: Tomate" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" />
      <div className="grid grid-cols-2 gap-3"><select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario">{UNIDADES.map((item) => <option key={item}>{item}</option>)}</select><input required type="number" min="0" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock actual" className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" /></div>
      <div className="grid grid-cols-2 gap-3"><input required type="number" min="0" step="0.001" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Stock mínimo" className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" /><input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="Costo unitario" className="min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" /></div>
      {['unidad', 'docena', 'caja', 'bandeja', 'porcion'].includes(unidad) && <input required type="number" min="0.001" step="0.001" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Peso de una unidad en gramos" className="w-full min-h-11 rounded-xl border border-fondo-borde bg-fondo-card px-3 text-sm text-texto-primario" />}
      {error && <p className="text-xs text-peligro-texto" role="alert">{error}</p>}
      <button disabled={guardando} className="w-full min-h-12 rounded-xl bg-acento text-white flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={18} />{guardando ? 'Guardando…' : 'Crear producto'}</button>
    </form>
  </div>
}
