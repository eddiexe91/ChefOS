'use client'

import RecetaEditorSheet from '@/components/biblioteca/RecetaEditorSheet'

export default function RecetaForm({ modo = 'receta' }: { modo?: 'receta' | 'carta' }) {
  return <RecetaEditorSheet modo={modo} embebido />
}
