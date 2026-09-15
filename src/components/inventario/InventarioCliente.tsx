'use client'

import ProductosOperativosCliente from '@/components/inventario/ProductosOperativosCliente'
import { TIPOS_INVENTARIO } from '@/lib/productos'

export default function InventarioCliente() {
  return (
    <ProductosOperativosCliente
      titulo="Materias primas e insumos"
      descripcion="Leche, carnes, pescados crudos, verduras, abarrotes y otros insumos base del restaurante."
      tiposOperativos={TIPOS_INVENTARIO}
      tipoDefault="materia_prima"
    />
  )
}
