'use client'

/**
 * src/components/produccion/ProduccionCliente.tsx
 *
 * Contenedor principal del módulo de Producción de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useLotesProduccion() para acceder a los lotes del día.
 * - Consumir useApp() para reflejar el estado offline en la UI.
 * - Navegar al detalle de cada lote.
 * - Manejar los cuatro estados posibles de la query de forma explícita.
 *
 * ESTADO ACTUAL (Fase 3.3):
 * La lista de lotes navega a /produccion/[id].
 * El registro de producción ocurre en el detalle del lote.
 */

import Link                from 'next/link'
import { ChevronRight }    from 'lucide-react'
import { useLotesProduccion } from '@/hooks/useDominio'
import { useApp }             from '@/providers/AppProvider'

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const ETIQUETAS_TURNO: Record<string, string> = {
  mañana: 'Mañana',
  tarde:  'Tarde',
  noche:  'Noche',
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  en_progreso: 'En progreso',
  completado:  'Completado',
  cancelado:   'Cancelado',
}

const CLASES_ESTADO: Record<string, string> = {
  en_progreso: 'bg-advertencia-suave text-advertencia-texto',
  completado:  'bg-exito-suave text-exito-texto',
  cancelado:   'bg-fondo-hover text-texto-apagado',
}

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

      {/* ── Estado: error ────────────────────────────────── */}
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
          {data.map((lote) => (
            <Link
              key={lote.id}
              href={`/produccion/${lote.id}`}
              className="flex items-center justify-between gap-3
                         rounded-xl bg-fondo-elevado border border-fondo-borde
                         px-4 py-3 active:bg-fondo-hover transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-sans font-medium text-texto-primario">
                    {ETIQUETAS_TURNO[lote.turno] ?? lote.turno}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium
                                ${CLASES_ESTADO[lote.estado] ?? 'bg-fondo-hover text-texto-apagado'}`}
                  >
                    {ETIQUETAS_ESTADO[lote.estado] ?? lote.estado}
                  </span>
                </div>
                <p className="text-2xs font-sans text-texto-apagado">
                  {lote.fecha}
                  {lote.items_producidos > 0 && (
                    <> · {lote.items_producidos} ítem{lote.items_producidos !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
              <ChevronRight size={16} className="text-texto-apagado flex-shrink-0" />
            </Link>
          ))}
        </section>
      )}

    </div>
  )
}
