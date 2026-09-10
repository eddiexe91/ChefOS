'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useReceta } from '@/hooks/useDominio'
import EscaladoModal from '@/components/biblioteca/EscaladoModal'

function dinero(valor?: number) {
  if (valor == null) return 'No disponible'
  return `$${valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RecetaDetalleCliente({ recetaId }: { recetaId: string }) {
  const { data: receta, isPending, isError } = useReceta(recetaId)

  if (isPending) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto"><div className="skeleton h-6 w-2/3" /></div>
  if (isError || !receta) {
    return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-3"><Link href="/biblioteca" className="text-xs text-acento">← Volver a biblioteca</Link><p className="text-sm text-peligro-texto">No se pudo cargar la receta.</p></div>
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">
      <Link href="/biblioteca" className="inline-flex items-center gap-2 text-xs text-texto-apagado"><ArrowLeft size={15} /> Biblioteca</Link>
      <section>
        <div className="flex items-start justify-between gap-3"><h1 className="text-xl font-display font-bold text-texto-primario">{receta.nombre}</h1><Link href={`/biblioteca/${receta.id}/editar`} className="text-xs text-acento">Editar</Link></div>
        <p className="text-xs text-texto-apagado mt-1">{receta.categoria?.nombre ?? 'Sin categoría'}</p>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="tarjeta p-3"><p className="text-2xs text-texto-apagado">Rendimiento</p><p className="text-sm text-texto-primario mt-1">{receta.rendimiento_porciones} {receta.unidad_rendimiento}</p></div>
        <div className="tarjeta p-3"><p className="text-2xs text-texto-apagado">Costo por porción</p><p className="text-sm text-texto-primario mt-1">{dinero(receta.costo_porcion)}</p></div>
      </section>
      {receta.descripcion && <p className="text-sm leading-relaxed text-texto-secundario">{receta.descripcion}</p>}
      <EscaladoModal recetaId={receta.id} />
      <section className="space-y-3">
        <h2 className="seccion-titulo">Ingredientes</h2>
        {receta.ingredientes?.length ? receta.ingredientes.map((ingrediente) => (
          <div key={ingrediente.id} className="flex items-center justify-between gap-3 border-b border-fondo-borde pb-2 text-sm">
            <span className="text-texto-secundario">{ingrediente.producto?.nombre ?? 'Ingrediente'}</span>
            <span className="text-texto-primario">{ingrediente.cantidad} {ingrediente.unidad_medida}</span>
          </div>
        )) : <p className="text-sm text-texto-apagado">No hay ingredientes registrados.</p>}
      </section>
    </div>
  )
}
