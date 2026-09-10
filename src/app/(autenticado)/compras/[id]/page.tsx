import CompraDetalleCliente from '@/components/compras/CompraDetalleCliente'

export default function PaginaCompra({ params }: { params: { id: string } }) {
  return <CompraDetalleCliente compraId={params.id} />
}
