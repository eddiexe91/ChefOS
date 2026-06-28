'use client'

/**
 * src/components/inventario/InventarioCliente.tsx
 *
 * Contenedor principal del módulo de Inventario de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useProductos() para acceder al catálogo de productos.
 * - Manejar los cuatro estados posibles de la query de forma explícita.
 *
 * ESTADO ACTUAL (Fase 3.1):
 * fetchProductos lanza un error placeholder.
 * La pantalla lo captura y muestra un aviso informativo no bloqueante.
 *
 * TODO (Fase 3.2):
 * - Implementar fetchProductos con queries reales a Supabase.
 * - Añadir useApp() para reflejar estado offline en ajustes de stock.
 * - Integrar src/lib/offline/cola.ts para ajustes offline.
 * - Reemplazar los estados placeholder por componentes reales:
 *   - Tarjeta de producto con stock actual vs mínimo
 *   - Indicador visual de stock crítico
 *   - Filtro por categoría
 *   - Acceso a movimientos del producto
 */

import { useProductos } from '@/hooks/useDominio'

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function InventarioCliente() {
  const { isPending, isError, isSuccess, data } = useProductos()

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
          Inventario
        </h1>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Productos y stock actual
        </p>
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

      {/* ── Estado: error (placeholder Fase 3.1) ─────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            Inventario no disponible en esta fase
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            El módulo de inventario estará operativo en Fase 3.2,
            cuando los fetchers de dominio sean implementados con
            las queries reales a Supabase.
          </p>
        </section>
      )}

      {/* ── Estado: sin productos ────────────────────────── */}
      {isSuccess && data.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay productos registrados
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Los productos del inventario aparecerán aquí.
          </p>
        </section>
      )}

      {/* ── Estado: con productos ────────────────────────── */}
      {isSuccess && data.length > 0 && (
        <section className="space-y-3">
          {/*
           * TODO (Fase 3.2):
           * Reemplazar por componente <TarjetaProducto> con:
           * - Nombre y categoría
           * - Stock actual vs stock mínimo
           * - Indicador visual de stock crítico (stock_actual <= stock_minimo)
           * - Costo unitario actual
           * - Unidad de medida
           * - Acceso a movimientos del producto
           */}
          {data.map((producto) => (
            <div
              key={producto.id}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-sans font-medium text-texto-primario truncate">
                  {producto.nombre}
                </p>
                <span
                  className={
                    producto.stock_actual <= producto.stock_minimo
                      ? 'text-2xs font-sans font-medium text-peligro flex-shrink-0'
                      : 'text-2xs font-sans font-medium text-exito flex-shrink-0'
                  }
                >
                  {producto.stock_actual} {producto.unidad_medida}
                </span>
              </div>
              {producto.stock_actual <= producto.stock_minimo && (
                <p className="text-2xs font-sans text-peligro mt-0.5">
                  Stock crítico — mínimo: {producto.stock_minimo} {producto.unidad_medida}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
