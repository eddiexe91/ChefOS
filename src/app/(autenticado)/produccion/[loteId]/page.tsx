import LoteDetalleCliente from '@/components/produccion/LoteDetalleCliente'

interface Props {
  params: { loteId: string }
  searchParams?: { receta?: string }
}

export default function PaginaLoteProduccion({ params, searchParams }: Props) {
  return <LoteDetalleCliente loteId={params.loteId} recetaInicialId={searchParams?.receta} />
}
