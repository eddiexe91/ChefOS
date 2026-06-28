'use client'

/**
 * src/components/produccion/ProduccionCliente.tsx
 *
 * Contenedor principal del módulo de Producción de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useLotesProduccion() para acceder a los lotes del día.
 * - Consumir useApp() para reflejar el estado offline en la UI.
 * - Manejar los cuatro estados posibles de la query de forma explícita.
 *
 * ESTADO ACTUAL (Fase 3.1):
 * fetchLotesProduccion lanza un error placeholder.
 * La pantalla lo captura y muestra un aviso informativo no bloqueante.
 * El estado offline se muestra de forma independiente a la query.
 *
 * TODO (Fase 3.2):
 * - Implementar fetchLotesProduccion con queries reales a Supabase.
 * - Integrar src/lib/offline/cola.ts para registro offline.
 * - Reemplazar los estados placeholder por componentes reales:
 *   - Tarjeta de lote activo
 *   - Registro de producción por receta
 *   - Historial de lotes del turno
 */

import { useLotesProduccion } from '@/hooks/useDominio'
import { useApp }             from '@/providers/AppProvider'

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function ProduccionCliente() {
  const { estaOnline, accionesPendientes } = useApp()
  const { isPending, isError, isSuccess, data } = useLotesProduccion()

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
          Producción
        </h1>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          Lotes y registros del turno
        </p>
      </section>

      {/* ── Estado offline ───────────────────────────────── */}
      {(!estaOnline || accionesPendientes > 0) && (
        <section
          className={
            !estaOnline
              ? 'rounded-xl border px-4 py-3 bg-advertencia-suave border-advertencia-borde'
              : 'rounded-xl border px-4 py-3 bg-info-suave border-info-borde'
          }
        >
          <p
            className={
              !estaOnline
                ? 'text-xs font-sans font-medium text-advertencia-texto'
                : 'text-xs font-sans font-medium text-info-texto'
            }
          >
            {!estaOnline
              ? 'Sin conexión — los registros se sincronizarán al reconectar'
              : `Sincronizando ${accionesPendientes} acción${accionesPendientes !== 1 ? 'es' : ''} pendiente${accionesPendientes !== 1 ? 's' : ''}...`
            }
          </p>
        </section>
      )}

      {/* ── Estado: cargando ─────────────────────────────── */}
      {isPending && (
        <section className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-2"
            >
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/2" />
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
            </div>
          ))}
        </section>
      )}

      {/* ── Estado: error (placeholder Fase 3.1) ─────────── */}
      {isError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            Lotes de producción no disponibles en esta fase
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
            El módulo de producción estará operativo en Fase 3.2,
            cuando los fetchers de dominio sean implementados con
            las queries reales a Supabase.
          </p>
        </section>
      )}

      {/* ── Estado: sin lotes ────────────────────────────── */}
      {isSuccess && data.length === 0 && (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            No hay lotes activos
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            Los lotes de producción del turno aparecerán aquí.
          </p>
        </section>
      )}

      {/* ── Estado: con lotes ────────────────────────────── */}
      {isSuccess && data.length > 0 && (
        <section className="space-y-3">
          {/*
           * TODO (Fase 3.2):
           * Reemplazar por componente <TarjetaLote> con:
           * - Turno y fecha del lote
           * - Estado (en_progreso / completado / cancelado)
           * - Responsable
           * - Ítems producidos y costo total
           * - Acceso al detalle del lote
           */}
          {data.map((lote) => (
            <div
              key={lote.id}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-sans font-medium text-texto-primario">
                  {lote.turno.charAt(0).toUpperCase() + lote.turno.slice(1)}
                </p>
                <span className="text-2xs font-sans text-texto-apagado">
                  {lote.estado}
                </span>
              </div>
              <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                {lote.fecha}
              </p>
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
