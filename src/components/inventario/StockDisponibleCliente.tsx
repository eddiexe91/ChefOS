'use client'

import ProductosOperativosCliente from '@/components/inventario/ProductosOperativosCliente'
import { TIPOS_STOCK_DISPONIBLE } from '@/lib/productos'

export default function StockDisponibleCliente() {
  return (
    <ProductosOperativosCliente
      titulo="Stock disponible"
      descripcion="Productos elaborados, porcionados o listos para vender y usar como ingredientes de Carta."
      tiposOperativos={TIPOS_STOCK_DISPONIBLE}
      tipoDefault="elaborado"
    />
  )
}
