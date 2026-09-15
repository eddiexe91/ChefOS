'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'

import RecetaEditorSheet from '@/components/biblioteca/RecetaEditorSheet'
import { useReceta, useRecetas } from '@/hooks/useDominio'

export default function BibliotecaCliente() {
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [recetaEditarId, setRecetaEditarId] = useState<string | null>(null)
  const recetasQuery = useRecetas({ es_produccion: true, activa: true })
  const recetaEditarQuery = useReceta(recetaEditarId ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [soloEnCarta, setSoloEnCarta] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState('todas')

  const recetas = useMemo(() => recetasQuery.data ?? [], [recetasQuery.data])
  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const receta of recetas) {
      if (receta.categoria?.id && receta.categoria.nombre) mapa.set(receta.categoria.id, receta.categoria.nombre)
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [recetas])
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return recetas.filter((receta) => {
      if (soloEnCarta && !receta.en_carta) return false
      if (categoriaActiva !== 'todas' && receta.categoria_id !== categoriaActiva) return false
      if (termino && !receta.nombre.toLowerCase().includes(termino)) return false
      return true
    })
  }, [busqueda, categoriaActiva, recetas, soloEnCarta])

  return (
    <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-5">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-texto-primario">Recetas del restaurante</h1>
            <p className="text-xs text-texto-apagado mt-1">Aquí se gestionan las fichas técnicas de producción. Si una receta también va en Carta, seguirá apareciendo aquí.</p>
          </div>
          <button type="button" onClick={() => setMostrarNueva(true)} className="rounded-xl bg-acento px-3 py-2.5 text-xs font-medium text-white inline-flex items-center gap-1.5">
            <Plus size={14} /> Añadir receta
          </button>
        </div>
      </section>

      {recetas.length > 0 ? (
        <section className="space-y-3">
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo-input" placeholder="Buscar receta..." />
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button type="button" onClick={() => setSoloEnCarta((prev) => !prev)} className={`rounded-full border px-3 py-1.5 text-2xs ${soloEnCarta ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>También en carta</button>
            {categorias.map((categoria) => (
              <button key={categoria.id} type="button" onClick={() => setCategoriaActiva((prev) => prev === categoria.id ? 'todas' : categoria.id)} className={`rounded-full border px-3 py-1.5 text-2xs ${categoriaActiva === categoria.id ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>
                {categoria.nombre}
              </button>
            ))}
          </div>
          {(busqueda || categoriaActiva !== 'todas' || soloEnCarta) ? (
            <button type="button" onClick={() => { setBusqueda(''); setCategoriaActiva('todas'); setSoloEnCarta(false) }} className="text-2xs text-acento inline-flex items-center gap-1">
              <X size={11} /> Limpiar filtros
            </button>
          ) : null}
        </section>
      ) : null}

      {recetasQuery.isPending ? <p className="text-sm text-texto-apagado">Cargando recetas…</p> : null}
      {recetasQuery.isError ? <p className="text-sm text-peligro-texto">No se pudieron cargar las recetas.</p> : null}
      {recetasQuery.isSuccess && filtradas.length === 0 ? (
        <section className="rounded-xl border border-fondo-borde bg-fondo-elevado px-4 py-8 text-center">
          <p className="text-sm font-medium text-texto-primario">Sin recetas para mostrar</p>
          <p className="text-xs text-texto-apagado mt-1">Crea una receta de producción o ajusta los filtros.</p>
        </section>
      ) : null}

      {filtradas.length > 0 ? (
        <section className="space-y-3">
          {filtradas.map((receta) => (
            <article key={receta.id} className="rounded-xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-texto-primario">{receta.nombre}</h2>
                  <p className="text-2xs text-texto-apagado mt-1">{receta.categoria?.nombre ?? 'Sin categoría'} · rinde {receta.rendimiento_porciones} {receta.unidad_rendimiento}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {receta.en_carta ? <span className="badge-exito">En carta</span> : null}
                  {receta.producto_salida?.nombre ? <span className="badge-info">Salida: {receta.producto_salida.nombre}</span> : null}
                </div>
              </div>
              <p className="text-xs text-texto-secundario">{receta.descripcion || 'Ficha técnica de producción del restaurante.'}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRecetaEditarId(receta.id)} className="rounded-xl border border-acento px-3 py-2 text-xs text-acento">Editar receta</button>
                <Link href={`/biblioteca/${receta.id}`} className="rounded-xl border border-fondo-borde px-3 py-2 text-xs text-texto-secundario">Ver detalle</Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {mostrarNueva ? <RecetaEditorSheet modo="receta" onClose={() => setMostrarNueva(false)} onSaved={() => setMostrarNueva(false)} /> : null}
      {recetaEditarId ? <RecetaEditorSheet modo="receta" receta={recetaEditarQuery.data} onClose={() => setRecetaEditarId(null)} onSaved={() => setRecetaEditarId(null)} /> : null}
    </div>
  )
}
