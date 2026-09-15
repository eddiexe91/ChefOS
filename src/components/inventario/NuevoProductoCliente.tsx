'use client'

import ProductoEditorSheet from '@/components/inventario/ProductoEditorSheet'
import type { TipoOperativoProducto } from '@/types'

interface Props {
  onClose: () => void
  tiposDisponibles?: TipoOperativoProducto[]
  tipoDefault?: TipoOperativoProducto
}

export default function NuevoProductoCliente(props: Props) {
  return <ProductoEditorSheet modo="crear" {...props} />
}
