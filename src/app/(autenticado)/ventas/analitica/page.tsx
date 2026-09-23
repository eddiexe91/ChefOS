'use client'
import { useState } from 'react'
import Link from 'next/link'
type Metricas = { tickets: number; facturacion: number | null; ticket_promedio: number | null; cubiertos: number | null; venta_por_persona: number | null; duracion_promedio_min: number | null; productos: { id: string; nombre: string; unidades: number }[] }
export default function AnaliticaVentas() {
  const [desde, setDesde] = useState(''), [hasta, setHasta] = useState(''), [datos, setDatos] = useState<{ actual: Metricas; anterior: Metricas } | null>(null), [mensaje, setMensaje] = useState(''), [ocupado, setOcupado] = useState(false)
  async function consultar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true); setMensaje(''); setDatos(null)
    try { const r = await fetch(`/api/ventas/analitica?desde=${desde}&hasta=${hasta}`), j = await r.json(); if (!r.ok) throw new Error(j.error); setDatos(j.data) }
    catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo consultar.') }
    finally { setOcupado(false) }
  }
  return <main className="max-w-xl mx-auto px-4 pt-6 pb-32 space-y-4 text-texto-primario"><Link href="/ventas/importar" className="text-acento">← Historial POS</Link><h1 className="text-xl">Memoria de ventas</h1><p className="text-sm">Comparación con el período inmediatamente anterior de igual duración. Solo ventas históricas confirmadas. La facturación usa el total oficial de tickets; las líneas conservan su importe estimado.</p>
    <form onSubmit={consultar} className="space-y-3"><label className="block">Desde<input required type="date" className="campo-input" value={desde} onChange={e => setDesde(e.target.value)} /></label><label className="block">Hasta<input required type="date" className="campo-input" value={hasta} onChange={e => setHasta(e.target.value)} /></label><button disabled={ocupado} className="btn-primario w-full">{ocupado ? 'Consultando…' : 'Consultar historial'}</button></form><p role="status">{mensaje}</p>
    {datos && <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Métrica</th><th>Período</th><th>Anterior</th></tr></thead><tbody>{(['tickets','facturacion','ticket_promedio','cubiertos','venta_por_persona','duracion_promedio_min'] as const).map(k => <tr key={k}><th className="p-2 text-left">{k.replaceAll('_',' ')}</th><td>{datos.actual[k] ?? 'Sin datos'}</td><td>{datos.anterior[k] ?? 'Sin datos'}</td></tr>)}</tbody></table></div><h2>Unidades por producto</h2>{datos.actual.productos.map(p => <p key={p.id} className="tarjeta p-3">{p.nombre}: {p.unidades}</p>)}<p className="text-xs">La ausencia de tickets no distingue cierre del local de historial faltante. No comparar como si fuera cobertura completa sin verificarla.</p></>}
  </main>
}
