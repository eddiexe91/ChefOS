'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, X } from 'lucide-react'

import { useRecetas } from '@/hooks/useDominio'
import type { Receta } from '@/types/index'

type FiltroVista = 'todas' | 'en_carta'

interface TarjetaRecetaProps {
  receta: Receta
}

function formatearCostoPorcion(costoPorcion?: number) {
  if (costoPorcion === undefined || costoPorcion === null) {
    return 'Costo no disponible'
  }

  return `$${costoPorcion.toLocaleString('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function TarjetaReceta({ receta }: TarjetaRecetaProps) {
  const [mostrarImagen, setMostrarImagen] = useState(Boolean(receta.imagen_url))

  return (
    <Link href={`/biblioteca/${receta.id}`} className="block rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden active:bg-fondo-hover transition-colors">
      {mostrarImagen && receta.imagen_url ? (
        <Image
          src={receta.imagen_url}
          alt={receta.nombre}
          width={640}
          height={144}
          unoptimized
          className="w-full h-36 object-cover"
          onError={() => setMostrarImagen(false)}
        />
      ) : (
        <div className="w-full h-24 bg-fondo-hover flex items-center justify-center">
          <p className="text-2xs font-sans text-texto-apagado">
            Sin imagen
          </p>
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-sans font-medium text-texto-primario truncate">
              {receta.nombre}
            </p>
            <p className="text-2xs font-sans text-texto-apagado mt-0.5">
              {receta.categoria?.nombre ?? 'Sin categoría'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {receta.en_carta && (
              <span className="badge-exito">En carta</span>
            )}
            {receta.costo_desactualizado && (
              <span className="badge-advertencia">Costo desactualizado</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-sans text-texto-secundario">
            Costo por porción
          </p>
          <p className="text-sm font-mono font-medium text-texto-primario">
            {formatearCostoPorcion(receta.costo_porcion)}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <p className="text-2xs font-sans text-texto-apagado">
            Rendimiento: {receta.rendimiento_porciones}
          </p>
          {receta.tiempo_preparacion !== undefined && (
            <p className="text-2xs font-sans text-texto-apagado">
              Tiempo: {receta.tiempo_preparacion} min
            </p>
          )}
          {receta.dificultad && (
            <p className="text-2xs font-sans text-texto-apagado capitalize">
              Dificultad: {receta.dificultad}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

function SkeletonRecetas() {
  return (
    <section className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
        >
          <div className="h-24 rounded-lg bg-fondo-hover animate-pulse" />
          <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
          <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
        </div>
      ))}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function BibliotecaCliente() {
  const { isPending, isError, isSuccess, data } = useRecetas()
  const recetas = useMemo(() => data ?? [], [data])

  const [busqueda, setBusqueda] = useState('')
  const [filtroVista, setFiltroVista] = useState<FiltroVista>('todas')
  const [categoriaActiva, setCategoriaActiva] = useState<'todas' | string>('todas')

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()

    recetas.forEach((receta) => {
      if (receta.categoria?.id && receta.categoria?.nombre) {
        mapa.set(receta.categoria.id, receta.categoria.nombre)
      }
    })

    return Array.from(mapa.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [recetas])

  const recetasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return recetas.filter((receta) => {
      if (filtroVista === 'en_carta' && !receta.en_carta) return false
      if (categoriaActiva !== 'todas' && receta.categoria_id !== categoriaActiva) return false
      if (termino && !receta.nombre.toLowerCase().includes(termino)) return false
      return true
    })
  }, [recetas, busqueda, filtroVista, categoriaActiva])

  const hayFiltros =
    busqueda.trim() !== '' ||
    filtroVista !== 'todas' ||
    categoriaActiva !== 'todas'

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroVista('todas')
    setCategoriaActiva('todas')
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Biblioteca
          </h1>
          {isSuccess && recetas.length > 0 && (
            <p className="text-xs font-sans text-texto-apagado flex-shrink-0">
              {hayFiltros
                ? `${recetasFiltradas.length} de ${recetas.length}`
                : `${recetas.length} receta${recetas.length !== 1 ? 's' : ''}`
              }
            </p>
          )}
        </div>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Recetas y fichas técnicas
        </p>
        <Link
          href="/biblioteca/nueva"
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl
                     bg-acento text-white text-xs font-sans font-semibold
                     active:bg-acento-hover transition-colors"
        >
          <Plus size={13} />
          Nueva receta
        </Link>
      </section>

      {/* ── Búsqueda y filtros ───────────────────────────── */}
      {isSuccess && recetas.length > 0 && (
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
                         pl-9 pr-9 py-2.5
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
              onClick={() => setFiltroVista('todas')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full
                          text-2xs font-sans font-medium border transition-colors
                          ${filtroVista === 'todas'
                            ? 'bg-acento text-white border-acento'
                            : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                          }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFiltroVista('en_carta')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full
                          text-2xs font-sans font-medium border transition-colors
                          ${filtroVista === 'en_carta'
                            ? 'bg-acento text-white border-acento'
                            : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                          }`}
            >
              En carta
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() =>
                  setCategoriaActiva((prev) => prev === categoria.id ? 'todas' : categoria.id)
                }
                className={`flex-shrink-0 px-3 py-1.5 rounded-full
                            text-2xs font-sans font-medium border transition-colors
                            ${categoriaActiva === categoria.id
                              ? 'bg-acento text-white border-acento'
                              : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                            }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 text-2xs font-sans
                         text-acento active:text-acento/70 transition-colors"
            >
              <X size={11} />
              Limpiar filtros
            </button>
          )}
        </section>
      )}

      {/* ── Estado: cargando ─────────────────────────────── */}
      {isPending && <SkeletonRecetas />}

      {/* ── Estado: error ────────────────────────────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            No se pudieron cargar las recetas
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            Verifica tu conexión e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Estado: sin resultados de filtro ─────────────── */}
      {isSuccess && recetas.length > 0 && recetasFiltradas.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            Sin resultados
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Ninguna receta coincide con la búsqueda o filtros aplicados.
          </p>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-3 text-xs font-sans font-medium text-acento
                         active:text-acento/70 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </section>
      )}

      {/* ── Estado: sin recetas en BD ────────────────────── */}
      {isSuccess && recetas.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay recetas todavía
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Las recetas que crees aparecerán aquí.
          </p>
        </section>
      )}

      {/* ── Estado: con recetas ───────────────────────────── */}
      {isSuccess && recetasFiltradas.length > 0 && (
        <section className="space-y-3">
          {recetasFiltradas.map((receta) => (
            <TarjetaReceta
              key={receta.id}
              receta={receta}
            />
          ))}
        </section>
      )}

    </div>
  )
}
