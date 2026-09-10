'use client'

/**
 * src/components/dashboard/StockCriticoWidget.tsx
 *
 * Widget de stock crítico para el dashboard.
 *
 * Consume useProductos() sin filtros y filtra en cliente
 * los productos cuyo stock está por debajo del mínimo.
 * Muestra máximo 5 productos.
 *
 * Correcciones aplicadas:
 * - cantidad_gramos y stock_minimo_gramos son `number | undefined`,
 *   NO `number | null`. Guard correcto: !== undefined.
 * - data es `Producto[] | undefined` tras desestructurar de useQuery.
 *   El narrowing de isSuccess no garantiza que data sea definido
 *   en variables desestructuradas bajo TypeScript strict.
 *   Corrección: data?.filter(...) ?? [] en lugar de data.filter(...).
 *
 * Tipos verificados contra src/types/index.ts:
 * - Producto.stock_actual: number ✅
 * - Producto.stock_minimo: number ✅
 * - Producto.cantidad_gramos: number | undefined ✅
 * - Producto.stock_minimo_gramos: number | undefined ✅
 * - Producto.unidad_display: string | undefined ✅
 * - Producto.unidad_medida: string ✅
 */

import Link              from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useProductos }  from '@/hooks/useDominio'
import type { Producto } from '@/types/index'

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

const MAX_PRODUCTOS = 5

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function StockCriticoWidget() {
  const { isPending, isError, isSuccess, data } = useProductos()

  // data es Producto[] | undefined tras desestructurar.
  // Usar optional chaining para evitar error de compilación bajo strictNullChecks.
  const criticos = isSuccess
    ? (data?.filter(esCritico).slice(0, MAX_PRODUCTOS) ?? [])
    : []

  return (
    <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">

      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-fondo-borde flex items-center gap-2">
        <AlertTriangle size={14} className="text-advertencia flex-shrink-0" />
        <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
          Stock crítico
        </p>
      </div>

      <div className="px-4 py-3">

        {/* Cargando */}
        {isPending && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <p className="text-xs font-sans text-texto-apagado py-2">
            No se pudo cargar el inventario.
          </p>
        )}

        {/* Sin críticos */}
        {isSuccess && criticos.length === 0 && (
          <p className="text-xs font-sans text-texto-apagado py-2">
            Sin productos críticos.
          </p>
        )}

        {/* Lista */}
        {isSuccess && criticos.length > 0 && (
          <div className="space-y-3">
            {criticos.map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between gap-3"
              >
                <p className="text-sm font-sans font-medium text-texto-primario truncate">
                  {producto.nombre}
                </p>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-sans font-medium text-peligro">
                    {producto.stock_actual}{' '}
                    {producto.unidad_display ?? producto.unidad_medida}
                  </p>
                  <p className="text-2xs font-sans text-texto-apagado">
                    mín {producto.stock_minimo}
                  </p>
                </div>
              </div>
            ))}

            <Link
              href="/inventario"
              className="block text-center text-2xs font-sans font-medium
                         text-acento pt-1 active:text-acento/70 transition-colors"
            >
              Ver inventario completo →
            </Link>
          </div>
        )}

      </div>

    </section>
  )
}
