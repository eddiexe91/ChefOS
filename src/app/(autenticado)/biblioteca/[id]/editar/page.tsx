import EditarRecetaCliente from '@/components/biblioteca/EditarRecetaCliente'

export default function PaginaEditarReceta({ params }: { params: { id: string } }) {
  return <EditarRecetaCliente recetaId={params.id} />
}
