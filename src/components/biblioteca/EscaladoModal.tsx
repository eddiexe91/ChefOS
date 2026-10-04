'use client'

import { useState } from 'react'

interface IngredienteEscalado {
  nombre: string
  cantidad: number
  unidad_medida: string
}

export default function EscaladoModal({ recetaId }: { recetaId: string }) {
  const [factor, setFactor] = useState('2')
  const [rendimiento, setRendimiento] = useState('')
  const [resultado, setResultado] = useState<IngredienteEscalado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const escalar = async () => {
    const objetivo = Number(factor)
    if (!Number.isFinite(objetivo) || objetivo <= 0 || objetivo > 1000) return setError('Indica un factor mayor que 0 y hasta 1000 (por ejemplo 0.5 o 2).')
    setCargando(true)
    setError(null)
    try {
      const response = await fetch(`/api/biblioteca/recetas/${recetaId}/escalar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factor: objetivo }) })
      const json = await response.json() as { data?: IngredienteEscalado[]; error?: string; rendimiento: number; unidad: string }
      if (!response.ok) throw new Error(json.error ?? 'No se pudo escalar la receta.')
      setResultado(json.data ?? [])
      setRendimiento(`Receta ×${objetivo}: rendimiento ${json.rendimiento} ${json.unidad}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo escalar la receta.')
    } finally { setCargando(false) }
  }

  return (
    <section className="tarjeta p-4 space-y-3">
      <h2 className="seccion-titulo">Escalar receta</h2>
      <p className="text-sm text-texto-secundario">Multiplica la receta completa. ×0,5 es media receta; ×2 son dos recetas. No modifica la ficha ni descuenta stock.</p>
      <div className="flex gap-2">{[0.5,1,2,3].map(n => <button type="button" key={n} onClick={() => { setFactor(String(n)); setResultado([]); setRendimiento('') }} className="btn-secundario px-3 min-h-11">×{n}</button>)}</div>
      <div className="flex gap-2">
        <label className="flex-1 text-sm">Veces la receta<input type="number" min="0.01" step="any" inputMode="decimal" value={factor} onChange={(e) => { setFactor(e.target.value); setResultado([]); setRendimiento('') }} className="campo-input" /></label>
        <button type="button" onClick={escalar} disabled={cargando} className="btn-secundario px-4 whitespace-nowrap">{cargando ? 'Calculando…' : 'Calcular'}</button>
      </div>
      {error && <p className="text-xs text-peligro-texto">{error}</p>}
      {rendimiento && <p role="status" className="text-sm text-acento">{rendimiento}</p>}
      {resultado.length > 0 && <div className="space-y-2">{resultado.map((item) => <div key={`${item.nombre}-${item.unidad_medida}`} className="flex justify-between text-sm"><span className="text-texto-secundario">{item.nombre}</span><span className="text-texto-primario">{Number(item.cantidad.toFixed(3))} {item.unidad_medida}</span></div>)}</div>}
    </section>
  )
}
