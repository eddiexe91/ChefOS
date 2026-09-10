'use client'

/**
 * src/components/inventario/InventarioCliente.tsx
 *
 * Módulo de inventario de ChefOS — vista profesional.
 *
 * Funcionalidades:
 * - Búsqueda instantánea por nombre (filtrado en cliente)
 * - Filtro por categoría (derivado de los datos cargados)
 * - Filtro de stock crítico
 * - Contador de productos filtrados
 * - Skeleton de carga
 * - Estado vacío elegante
 * - Manejo de errores
 *
 * No realiza mutaciones.
 * No llama a APIs adicionales.
 * El filtrado de categoría y búsqueda ocurre en cliente sobre
 * los datos ya cargados por useProductos().
 *
 * Tipos verificados:
 * - Producto: id, nombre, stock_actual, stock_minimo, unidad_medida,
 *   unidad_display?, cantidad_gramos?, stock_minimo_gramos?, categoria?
 * - CategoriaProducto: id, nombre
 * - FiltrosProducto: stock_bajo?, categoria_id?
 */

import { useState, useMemo }  from 'react'
import { Search, Filter, X }  from 'lucide-react'
import { useProductos }        from '@/hooks/useDominio'
import type { Producto }       from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Helper — criterio de stock crítico
// ─────────────────────────────────────────────────────────────

function esCritico(p: Producto): boolean {
  if (
    p.cantidad_gramos !== undefined &&
    p.stock_minimo_gramos !== undefined
  ) {
    return p.cantidad_gramos <= p.stock_minimo_gramos
  }
  return p.stock_actual <= p.stock_minimo
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: tarjeta de producto
// ─────────────────────────────────────────────────────────────

interface TarjetaProductoProps {
  producto: Producto
  critico: boolean
}

function TarjetaProducto({ producto, critico }: TarjetaProductoProps) {
  const unidad = producto.unidad_display ?? producto.unidad_medida

  return (
    <div className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3">

      {/* Fila principal */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-sans font-medium text-texto-primario truncate">
            {producto.nombre}
          </p>
          {producto.categoria?.nombre && (
            <p className="text-2xs font-sans text-texto-apagado mt-0.5">
              {producto.categoria.nombre}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          <p
            className={
              critico
                ? 'text-sm font-sans font-medium text-peligro'
                : 'text-sm font-sans font-medium text-exito-texto'
            }
          >
            {producto.stock_actual} {unidad}
          </p>
          <p className="text-2xs font-sans text-texto-apagado mt-0.5">
            mín {producto.stock_minimo} {unidad}
          </p>
        </div>
      </div>

      {/* Indicador de stock crítico */}
      {critico && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-peligro flex-shrink-0" />
          <p className="text-2xs font-sans text-peligro">
            Stock crítico
          </p>
        </div>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: skeletons de carga
// ─────────────────────────────────────────────────────────────

function SkeletonProductos() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
              <div className="h-2.5 rounded-full bg-fondo-hover animate-pulse w-1/3" />
            </div>
            <div className="space-y-1.5 flex-shrink-0 text-right">
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-16" />
              <div className="h-2.5 rounded-full bg-fondo-hover animate-pulse w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function InventarioCliente() {
  const [busqueda,         setBusqueda]         = useState('')
  const [categoriaActiva,  setCategoriaActiva]  = useState<string>('todas')
  const [soloStockCritico, setSoloStockCritico] = useState(false)

  // useProductos sin filtros — carga todos los productos activos.
  // El filtrado de categoría y búsqueda ocurre en cliente.
  const { isPending, isError, isSuccess, data } = useProductos()

  // Productos base — data puede ser undefined antes de isSuccess
  const productos: Producto[] = useMemo(() => data ?? [], [data])

  // Lista de categorías únicas derivada de los datos cargados
  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of productos) {
      if (p.categoria?.id && p.categoria.nombre) {
        mapa.set(p.categoria.id, p.categoria.nombre)
      }
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [productos])

  // Filtrado en cliente
  const productosFiltrados = useMemo(() => {
    let resultado = productos

    // Filtro por búsqueda (nombre, insensible a mayúsculas)
    if (busqueda.trim() !== '') {
      const termino = busqueda.trim().toLowerCase()
      resultado = resultado.filter((p) =>
        p.nombre.toLowerCase().includes(termino)
      )
    }

    // Filtro por categoría
    if (categoriaActiva !== 'todas') {
      resultado = resultado.filter(
        (p) => p.categoria?.id === categoriaActiva
      )
    }

    // Filtro de stock crítico
    if (soloStockCritico) {
      resultado = resultado.filter(esCritico)
    }

    return resultado
  }, [productos, busqueda, categoriaActiva, soloStockCritico])

  const totalCriticos = useMemo(
    () => productos.filter(esCritico).length,
    [productos]
  )

  const hayFiltros =
    busqueda.trim() !== '' ||
    categoriaActiva !== 'todas' ||
    soloStockCritico

  const limpiarFiltros = () => {
    setBusqueda('')
    setCategoriaActiva('todas')
    setSoloStockCritico(false)
  }

  return (
    <div className="px-4 pt-6 pb-28 space-y-5 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
            Inventario
          </h1>
          {isSuccess && (
            <p className="text-xs font-sans text-texto-apagado flex-shrink-0">
              {hayFiltros
                ? `${productosFiltrados.length} de ${productos.length}`
                : `${productos.length} productos`
              }
            </p>
          )}
        </div>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Productos y stock actual
        </p>
      </section>

      {/* ── Búsqueda ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-apagado pointer-events-none"
          />
          <input
            type="search"
            placeholder="Buscar producto..."
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

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">

          {/* Filtro: stock crítico */}
          <button
            type="button"
            onClick={() => setSoloStockCritico((v) => !v)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full
                        text-2xs font-sans font-medium border transition-colors
                        ${soloStockCritico
                          ? 'bg-peligro text-white border-peligro'
                          : 'bg-fondo-elevado text-texto-apagado border-fondo-borde active:bg-fondo-hover'
                        }`}
          >
            <Filter size={11} />
            Crítico
            {totalCriticos > 0 && (
              <span
                className={`ml-0.5 ${soloStockCritico ? 'text-white/80' : 'text-peligro'}`}
              >
                {totalCriticos}
              </span>
            )}
          </button>

          {/* Filtros por categoría */}
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setCategoriaActiva((prev) => prev === cat.id ? 'todas' : cat.id)
              }
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
        </div>

        {/* Limpiar filtros */}
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

      {/* ── Estado: cargando ─────────────────────────────── */}
      {isPending && <SkeletonProductos />}

      {/* ── Estado: error ────────────────────────────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            Inventario no disponible en este momento
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            No se pudo conectar con la base de datos.
            Verifica tu conexión e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Estado: sin resultados de filtro ─────────────── */}
      {isSuccess && productosFiltrados.length === 0 && hayFiltros && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            Sin resultados
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Ningún producto coincide con los filtros aplicados.
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

      {/* ── Estado: sin productos en BD ──────────────────── */}
      {isSuccess && productos.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay productos registrados
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Los productos del inventario aparecerán aquí.
          </p>
        </section>
      )}

      {/* ── Lista de productos ───────────────────────────── */}
      {isSuccess && productosFiltrados.length > 0 && (
        <section className="space-y-3">
          {productosFiltrados.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              critico={esCritico(producto)}
            />
          ))}
        </section>
      )}

    </div>
  )
                      }
