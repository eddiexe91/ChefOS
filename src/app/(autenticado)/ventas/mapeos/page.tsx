'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

type POS = { id: string; nombre: string; id_externo: string; productos_pos_mapeos: { estado: string; receta_id: string | null; producto_id: string | null }[] }
type Destino = { id: string; nombre: string; tipo: 'receta' | 'producto' }
export default function MapeosPOS() {
  const [filas, setFilas] = useState<POS[]>([]), [destinos, setDestinos] = useState<Destino[]>([])
  const [pagina, setPagina] = useState(0), [mensaje, setMensaje] = useState(''), [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<Record<string, string>>({}), [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const response = await fetch(`/api/ventas/historial?pagina=${pagina}`), j = await response.json()
        if (!response.ok || j.error) throw new Error(j.error ?? 'Error de carga')
        const db = obtenerClienteNavegador()
        const { data: { user } } = await db.auth.getUser()
        const { data: perfil } = await db.from('usuarios').select('restaurante_id').eq('id', user?.id).single()
        const todos: Destino[] = []
        for (const tabla of ['recetas', 'productos'] as const) {
          for (let desde = 0; ; desde += 500) {
            const { data, error } = await db.from(tabla).select('id,nombre').eq('restaurante_id', perfil?.restaurante_id).eq(tabla === 'recetas' ? 'activa' : 'activo', true).order('id').range(desde, desde + 499)
            if (error) throw new Error(error.message)
            todos.push(...(data ?? []).map(x => ({ ...x, tipo: tabla === 'recetas' ? 'receta' as const : 'producto' as const })))
            if ((data?.length ?? 0) < 500) break
          }
        }
        if (vigente) { setFilas(j.data); setDestinos(todos); setMensaje('') }
      } catch (e) { if (vigente) setMensaje(e instanceof Error ? e.message : 'No se pudo cargar.') }
    }
    cargar(); return () => { vigente = false }
  }, [pagina])
  async function guardar(pos: string, estado: string) {
    setOcupado(true)
    const [tipo, id] = (seleccion[pos] ?? '').split(':')
    try {
      const response = await fetch('/api/ventas/historial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'mapear', pos, estado, receta: estado === 'confirmado' && tipo === 'receta' ? id : null, producto: estado === 'confirmado' && tipo === 'producto' ? id : null }) })
      const j = await response.json(); if (!response.ok) throw new Error(j.error)
      setMensaje('Equivalencia guardada para futuras importaciones. No modifica inventario.')
      setFilas(a => a.map(f => f.id === pos ? { ...f, productos_pos_mapeos: [{ estado, receta_id: tipo === 'receta' ? id : null, producto_id: tipo === 'producto' ? id : null }] } : f))
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar.') }
    finally { setOcupado(false) }
  }
  const opciones = destinos.filter(d => d.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()))
  return <main className="max-w-xl mx-auto px-4 pt-6 pb-32 space-y-4 text-texto-primario">
    <Link className="text-acento" href="/ventas/importar">← Importar ventas</Link><h1 className="text-xl">Equivalencias de productos POS</h1>
    <p className="text-sm">Un producto externo no es automáticamente una receta. Ignorar lo excluye de sugerencias, pero conserva sus ventas y facturación.</p>
    <label className="block">Buscar receta o producto interno<input className="campo-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
    <p role="status">{mensaje}</p>
    {filas.map(f => {
      const exactas = destinos.filter(d => d.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === f.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
      return <section className="tarjeta p-4 space-y-3" key={f.id}><h2>{f.nombre}</h2><p className="text-xs">ID externo: {f.id_externo}. Estado: {f.productos_pos_mapeos?.[0]?.estado ?? 'pendiente'}</p>
        {exactas.length === 1 && <button className="text-acento min-h-12" onClick={() => setSeleccion(s => ({ ...s, [f.id]: `${exactas[0].tipo}:${exactas[0].id}` }))}>Propuesta por nombre exacto: {exactas[0].nombre} (revisar)</button>}
        <select aria-label={`Destino de ${f.nombre}`} className="campo-input" value={seleccion[f.id] ?? ''} onChange={e => setSeleccion(s => ({ ...s, [f.id]: e.target.value }))}><option value="">Selecciona una equivalencia</option>{opciones.map(d => <option key={`${d.tipo}:${d.id}`} value={`${d.tipo}:${d.id}`}>{d.nombre} ({d.tipo})</option>)}</select>
        <button className="btn-primario w-full" disabled={ocupado || !seleccion[f.id]} onClick={() => guardar(f.id, 'confirmado')}>Confirmar equivalencia</button>
        <button className="text-acento min-h-12 mr-4" disabled={ocupado} onClick={() => guardar(f.id, 'ignorado')}>Ignorar para recomendaciones</button><button className="min-h-12" disabled={ocupado} onClick={() => guardar(f.id, 'pendiente')}>Dejar pendiente</button>
      </section>
    })}
    <div className="flex justify-between"><button disabled={!pagina || ocupado} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina + 1}</span><button disabled={filas.length < 100 || ocupado} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div>
  </main>
}
