'use client'

/**
 * src/components/biblioteca/BibliotecaCliente.tsx
 *
 * Contenedor principal del módulo de Biblioteca culinaria de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useRecetas() para acceder al catálogo de recetas.
 * - Manejar los cuatro estados posibles de la query de forma explícita.
 *
 * ESTADO ACTUAL (Fase 3.1):
 * fetchRecetas lanza un error placeholder.
 * La pantalla lo captura y muestra un aviso informativo no bloqueante.
 *
 * TODO (Fase 3.2):
 * - Implementar fetchRecetas con queries reales a Supabase.
 * - Reemplazar los estados placeholder por componentes reales:
 *   - Tarjeta de receta
 *   - Buscador
 *   - Filtros por categoría
 *   - Acceso a ficha técnica
 */

import { useRecetas } from '@/hooks/useDominio'

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function BibliotecaCliente() {
  const { isPending, isError, isSuccess, data } = useRecetas()

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
          Biblioteca
        </h1>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Recetas y fichas técnicas
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
            Recetas no disponibles en esta fase
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            La biblioteca culinaria estará operativa en Fase 3.2,
            cuando los fetchers de dominio sean implementados con
            las queries reales a Supabase.
          </p>
        </section>
      )}

      {/* ── Estado: sin recetas ───────────────────────────── */}
      {isSuccess && data.length === 0 && (
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
      {isSuccess && data.length > 0 && (
        <section className="space-y-3">
          {/*
           * TODO (Fase 3.2):
           * Reemplazar por componente <TarjetaReceta> con:
           * - Nombre y categoría
           * - Costo por porción
           * - Indicador de costo desactualizado
           * - Acceso a ficha técnica completa
           */}
          {data.map((receta) => (
            <div
              key={receta.id}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3"
            >
              <p className="text-sm font-sans font-medium text-texto-primario">
                {receta.nombre}
              </p>
              {receta.categoria && (
                <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                  {receta.categoria.nombre}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
