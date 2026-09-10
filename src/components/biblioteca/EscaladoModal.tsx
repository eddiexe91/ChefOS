'use client'

import { useState } from 'react'

interface IngredienteEscalado {
  nombre: string
  cantidad: number
  unidad_medida: string
}

export default function EscaladoModal({ recetaId }: { recetaId: string }) {
  const [porciones, setPorciones] = useState('')
  const [resultado, setResultado] = useState<IngredienteEscalado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const escalar = async () => {
    const objetivo = Number(porciones)
    if (!Number.isInteger(objetivo) || objetivo <= 0) return setError('Indica un número entero positivo.')
    setCargando(true)
    setError(null)
    try {
      const response = await fetch(`/api/biblioteca/recetas/${recetaId}/escalar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ porciones_objetivo: objetivo }) })
      const json = await response.json() as { data?: IngredienteEscalado[]; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'No se pudo escalar la receta.')
      setResultado(json.data ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo escalar la receta.')
    } finally { setCargando(false) }
  }

  return (
    <section className="tarjeta p-4 space-y-3">
      <h2 className="seccion-titulo">Escalar receta</h2>
      <div className="flex gap-2">
        <input type="number" min="1" step="1" inputMode="numeric" value={porciones} onChange={(e) => setPorciones(e.target.value)} placeholder="Porciones" className="campo-input" />
        <button type="button" onClick={escalar} disabled={cargando} className="btn-secundario px-4 whitespace-nowrap">{cargando ? 'Calculando…' : 'Calcular'}</button>
      </div>
      {error && <p className="text-xs text-peligro-texto">{error}</p>}
      {resultado.length > 0 && <div className="space-y-2">{resultado.map((item) => <div key={`${item.nombre}-${item.unidad_medida}`} className="flex justify-between text-sm"><span className="text-texto-secundario">{item.nombre}</span><span className="text-texto-primario">{Number(item.cantidad.toFixed(3))} {item.unidad_medida}</span></div>)}</div>}
    </section>
  )
}
