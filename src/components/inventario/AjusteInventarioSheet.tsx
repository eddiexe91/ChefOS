'use client'

import { X } from 'lucide-react'

import FormAjusteInventario from '@/components/inventario/FormAjusteInventario'
import type { Producto } from '@/types'

export default function AjusteInventarioSheet({
  producto,
  onClose,
}: {
  producto: Producto
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 p-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:p-6 md:pb-6 flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-acento">{producto.tipo_operativo === 'elaborado' ? 'Stock disponible' : 'Inventario'}</p>
            <h2 className="text-lg font-display font-bold text-texto-primario">Ajustar cantidad</h2>
            <p className="text-xs text-texto-apagado mt-1">{producto.nombre} · stock actual {producto.stock_actual} {producto.unidad_display ?? producto.unidad_medida}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="btn-icono"><X size={18} /></button>
        </div>
        <FormAjusteInventario productoId={producto.id} />
      </div>
    </div>
  )
}
