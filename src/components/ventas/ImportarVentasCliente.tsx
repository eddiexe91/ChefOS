'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImportarVentasCliente() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [importacion, setImportacion] = useState('')
  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault(); if (!archivo || enviando || importacion) return
    setEnviando(true); setMensaje(null)
    try {
      const form = new FormData(); form.set('archivo', archivo)
      const response = await fetch('/api/ventas/importaciones', { method: 'POST', body: form })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'No se pudo importar.')
      setImportacion(json.data.id)
      setMensaje('CSV recibido. Abre la revisión antes de confirmar el consumo.')
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo verificar la importación. Consulta Ventas antes de repetir.') }
    finally { setEnviando(false) }
  }
  return <div className="space-y-4"><section><h1 className="text-xl font-display font-bold text-texto-primario">Ventas del servicio · CSV simple</h1><p className="text-xs text-texto-apagado mt-1">CSV con columnas nombre, cantidad y precio opcional.</p></section><form onSubmit={enviar} className="tarjeta p-4 space-y-4"><input type="file" accept="*/*" disabled={enviando || !!importacion} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-sm text-texto-secundario" required /><button className="btn-primario" disabled={!archivo || enviando || !!importacion}>{enviando ? 'Importando…' : 'Procesar CSV'}</button>{mensaje && <p className="text-xs text-texto-secundario" role="status">{mensaje}</p>}</form>{importacion && <Link className="btn-primario block" href={`/ventas/${importacion}`}>Revisar esta venta y confirmar consumo →</Link>}</div>
}
