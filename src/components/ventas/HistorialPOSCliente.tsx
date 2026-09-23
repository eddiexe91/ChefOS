'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ARCHIVOS_POS, filasArchivo, normalizarSoftRestaurant, validarCabecera, type ArchivoPOS, type FilaCSV } from '@/lib/ventas/softRestaurant'

async function enviar(body: object) {
  const response = await fetch('/api/ventas/historial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await response.json()
  if (!response.ok) throw new Error(j.error ?? 'No se pudo procesar. Reintenta sin cambiar los archivos.')
  return j.data
}
export default function HistorialPOSCliente() {
  const [archivos, setArchivos] = useState<Partial<Record<ArchivoPOS, File>>>({})
  const [encoding, setEncoding] = useState('utf-8')
  const [id, setId] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [estado, setEstado] = useState('')
  const [resumen, setResumen] = useState<Record<string, unknown> | null>(null)
  const [completado, setCompletado] = useState(false)
  const [habilitado, setHabilitado] = useState(false)
  const [avisoEsquema, setAvisoEsquema] = useState('Comprobando disponibilidad del historial…')
  useEffect(() => { fetch('/api/health').then(r => r.json()).then(j => {
    const listo = j.historialPos?.disponible === true
    setHabilitado(listo)
    setAvisoEsquema(listo ? '' : 'Historial pendiente de activar en Supabase (migraciones 013 y 014). No importes todavía estos archivos. Tu inventario existente se conserva.')
  }).catch(() => setAvisoEsquema('No se pudo verificar el historial. Comprueba internet y vuelve a abrir esta pantalla.')) }, [])
  async function preparar() {
    setOcupado(true); setEstado('Preparando archivos…'); setResumen(null)
    try {
      const actual = id ?? await enviar({ accion: 'iniciar' }); setId(actual)
      const manifiesto: Record<string, number> = {}
      for (const tipo of ARCHIVOS_POS) {
        const file = archivos[tipo]
        if (!file) throw new Error(`Selecciona ${tipo}.csv`)
        if (file.size > 100 * 1024 * 1024) throw new Error('Límite por archivo: 100 MB. Divide la exportación por períodos completos.')
        let inicio = 0, filas: { campos: FilaCSV; ocurrencia: number }[] = []
        const pagos = new Map<string, number>()
        for await (const campos of filasArchivo(file, encoding)) {
          validarCabecera(tipo, Object.keys(campos))
          const clave = normalizarSoftRestaurant(tipo, campos).clave
          const ocurrencia = tipo === 'pagos' ? (pagos.get(clave) ?? 0) + 1 : 1
          if (tipo === 'pagos') pagos.set(clave, ocurrencia)
          filas.push({ campos, ocurrencia })
          if (filas.length === 250) {
            await enviar({ accion: 'bloque', id: actual, tipo, inicio, filas }); inicio += filas.length; filas = []
            setEstado(`${tipo}: ${inicio.toLocaleString()} registros preparados. Todavía no son ventas publicadas.`)
          }
        }
        if (filas.length) await enviar({ accion: 'bloque', id: actual, tipo, inicio, filas })
        manifiesto[tipo] = inicio + filas.length
      }
      setResumen(await enviar({ accion: 'validar', id: actual, manifiesto }))
      setEstado('Validación terminada. Revisa el resultado antes de confirmar.')
    } catch (e) { setEstado(e instanceof Error ? e.message : 'Error al preparar.') }
    finally { setOcupado(false) }
  }
  async function confirmar() {
    setOcupado(true)
    try { setResumen(await enviar({ accion: 'confirmar', id })); setCompletado(true); setEstado('Historial importado. No se descontó inventario. Revisa los productos pendientes de mapear.') }
    catch (e) { setEstado(e instanceof Error ? e.message : 'Error: puedes reintentar la confirmación.') }
    finally { setOcupado(false) }
  }
  return <section className="tarjeta p-4 space-y-4 text-texto-primario">
    <h2 className="text-lg font-bold">Historial de Soft Restaurant 8.1</h2>
    {avisoEsquema && <p role="alert" className="text-sm text-advertencia">{avisoEsquema}</p>}
    <p className="text-sm text-texto-secundario">Cuatro CSV del mismo período y restaurante. Solo análisis histórico: no modifica existencias. Las fechas se interpretan en la zona horaria del restaurante.</p>
    <p className="text-xs text-texto-secundario">Fechas admitidas: AAAA-MM-DD o DD/MM/AAAA. No se interpreta MM/DD/AAAA. Revisa las fechas de la vista previa.</p>
    <label className="block">Codificación<select className="campo-input" disabled={ocupado || !!id} value={encoding} onChange={e => setEncoding(e.target.value)}><option value="utf-8">UTF-8</option><option value="windows-1252">Windows-1252</option></select></label>
    {ARCHIVOS_POS.map(tipo => <label key={tipo} className="block text-sm">{tipo}.csv<input className="block w-full mt-2 text-texto-primario" type="file" accept=".csv" disabled={ocupado || !!id} onChange={e => setArchivos(a => ({ ...a, [tipo]: e.target.files?.[0] }))} /></label>)}
    <button className="btn-primario w-full" disabled={!habilitado || ocupado || completado || ARCHIVOS_POS.some(t => !archivos[t])} onClick={preparar}>{ocupado ? 'Procesando…' : id ? 'Reintentar validación' : 'Validar y ver vista previa'}</button>
    {resumen && <dl className="text-sm space-y-2">{Object.entries(resumen).map(([k, v]) => <div key={k}><dt className="text-texto-secundario">{k.replaceAll('_', ' ')}</dt><dd className="break-words">{Array.isArray(v) ? <ul className="space-y-2">{v.map((fila, i) => <li key={i} className="border border-fondo-borde rounded p-2">{Object.entries(fila).map(([n, c]) => `${n}: ${c}`).join(' · ')}</li>)}</ul> : v && typeof v === 'object' ? Object.entries(v as Record<string, number>).map(([n, c]) => `${n}: ${c}`).join(' · ') : String(v ?? 'Sin datos')}</dd></div>)}</dl>}
    {Number(resumen?.tickets_con_diferencia_pagos) > 0 && <p className="text-advertencia text-sm">Hay diferencias entre pagos y totales oficiales. Revisa propinas, moneda y tipo de cambio antes de confirmar; ChefOS no ajustará las cabeceras.</p>}
    {resumen && !completado && <button className="btn-primario w-full" disabled={ocupado || Number(resumen.errores) !== 0} onClick={confirmar}>Confirmar importación histórica</button>}
    <p role="status" aria-live="polite" className="text-sm break-words">{estado}</p>
    {id && <p className="text-xs text-texto-secundario">Importación: {id}. Si se corta la conexión, reintenta con los mismos archivos. Si cambias archivos, inicia otra preparación.</p>}
    {id && <button className="text-acento min-h-12" disabled={ocupado} onClick={() => { setId(null); setResumen(null); setCompletado(false); setEstado('La preparación anterior permanece registrada, sin cambios en ventas si no fue confirmada.') }}>Preparar otro paquete</button>}
    <Link href="/ventas/mapeos" className="block text-acento min-h-12">Revisar equivalencias de productos POS →</Link>
    <Link href="/ventas/analitica" className="block text-acento min-h-12">Consultar memoria de ventas →</Link>
  </section>
}
