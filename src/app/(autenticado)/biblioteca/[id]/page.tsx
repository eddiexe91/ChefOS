import RecetaDetalleCliente from '@/components/biblioteca/RecetaDetalleCliente'

export default function PaginaReceta({ params }: { params: { id: string } }) {
  return <RecetaDetalleCliente recetaId={params.id} />
}
