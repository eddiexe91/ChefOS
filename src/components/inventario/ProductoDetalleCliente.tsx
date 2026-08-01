'use client'

/**
 * src/components/inventario/ProductoDetalleCliente.tsx
 *
 * Vista de detalle de un producto de inventario.
 *
 * Responsabilidad exclusiva: presentación.
 *
 * Orquestación de queries: useProducto() (src/hooks/useDominio.ts) — consulta
 * única. A diferencia de LoteDetalleCliente.tsx (que orquesta dos queries vía
 * useLoteDetalle.ts), aquí no existe un hook combinador dedicado porque no hay
 * una segunda fuente de datos implementada todavía: no existe fetchMovimientos()
 * en src/lib/queries/index.ts ni un hook de historial en useDominio.ts. La
 * sección de historial de movimientos queda fuera de esta iteración.
 */

import Link                    from 'next/link'
import { ChevronLeft, Package } from 'lucide-react'
import { useProducto }          from '@/hooks/useDominio'
import FormAjusteInventario     from '@/components/inventario/FormAjusteInventario'

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
        </>
      )}

    </div>
  )
}
