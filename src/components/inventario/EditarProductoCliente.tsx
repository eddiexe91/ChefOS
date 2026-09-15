'use client'

import ProductoEditorSheet from '@/components/inventario/ProductoEditorSheet'
import type { Producto, TipoOperativoProducto } from '@/types'

interface Props {
  producto: Producto
  onClose: () => void
  tiposDisponibles?: TipoOperativoProducto[]
}

export default function EditarProductoCliente(props: Props) {
  return <ProductoEditorSheet modo="editar" {...props} />
}
