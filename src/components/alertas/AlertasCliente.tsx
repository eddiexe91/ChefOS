'use client'

/**
 * src/components/alertas/AlertasCliente.tsx
 *
 * Contenedor principal del módulo de Alertas de ChefOS.
 *
 * Fuente primaria (Fase 3.1):
 * useApp() — alertasNoLeidas, totalAlertas, marcarAlertaLeida.
 * Datos reales disponibles desde AppProvider vía Realtime.
 *
 * Fuente secundaria (contrato arquitectónico):
 * useAlertasActivas() — placeholder en Fase 3.1.
 * Su error es informativo y nunca bloquea el render.
 *
 * TODO (Fase 3.2):
 * - Implementar fetchAlertasActivas con queries reales a Supabase.
 * - Usar useAlertasActivas() como fuente primaria cuando esté disponible.
 * - Añadir filtros por tipo y severidad.
 * - Añadir vista de detalle de alerta.
 */

import { useApp }            from '@/providers/AppProvider'
import { useAlertasActivas } from '@/hooks/useDominio'
import type { SeveridadAlerta, TipoAlerta } from '@/types'

// ─────────────────────────────────────────────────────────────
// Etiquetas de dominio
// ─────────────────────────────────────────────────────────────

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  stock_critico:       'Stock crítico',
  proximo_vencimiento: 'Próximo vencimiento',
  variacion_precio:    'Variación de precio',
  produccion_sugerida: 'Producción sugerida',
  compra_urgente:      'Compra urgente',
  merma_excesiva:      'Merma excesiva',
  otro:                'Otro',
}

const CLASES_SEVERIDAD: Record<SeveridadAlerta, string> = {
  critica: 'bg-peligro text-white',
  alta:    'bg-advertencia text-texto-inverso',
  media:   'bg-info-suave text-info-texto border border-info-borde',
  baja:    'bg-fondo-hover text-texto-apagado',
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function AlertasCliente() {
  const {
    alertasNoLeidas,
    totalAlertas,
    marcarAlertaLeida,
  } = useApp()

  const {
    isPending: queryPending,
    isError:   queryError,
    isSuccess: querySuccess,
  } = useAlertasActivas()

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
          Alertas
        </h1>
        <p className="text-xs font-sans text-texto-apagado mt-0.5">
          {totalAlertas === 0
            ? 'Sin alertas pendientes'
            : `${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''} sin leer`}
        </p>
      </section>

      {/* ── Aviso de query secundaria (Fase 3.1) ─────────── */}
      {queryError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-3">
          <p className="text-2xs font-sans text-info-texto/70 leading-relaxed">
            El historial completo de alertas estará disponible en Fase 3.2.
            Las alertas activas se muestran en tiempo real desde el sistema.
          </p>
        </section>
      )}

      {/*
       * queryPending y querySuccess no producen UI adicional en Fase 3.1.
       * Los datos reales provienen de useApp() independientemente del estado
       * de useAlertasActivas().
       *
       * TODO (Fase 3.2):
       * - queryPending: mostrar indicador de carga adicional si se necesita.
       * - querySuccess: fusionar datos de la query con alertasNoLeidas.
       */}
      {(queryPending || querySuccess) && null}

      {/* ── Lista de alertas (fuente: useApp) ────────────── */}
      {alertasNoLeidas.length === 0 ? (
        <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-8 text-center">
          <p className="text-sm font-sans font-medium text-texto-secundario">
            Todo en orden
          </p>
          <p className="text-xs font-sans text-texto-apagado mt-1">
            No hay alertas pendientes en este momento.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {alertasNoLeidas.map((alerta) => (
            <div
              key={alerta.id}
              className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3 space-y-2"
            >
              {/* Tipo y severidad */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-sans font-medium text-texto-secundario">
                  {ETIQUETAS_TIPO[alerta.tipo]}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium flex-shrink-0 ${CLASES_SEVERIDAD[alerta.severidad]}`}
                >
                  {alerta.severidad}
                </span>
              </div>

              {/* Mensaje */}
              <p className="text-sm font-sans text-texto-primario leading-snug">
                {alerta.mensaje}
              </p>

              {/* Pie: timestamp y acción */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-2xs font-sans text-texto-apagado">
                  {new Date(alerta.creado_en).toLocaleString('es-CL', {
                    day:    'numeric',
                    month:  'short',
                    hour:   '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <button
                  onClick={() => { void marcarAlertaLeida(alerta.id) }}
                  className="text-2xs font-sans font-medium text-acento
                             active:text-acento/70 transition-colors flex-shrink-0"
                >
                  Marcar como leída
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
  )
      }
