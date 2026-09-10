'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Importacion { id: string; fecha_inicio: string; fecha_fin: string; estado_procesamiento: string; total_registros: number; registros_pendientes: number }

export default function VentasCliente() {
  const [importaciones, setImportaciones] = useState<Importacion[]>([])
  const [cargando, setCargando] = useState(true)
  useEffect(() => { fetch('/api/ventas/importaciones').then((r) => r.json()).then((j: { data?: Importacion[] }) => setImportaciones(j.data ?? [])).finally(() => setCargando(false)) }, [])
  return <div className="px-4 pt-6 pb-28 space-y-5 max-w-lg mx-auto"><section className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-display font-bold text-texto-primario">Ventas</h1><p className="text-xs text-texto-apagado mt-1">Importaciones y descuento de inventario.</p></div><Link href="/ventas/importar" className="btn-primario !w-auto px-4 flex items-center">Importar</Link></section>{cargando && <div className="skeleton h-20 rounded-xl" />}{!cargando && importaciones.length === 0 && <p className="text-sm text-texto-apagado text-center py-10">No hay importaciones.</p>}<div className="space-y-3">{importaciones.map((item) => <Link href={`/ventas/${item.id}`} key={item.id} className="block"><article className="tarjeta p-4"><div className="flex justify-between gap-3"><div><p className="text-sm text-texto-primario">{item.fecha_inicio} — {item.fecha_fin}</p><p className="text-xs text-texto-apagado mt-1">{item.total_registros} registros · {item.registros_pendientes} por revisar</p></div><span className="badge-acento">{item.estado_procesamiento}</span></div><p className="text-xs text-acento mt-3">Abrir revisión →</p></article></Link>)}</div></div>
}
