import ProductoDetalleCliente from '@/components/inventario/ProductoDetalleCliente'

export default function PaginaProductoDetalle({ params }: { params: { id: string } }) {
  return <ProductoDetalleCliente productoId={params.id} />
}
