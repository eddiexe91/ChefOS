'use client'

import { useMemo, useState } from 'react'
import { Plus, UtensilsCrossed, X } from 'lucide-react'

import RecetaEditorSheet from '@/components/biblioteca/RecetaEditorSheet'
import { useReceta, useRecetas } from '@/hooks/useDominio'

export default function CartaPage() {
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [platoEditarId, setPlatoEditarId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [soloProduccion, setSoloProduccion] = useState(false)
  const recetasQuery = useRecetas({ en_carta: true, activa: true })
  const platoEditarQuery = useReceta(platoEditarId ?? '')

  const platos = useMemo(() => recetasQuery.data ?? [], [recetasQuery.data])
  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const plato of platos) {
      if (plato.categoria?.id && plato.categoria.nombre) mapa.set(plato.categoria.id, plato.categoria.nombre)
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [platos])
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return platos.filter((plato) => {
      if (categoriaActiva !== 'todas' && plato.categoria_id !== categoriaActiva) return false
      if (soloProduccion && !plato.es_produccion) return false
      if (termino && !plato.nombre.toLowerCase().includes(termino)) return false
      return true
    })
  }, [busqueda, categoriaActiva, platos, soloProduccion])

  return (
    <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-5">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-acento">Carta</p>
            <h1 className="text-xl font-display font-bold text-texto-primario">Platos del restaurante</h1>
            <p className="text-xs text-texto-apagado mt-1">Cada plato se edita desde su elaboración contextual, con ingredientes de Inventario y Stock disponible.</p>
          </div>
          <button type="button" onClick={() => setMostrarNueva(true)} className="rounded-xl bg-acento px-3 py-2.5 text-xs font-medium text-white inline-flex items-center gap-1.5">
            <Plus size={14} /> Añadir plato
          </button>
        </div>
      </section>

      {platos.length > 0 ? (
        <section className="space-y-3">
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="campo-input" placeholder="Buscar plato..." />
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button type="button" onClick={() => setSoloProduccion((prev) => !prev)} className={`rounded-full border px-3 py-1.5 text-2xs ${soloProduccion ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>También en Producción</button>
            {categorias.map((categoria) => (
              <button key={categoria.id} type="button" onClick={() => setCategoriaActiva((prev) => prev === categoria.id ? 'todas' : categoria.id)} className={`rounded-full border px-3 py-1.5 text-2xs ${categoriaActiva === categoria.id ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>
                {categoria.nombre}
              </button>
            ))}
          </div>
          {(busqueda || categoriaActiva !== 'todas' || soloProduccion) ? (
            <button type="button" onClick={() => { setBusqueda(''); setCategoriaActiva('todas'); setSoloProduccion(false) }} className="text-2xs text-acento inline-flex items-center gap-1">
              <X size={11} /> Limpiar filtros
            </button>
          ) : null}
        </section>
      ) : null}

      {recetasQuery.isPending ? <p className="text-sm text-texto-apagado">Cargando carta…</p> : null}
      {recetasQuery.isError ? <p className="text-sm text-peligro-texto">No se pudo cargar la Carta.</p> : null}
      {recetasQuery.isSuccess && filtrados.length === 0 ? (
        <section className="rounded-xl border border-fondo-borde bg-fondo-elevado px-4 py-8 text-center">
          <UtensilsCrossed size={18} className="mx-auto text-texto-apagado" />
          <p className="text-sm font-medium text-texto-primario mt-3">Tu carta aún está vacía</p>
          <p className="text-xs text-texto-apagado mt-1">Agrega un plato y define su elaboración, rendimiento y relación con Producción si aplica.</p>
        </section>
      ) : null}

      {filtrados.length > 0 ? (
        <section className="space-y-3">
          {filtrados.map((plato) => (
            <article key={plato.id} className="rounded-xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3">
              <button type="button" onClick={() => setPlatoEditarId(plato.id)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-texto-primario">{plato.nombre}</h2>
                    <p className="text-2xs text-texto-apagado mt-1">{plato.categoria?.nombre ?? 'Sin categoría'} · rinde {plato.rendimiento_porciones} {plato.unidad_rendimiento}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="badge-exito">En carta</span>
                    {plato.es_produccion ? <span className="badge-info">También producción</span> : null}
                  </div>
                </div>
                <p className="text-xs text-texto-secundario mt-3">{plato.descripcion || 'Elaboración lista para editar.'}</p>
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPlatoEditarId(plato.id)} className="rounded-xl border border-acento px-3 py-2 text-xs text-acento">Editar plato</button>
                <button type="button" onClick={() => setPlatoEditarId(plato.id)} className="rounded-xl border border-fondo-borde px-3 py-2 text-xs text-texto-secundario">Archivar / eliminar</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {mostrarNueva ? <RecetaEditorSheet modo="carta" onClose={() => setMostrarNueva(false)} onSaved={() => setMostrarNueva(false)} /> : null}
      {platoEditarId ? <RecetaEditorSheet modo="carta" receta={platoEditarQuery.data} onClose={() => setPlatoEditarId(null)} onSaved={() => setPlatoEditarId(null)} /> : null}
    </div>
  )
}
