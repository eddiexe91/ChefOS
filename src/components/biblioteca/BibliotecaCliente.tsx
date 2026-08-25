'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRecetas } from '@/hooks/useDominio'

export default function BibliotecaCliente() {
  const { isPending, isError, isSuccess, data } = useRecetas()

  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas')
  const [soloEnCarta, setSoloEnCarta] = useState(false)

  const categorias = useMemo(() => {
    if (!data) return []
    const nombres = new Set<string>()
    data.forEach((r) => {
      if (r.categoria?.nombre) nombres.add(r.categoria.nombre)
    })
    return Array.from(nombres).sort()
  }, [data])

  const recetasFiltradas = useMemo(() => {
    if (!data) return []
    return data.filter((receta) => {
      if (busqueda && !receta.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (soloEnCarta && !receta.en_carta) return false
      if (categoriaActiva !== 'todas' && receta.categoria?.nombre !== categoriaActiva) return false
      return true
    })
  }, [data, busqueda, categoriaActiva, soloEnCarta])

  const hayFiltrosActivos = busqueda !== '' || categoriaActiva !== 'todas' || soloEnCarta

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Biblioteca
          </h1>
          <p className="text-xs font-sans text-texto-apagado mt-0.5">
            Recetas y fichas técnicas
          </p>
        </div>
        <Link
          href="/biblioteca/nueva"
          className="text-sm font-sans font-medium text-acento"
        >
          + Nueva receta
        </Link>
      </section>

      {/* ── Estado: cargando ─────────────────────────────── */}
      {isPending && (
        <section className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
            >
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
            </div>
          ))}
        </section>
      )}

      {/* ── Estado: error ─────────────────────────────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            Error al cargar recetas. Intenta nuevamente.
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            No se pudo conectar con la base de datos. Verifica tu conexión e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Contenido con datos ────────────────────────────── */}
      {isSuccess && (
        <>
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar receta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg bg-fondo-elevado border border-fondo-borde px-3 py-2 text-sm font-sans text-texto-primario placeholder:text-texto-apagado focus:outline-none focus:border-acento"
          />

          {/* Chips de categoría */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Chip: Todas */}
            <button
              type="button"
              onClick={() => setCategoriaActiva('todas')}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-sans font-medium transition-colors ${
                categoriaActiva === 'todas'
                  ? 'bg-acento text-white border-acento'
                  : 'bg-fondo-elevado text-texto-apagado border-fondo-borde'
              }`}
            >
              Todas
            </button>

            {/* Chip: En carta */}
            <button
              type="button"
              onClick={() => setSoloEnCarta(!soloEnCarta)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-sans font-medium transition-colors ${
                soloEnCarta
                  ? 'bg-acento text-white border-acento'
                  : 'bg-fondo-elevado text-texto-apagado border-fondo-borde'
              }`}
            >
              En carta
            </button>

            {/* Chips: categorías dinámicas */}
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaActiva(cat)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-sans font-medium transition-colors ${
                  categoriaActiva === cat
                    ? 'bg-acento text-white border-acento'
                    : 'bg-fondo-elevado text-texto-apagado border-fondo-borde'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Botón limpiar filtros */}
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('')
                setCategoriaActiva('todas')
                setSoloEnCarta(false)
              }}
              className="text-xs font-sans text-acento font-medium"
            >
              Limpiar filtros
            </button>
          )}

          {/* Estado vacío sin filtros */}
          {data.length === 0 && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
              <p className="text-sm font-sans font-medium text-texto-secundario">
                No hay recetas todavía
              </p>
              <p className="text-xs font-sans text-texto-apagado mt-1">
                Las recetas que crees aparecerán aquí.
              </p>
            </section>
          )}

          {/* Estado vacío con filtros */}
          {data.length > 0 && recetasFiltradas.length === 0 && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
              <p className="text-sm font-sans font-medium text-texto-secundario">
                Sin resultados
              </p>
              <p className="text-xs font-sans text-texto-apagado mt-1">
                Ninguna receta coincide con los filtros seleccionados.
              </p>
            </section>
          )}

          {/* Tarjetas de recetas */}
          {recetasFiltradas.length > 0 && (
            <section className="space-y-3">
              {recetasFiltradas.map((receta) => (
                <div
                  key={receta.id}
                  className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-sans font-medium text-texto-primario">
                      {receta.nombre}
                    </p>
                    {receta.en_carta && (
                      <span className="text-2xs font-sans font-medium text-acento bg-acento/10 rounded-full px-2 py-0.5">
                        En carta
                      </span>
                    )}
                  </div>
                  {receta.categoria && (
                    <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                      {receta.categoria.nombre}
                    </p>
                  )}
                  {receta.costo_porcion != null && (
                    <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                      Costo por porción: ${receta.costo_porcion.toFixed(2)}
                    </p>
                  )}
                  {receta.costo_desactualizado && (
                    <p className="text-2xs font-sans text-warning mt-0.5">
                      Costo desactualizado
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}

    </div>
  )
}
