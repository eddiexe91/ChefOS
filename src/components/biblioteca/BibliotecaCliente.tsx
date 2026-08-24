'use client'

/**
 * src/components/biblioteca/BibliotecaCliente.tsx
 *
 * Contenedor principal del módulo de Biblioteca culinaria de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useRecetas() para acceder al catálogo de recetas.
 * - Buscar recetas por nombre.
 * - Filtrar recetas por categoría.
 * - Filtrar recetas marcadas "En carta".
 * - Mostrar estados de carga, error, vacío y resultados.
 * - Permitir acceder a la creación de nuevas recetas.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Filter, Search, TriangleAlert, X } from 'lucide-react'
import { useRecetas } from '@/hooks/useDominio'
import type { Receta } from '@/types/index'

function formatearMonedaCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function SkeletonRecetas() {
  return (
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
  )
}

interface TarjetaRecetaProps {
  receta: Receta
}

function TarjetaReceta({ receta }: TarjetaRecetaProps) {
  return (
    <div className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-sans font-medium text-texto-primario truncate">
            {receta.nombre}
          </p>
          {receta.categoria?.nombre && (
            <p className="text-2xs font-sans text-texto-apagado mt-0.5">
              {receta.categoria.nombre}
            </p>
          )}
        </div>

        {receta.en_carta && (
          <span className="flex-shrink-0 px-2 py-1 rounded-full text-2xs font-sans font-medium bg-fondo-hover text-texto-secundario">
            En carta
          </span>
        )}
      </div>

      {typeof receta.costo_porcion === 'number' && (
        <p className="text-xs font-sans text-texto-secundario">
          {formatearMonedaCLP(receta.costo_porcion)} / porción
        </p>
      )}

      {receta.costo_desactualizado && (
        <div className="flex items-center gap-1.5">
          <TriangleAlert size={12} className="text-peligro flex-shrink-0" />
          <p className="text-2xs font-sans text-peligro">
            Costo desactualizado
          </p>
        </div>
      )}
    </div>
  )
}

export default function BibliotecaCliente() {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas')
  const [soloEnCarta, setSoloEnCarta] = useState(false)

  const { isPending, isError, isSuccess, data } = useRecetas()

  const recetas: Receta[] = data ?? []

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()

    for (const receta of recetas) {
      if (receta.categoria?.id && receta.categoria.nombre) {
        mapa.set(receta.categoria.id, receta.categoria.nombre)
      }
    }

    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [recetas])

  const recetasFiltradas = useMemo(() => {
    let resultado = recetas

    if (busqueda.trim() !== '') {
      const termino = busqueda.trim().toLowerCase()
      resultado = resultado.filter((receta) =>
        receta.nombre.toLowerCase().includes(termino)
      )
    }

    if (categoriaActiva !== 'todas') {
      resultado = resultado.filter(
        (receta) => receta.categoria?.id === categoriaActiva
      )
    }

    if (soloEnCarta) {
      resultado = resultado.filter((receta) => receta.en_carta === true)
    }

    return resultado
  }, [recetas, busqueda, categoriaActiva, soloEnCarta])

  const hayFiltros =
    busqueda.trim() !== '' ||
    categoriaActiva !== 'todas' ||
    soloEnCarta

  const limpiarFiltros = () => {
    setBusqueda('')
    setCategoriaActiva('todas')
    setSoloEnCarta(false)
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Biblioteca
          </h1>
          <Link
            href="/biblioteca/nueva"
            className="text-xs font-sans font-medium text-acento active:text-acento/70 transition-colors"
          >
            + Nueva receta
          </Link>
        </div>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Recetas y fichas técnicas
        </p>
      </section>

      <section className="space-y-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-apagado pointer-events-none"
          />
          <input
            type="search"
            placeholder="Buscar receta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl bg-fondo-elevado border border-fondo-borde
                       pl-9 pr-4 py-2.5
                       text-sm font-sans text-texto-primario
                       placeholder:text-texto-apagado
                       focus:outline-none focus:border-acento
                       transition-colors"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-texto-apagado active:text-texto-secundario"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoriaActiva('todas')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full
                        text-2xs font-sans font-medium border transition-colors
                        ${categoriaActiva === 'todas'
                          ? 'bg-acento text-white border-acento'
                          : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                        }`}
          >
            Todas
          </button>

          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaActiva(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full
                          text-2xs font-sans font-medium border transition-colors
                          ${categoriaActiva === cat.id
                            ? 'bg-acento text-white border-acento'
                            : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                          }`}
            >
              {cat.nombre}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSoloEnCarta((valorActual) => !valorActual)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full
                        text-2xs font-sans font-medium border transition-colors
                        ${soloEnCarta
                          ? 'bg-acento text-white border-acento'
                          : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                        }`}
          >
            <Filter size={11} />
            En carta
          </button>
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 text-2xs font-sans text-acento
                       active:text-acento/70 transition-colors"
          >
            <X size={11} />
            Limpiar filtros
          </button>
        )}
      </section>

      {isPending && <SkeletonRecetas />}

      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            Error al cargar recetas. Intenta nuevamente.
          </p>
        </section>
      )}

      {isSuccess && recetas.length === 0 && !hayFiltros && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay recetas todavía
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Las recetas que crees aparecerán aquí.
          </p>
          <Link
            href="/biblioteca/nueva"
            className="inline-flex mt-3 text-xs font-sans font-medium text-acento
                       active:text-acento/70 transition-colors"
          >
            + Nueva receta
          </Link>
        </section>
      )}

      {isSuccess && recetas.length > 0 && recetasFiltradas.length === 0 && hayFiltros && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No se encontraron recetas con estos filtros
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-3 text-xs font-sans font-medium text-acento
                       active:text-acento/70 transition-colors"
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {isSuccess && recetasFiltradas.length > 0 && (
        <section className="space-y-3">
          {recetasFiltradas.map((receta) => (
            <TarjetaReceta key={receta.id} receta={receta} />
          ))}
        </section>
      )}
    </div>
  )
}
