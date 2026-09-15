'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import RecetaEditorSheet from '@/components/biblioteca/RecetaEditorSheet'
import { useReceta } from '@/hooks/useDominio'

export default function EditarRecetaCliente({ recetaId }: { recetaId: string }) {
  const { data: receta, isPending, isError } = useReceta(recetaId)

  if (isPending) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto"><div className="skeleton h-6 w-2/3" /></div>
  if (isError || !receta) return <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-3"><Link href="/biblioteca" className="text-xs text-acento">← Biblioteca</Link><p className="text-sm text-peligro-texto">No se pudo cargar la receta.</p></div>

  return (
    <div className="space-y-4">
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <Link href={`/biblioteca/${recetaId}`} className="inline-flex items-center gap-2 text-xs text-texto-apagado"><ArrowLeft size={15} /> Receta</Link>
      </div>
      <RecetaEditorSheet modo="receta" receta={receta} embebido />
    </div>
  )
}
