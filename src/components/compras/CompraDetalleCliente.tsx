'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useCompra } from '@/hooks/useDominio'
import { useQueryClient } from '@tanstack/react-query'
import { comprasKeys, inventarioKeys } from '@/lib/queries'

const ETIQUETAS: Record<string, string> = { borrador: 'Borrador', confirmada: 'Confirmada', recibida: 'Recibida', anulada: 'Anulada' }

export default function CompraDetalleCliente({ compraId }: { compraId: string }) {
  const { data: compra, isPending, isError } = useCompra(compraId)
  const queryClient = useQueryClient()
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  if (isPending) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto"><div className="skeleton h-6 w-2/3" /></div>
  if (isError || !compra) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-3"><Link href="/compras" className="text-xs text-acento">← Compras</Link><p className="text-sm text-peligro-texto">No se pudo cargar la compra.</p></div>
  async function recibir() {
    setProcesando(true); setMensaje('')
    try { const respuesta = await fetch(`/api/compras/${compraId}/recibir`, { method: 'POST' }); const data = await respuesta.json() as { error?: string }; if (!respuesta.ok) throw new Error(data.error ?? 'No se pudo recibir la compra.'); setMensaje('Compra recibida e inventario actualizado.'); await queryClient.invalidateQueries({ queryKey: comprasKeys.all }); await queryClient.invalidateQueries({ queryKey: inventarioKeys.all }) } catch (error) { setMensaje(error instanceof Error ? error.message : 'No se pudo recibir la compra.') } finally { setProcesando(false) }
  }
  return <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto"><Link href="/compras" className="inline-flex items-center gap-2 text-xs text-texto-apagado"><ArrowLeft size={15} /> Compras</Link><section><div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-display font-bold text-texto-primario">Detalle de compra</h1><p className="text-xs text-texto-apagado mt-1">{compra.proveedor?.nombre ?? 'Sin proveedor'} · {compra.fecha_compra}</p></div><span className="badge-acento">{ETIQUETAS[compra.estado] ?? compra.estado}</span></div>{compra.numero_factura && <p className="text-xs text-texto-apagado mt-2">Factura {compra.numero_factura}</p>}</section><section className="space-y-3"><h2 className="seccion-titulo">Productos</h2>{(compra.items ?? []).map((item) => <div key={item.id} className="tarjeta p-3 flex items-center justify-between gap-3"><div><p className="text-sm text-texto-primario">{item.producto?.nombre ?? 'Producto'}</p><p className="text-xs text-texto-apagado mt-1">{item.cantidad} {item.unidad_medida} · ${Number(item.precio_unitario).toLocaleString('es-CL')}</p></div><strong className="font-mono text-sm text-texto-primario">${Number(item.precio_total).toLocaleString('es-CL')}</strong></div>)}</section><div className="tarjeta p-4 flex items-center justify-between"><span className="text-sm text-texto-secundario">Total</span><strong className="font-mono text-lg text-texto-primario">${Number(compra.total_compra).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</strong></div>{compra.estado !== 'recibida' && compra.estado !== 'anulada' && <button type="button" onClick={() => void recibir()} disabled={procesando} className="btn-primario flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={17} />{procesando ? 'Actualizando…' : 'Marcar como recibida'}</button>}{mensaje && <p className={mensaje.includes('actualizado') ? 'text-sm text-exito-texto' : 'text-sm text-peligro-texto'} role="status">{mensaje}</p>}</div>
}
