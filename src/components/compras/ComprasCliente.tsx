'use client'

import { useCompras } from '@/hooks/useDominio'
import type { Compra } from '@/types'
import Link from 'next/link'

const ETIQUETAS: Record<Compra['estado'], string> = { borrador: 'Borrador', confirmada: 'Confirmada', recibida: 'Recibida', anulada: 'Anulada' }

export default function ComprasCliente() {
  const { data: compras = [], isPending, isError } = useCompras()
  return (
    <div className="px-4 pt-6 pb-28 space-y-5 max-w-lg mx-auto">
      <section className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-display font-bold text-texto-primario">Compras</h1><p className="text-xs text-texto-apagado mt-1">Recepciones y costos de proveedores.</p></div><Link href="/compras/nueva" className="btn-primario !w-auto px-4">Nueva</Link></section>
      {isPending && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-20 rounded-xl" />)}</div>}
      {isError && <p className="text-sm text-peligro-texto">No se pudieron cargar las compras.</p>}
      {!isPending && !isError && compras.length === 0 && <p className="text-sm text-texto-apagado text-center py-10">No hay compras registradas.</p>}
      <div className="space-y-3">{compras.map((compra) => <Link href={`/compras/${compra.id}`} key={compra.id} className="block"><article className="tarjeta p-4 space-y-2"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-texto-primario">{compra.proveedor?.nombre ?? 'Compra sin proveedor'}</p><p className="text-xs text-texto-apagado mt-1">{compra.fecha_compra}{compra.numero_factura ? ` · Factura ${compra.numero_factura}` : ''}</p></div><span className="badge-acento">{ETIQUETAS[compra.estado]}</span></div><p className="text-sm font-mono text-texto-primario">${compra.total_compra.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</p></article></Link>)}</div>
    </div>
  )
}
