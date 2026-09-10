'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImportarVentasCliente() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviar = async (evento: React.FormEvent) => { evento.preventDefault(); if (!archivo) return; setEnviando(true); setMensaje(null); const form = new FormData(); form.set('archivo', archivo); const response = await fetch('/api/ventas/importaciones', { method: 'POST', body: form }); const json = await response.json() as { error?: string }; setMensaje(response.ok ? 'Importación creada. Revisa las coincidencias pendientes.' : (json.error ?? 'No se pudo importar.')); setEnviando(false) }
  return <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto"><Link href="/ventas" className="text-xs text-texto-apagado">← Ventas</Link><section><h1 className="text-xl font-display font-bold text-texto-primario">Importar ventas</h1><p className="text-xs text-texto-apagado mt-1">CSV con columnas nombre, cantidad y precio opcional.</p></section><form onSubmit={enviar} className="tarjeta p-4 space-y-4"><input type="file" accept=".csv,text/csv" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-sm text-texto-secundario" required /><button className="btn-primario" disabled={!archivo || enviando}>{enviando ? 'Importando…' : 'Procesar CSV'}</button>{mensaje && <p className="text-xs text-texto-secundario" role="status">{mensaje}</p>}</form></div>
}
