'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useProductos } from '@/hooks/useDominio'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import type { Producto, Proveedor, UnidadEntrada } from '@/types'

type Fila = { key: string; producto_id: string; cantidad: string; unidad_medida: string; precio_unitario: string }

const UNIDADES: UnidadEntrada[] = ['g', 'kg', 'ml', 'lt', 'unidad', 'docena', 'caja', 'bandeja', 'porcion']
const nuevaFila = (): Fila => ({ key: crypto.randomUUID(), producto_id: '', cantidad: '', unidad_medida: 'g', precio_unitario: '' })

export default function NuevaCompraCliente() {
  const { data: productos = [], isPending: cargandoProductos } = useProductos()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [factura, setFactura] = useState('')
  const [notas, setNotas] = useState('')
  const [filas, setFilas] = useState<Fila[]>([nuevaFila()])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let activo = true
    void obtenerClienteNavegador().from('proveedores').select('*').eq('activo', true).order('nombre').then(({ data }) => { if (activo) setProveedores((data ?? []) as Proveedor[]) })
    return () => { activo = false }
  }, [])

  const total = useMemo(() => filas.reduce((suma, fila) => suma + (Number(fila.cantidad) || 0) * (Number(fila.precio_unitario) || 0), 0), [filas])
  const actualizar = (key: string, campo: keyof Fila, valor: string) => setFilas((actuales) => actuales.map((fila) => fila.key === key ? { ...fila, [campo]: valor } : fila))
  const seleccionarProducto = (key: string, id: string) => { const producto = productos.find((item) => item.id === id); setFilas((actuales) => actuales.map((fila) => fila.key === key ? { ...fila, producto_id: id, unidad_medida: producto?.unidad_compra ?? producto?.unidad_medida ?? 'g' } : fila)) }

  async function guardar() {
    setMensaje('')
    const items = filas.map((fila) => ({ producto_id: fila.producto_id, cantidad: Number(fila.cantidad), unidad_medida: fila.unidad_medida, precio_unitario: Number(fila.precio_unitario) })).filter((fila) => fila.producto_id && fila.cantidad > 0)
    if (!items.length || items.length !== filas.length) { setMensaje('Completa todos los productos, cantidades y precios.'); return }
    setGuardando(true)
    try {
      const respuesta = await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proveedor_id: proveedorId || null, fecha_compra: fecha, numero_factura: factura || null, notas: notas || null, items }) })
      const data = await respuesta.json() as { data?: { id: string }; error?: string }
      if (!respuesta.ok || !data.data?.id) throw new Error(data.error ?? 'No se pudo guardar la compra.')
      window.location.assign(`/compras/${data.data.id}`)
    } catch (error) { setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la compra.') } finally { setGuardando(false) }
  }

  return <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto"><Link href="/compras" className="inline-flex items-center gap-2 text-xs text-texto-apagado"><ArrowLeft size={15} /> Compras</Link><section><h1 className="text-xl font-display font-bold text-texto-primario">Nueva compra</h1><p className="text-xs text-texto-apagado mt-1">Registra la recepción y actualiza el inventario al recibirla.</p></section><div className="space-y-3"><label className="campo-label">Proveedor<select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="campo-input mt-1"><option value="">Sin proveedor</option>{proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="campo-label">Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo-input mt-1" /></label><label className="campo-label">Factura<input value={factura} onChange={(e) => setFactura(e.target.value)} className="campo-input mt-1" placeholder="Opcional" /></label></div></div><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="seccion-titulo">Productos</h2><button type="button" onClick={() => setFilas((actuales) => [...actuales, nuevaFila()])} className="inline-flex items-center gap-1 text-xs text-acento"><Plus size={15} /> Agregar</button></div>{filas.map((fila) => <div key={fila.key} className="tarjeta p-3 space-y-2"><div className="flex gap-2"><select value={fila.producto_id} onChange={(e) => seleccionarProducto(fila.key, e.target.value)} className="campo-input flex-1"><option value="">{cargandoProductos ? 'Cargando…' : 'Seleccionar producto'}</option>{productos.map((producto: Producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select>{filas.length > 1 && <button type="button" onClick={() => setFilas((actuales) => actuales.filter((item) => item.key !== fila.key))} className="btn-icono" aria-label="Eliminar producto"><Trash2 size={16} /></button>}</div><div className="grid grid-cols-3 gap-2"><input type="number" min="0" step="0.001" value={fila.cantidad} onChange={(e) => actualizar(fila.key, 'cantidad', e.target.value)} className="campo-input" placeholder="Cantidad" /><select value={fila.unidad_medida} onChange={(e) => actualizar(fila.key, 'unidad_medida', e.target.value)} className="campo-input">{UNIDADES.map((unidad) => <option key={unidad}>{unidad}</option>)}</select><input type="number" min="0" step="0.01" value={fila.precio_unitario} onChange={(e) => actualizar(fila.key, 'precio_unitario', e.target.value)} className="campo-input" placeholder="Precio" /></div></div>)}</section><label className="campo-label">Notas<textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="campo-input mt-1 min-h-20" placeholder="Observaciones opcionales" /></label><div className="flex items-center justify-between tarjeta p-4"><span className="text-sm text-texto-secundario">Total</span><strong className="font-mono text-texto-primario">${total.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</strong></div>{mensaje && <p className="text-sm text-peligro-texto">{mensaje}</p>}<button type="button" onClick={() => void guardar()} disabled={guardando} className="btn-primario disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar compra'}</button></div>
}
