'use client'

/**
 * src/components/inventario/ProductoDetalleCliente.tsx
 *
 * Vista de detalle de un producto de inventario.
 *
 * Responsabilidad exclusiva: presentación.
 *
 * Orquestación de queries: useProducto() + useMovimientosInventario()
 * (src/hooks/useDominio.ts) — dos queries independientes, sin hook
 * combinador dedicado (a diferencia de useLoteDetalle.ts), ya que no hay
 * necesidad de derivar datos entre ambas fuentes.
 *
 * Decisión documentada: la sección de historial se ubica DESPUÉS de la
 * sección de ajuste. No existe un precedente verificable en
 * LoteDetalleCliente.tsx para este orden específico (no se tuvo acceso a
 * la sección que renderiza `registros` en ese archivo) — es una inferencia
 * estructural, no una réplica confirmada.
 */

import Link                        from 'next/link'
import { ChevronLeft, Package, ClipboardList } from 'lucide-react'
import { useProducto, useMovimientosInventario } from '@/hooks/useDominio'
import FormAjusteInventario         from '@/components/inventario/FormAjusteInventario'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  productoId: string
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function ProductoDetalleCliente({ productoId }: Props) {
  const producto = useProducto(productoId)
  const movimientos = useMovimientosInventario(productoId)

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Navegación ───────────────────────────────────── */}
      <Link
        href="/inventario"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-texto-apagado
                   active:text-texto-secundario transition-colors"
      >
        <ChevronLeft size={14} />
        Inventario
      </Link>

      {/* ── Estado: cargando producto ────────────────────── */}
      {producto.isPending && (
        <section className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 rounded-full bg-fondo-hover animate-pulse w-1/3" />
            <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
              >
                <div className="h-2.5 rounded-full bg-fondo-hover animate-pulse w-1/2" />
                <div className="h-5 rounded-full bg-fondo-hover animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Estado: error producto ───────────────────────── */}
      {producto.isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            No se pudo cargar el producto.
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1">
            Vuelve a la lista e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Detalle del producto ─────────────────────────── */}
      {producto.isSuccess && producto.data && (
        <>
          {/* Encabezado */}
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
                  {producto.data.nombre}
                </h1>
                {producto.data.categoria?.nombre && (
                  <p className="text-xs font-sans text-texto-apagado mt-0.5">
                    {producto.data.categoria.nombre}
                  </p>
                )}
              </div>
              {!producto.data.activo && (
                <span
                  className="px-2.5 py-1 rounded-full text-2xs font-sans font-medium
                             flex-shrink-0 mt-1 bg-fondo-elevado text-texto-apagado
                             border border-fondo-borde"
                >
                  Inactivo
                </span>
              )}
            </div>
          </section>

          {/* Métricas del producto */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Stock actual
              </p>
              <p className="text-2xl font-display font-bold text-texto-primario">
                {producto.data.stock_actual} {producto.data.unidad_display ?? producto.data.unidad_medida}
              </p>
            </div>

            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Stock mínimo
              </p>
              <p className="text-2xl font-display font-bold text-texto-primario">
                {producto.data.stock_minimo} {producto.data.unidad_display ?? producto.data.unidad_medida}
              </p>
            </div>
          </section>

          {/* Formulario de ajuste — solo si el producto está activo */}
          {producto.data.activo && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
              <div className="px-4 py-3 border-b border-fondo-borde flex items-center gap-2">
                <Package size={14} className="text-texto-apagado" />
                <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
                  Ajustar inventario
                </p>
              </div>
              <div className="px-4 py-4">
                <FormAjusteInventario productoId={productoId} />
              </div>
            </section>
          )}

          {/* Historial de movimientos */}
          <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
            <div className="px-4 py-3 border-b border-fondo-borde flex items-center gap-2">
              <ClipboardList size={14} className="text-texto-apagado" />
              <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
                Historial de movimientos
              </p>
            </div>

            {movimientos.isPending && (
              <div className="px-4 py-4">
                <p className="text-xs font-sans text-texto-apagado">
                  Cargando historial...
                </p>
              </div>
            )}

            {movimientos.isError && (
              <div className="px-4 py-4">
                <p className="text-xs font-sans text-texto-apagado">
                  No se pudo cargar el historial.
                </p>
              </div>
            )}

            {movimientos.isSuccess && movimientos.data.length === 0 && (
              <div className="px-4 py-4">
                <p className="text-xs font-sans text-texto-apagado">
                  Sin movimientos registrados todavía.
                </p>
              </div>
            )}

            {movimientos.isSuccess && movimientos.data.length > 0 && (
              <div className="divide-y divide-fondo-borde">
                {movimientos.data.map((movimiento) => (
                  <div
                    key={movimiento.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-sans font-medium text-texto-primario capitalize">
                        {movimiento.tipo}
                      </p>
                      <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                        {new Date(movimiento.creado_en).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-sans font-medium text-texto-primario">
                      {movimiento.cantidad >= 0 ? '+' : ''}
                      {movimiento.cantidad} {producto.data.unidad_display ?? producto.data.unidad_medida}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

    </div>
  )
}
