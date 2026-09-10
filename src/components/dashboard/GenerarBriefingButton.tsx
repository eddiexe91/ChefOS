'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function GenerarBriefingButton() {
  const [cargando, setCargando] = useState(false)
  async function generar() {
    setCargando(true)
    await fetch('/api/ia/briefing', { method: 'POST' })
    window.location.reload()
  }
  return <button onClick={() => void generar()} disabled={cargando} className="text-xs text-acento flex items-center gap-1 disabled:opacity-50"><RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />{cargando ? 'Generando…' : 'Actualizar briefing'}</button>
}
