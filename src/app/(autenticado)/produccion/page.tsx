import LoteDetalleCliente from '@/components/produccion/LoteDetalleCliente'

interface Props {
  params: { loteId: string }
}

export default function PaginaLoteProduccion({ params }: Props) {
  return <LoteDetalleCliente loteId={params.loteId} />
}
