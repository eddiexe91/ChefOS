'use client'

import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { dashboardKeys } from '@/lib/queries'
import { RefreshCw } from 'lucide-react'

export default function GenerarBriefingButton() {
  const client = useQueryClient()
  const cargando = useIsFetching({ queryKey: [...dashboardKeys.all, 'operativo-actual'] }) > 0
  async function generar() {
    await client.invalidateQueries({ queryKey: dashboardKeys.all })
  }
  return <button onClick={() => void generar()} disabled={cargando} className="text-xs text-acento flex items-center gap-1 disabled:opacity-50"><RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />{cargando ? 'Generando…' : 'Actualizar briefing'}</button>
}
