'use client'

/**
 * src/components/dashboard/DashboardCliente.tsx
 *
 * Contenedor principal del dashboard de ChefOS.
 *
 * Responsabilidades:
 * - Consumir useApp() para datos de contexto disponibles.
 * - Consumir useMetricasDashboard() para métricas de dominio.
 * - Manejar estados de carga, error y éxito de forma no bloqueante.
 *
 * ESTADO ACTUAL (Fase 3.1):
 * fetchMetricasDashboard lanza un error placeholder.
 * El dashboard lo captura y muestra un aviso informativo.
 * La pantalla permanece funcional con los datos de contexto.
 *
 * TODO (Fase 3.2):
 * - Reemplazar secciones placeholder por widgets reales.
 * - Implementar fetchMetricasDashboard con queries reales.
 */

import { useApp }                from '@/providers/AppProvider'
import { useMetricasDashboard }  from '@/hooks/useDominio'

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const ETIQUETAS_ROL: Record<string, string> = {
  dueño:          'Dueño',
  administrador:  'Administrador',
  chef_ejecutivo: 'Chef Ejecutivo',
  chef_cocina:    'Chef de Cocina',
  cocinero:       'Cocinero',
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function DashboardCliente() {
  const {
    usuario,
    restaurante,
    estaOnline,
    totalAlertas,
    accionesPendientes,
  } = useApp()

  const {
    isPending,
    isError,
    isSuccess,
  } = useMetricasDashboard()

  // ── Saludo según hora del día ─────────────────────────────
  const hora   = new Date().getHours()
  const saludo =
    hora < 12 ? 'Buenos días' :
    hora < 19 ? 'Buenas tardes' :
                'Buenas noches'

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Encabezado ───────────────────────────────────── */}
      <section>
        <p className="text-xs font-sans text-texto-apagado mb-0.5">
          {saludo}
        </p>
        <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
          {usuario?.nombre ?? 'Chef'}
        </h1>
        {usuario?.rol && (
          <p className="text-xs font-sans text-texto-apagado mt-0.5">
            {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}
            {restaurante?.nombre ? ` · ${restaurante.nombre}` : ''}
          </p>
        )}
      </section>

      {/* ── Estado operativo ─────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3">

        <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
          <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
            Conexión
          </p>
          <div className="flex items-center gap-2">
            <span
              className={
                estaOnline
                  ? 'w-2 h-2 rounded-full bg-exito flex-shrink-0'
                  : 'w-2 h-2 rounded-full bg-advertencia animate-pulse-suave flex-shrink-0'
              }
            />
            <p className="text-sm font-sans font-medium text-texto-primario">
              {estaOnline ? 'En línea' : 'Sin conexión'}
            </p>
          </div>
          {accionesPendientes > 0 && (
            <p className="text-2xs font-sans text-texto-apagado mt-1.5">
              {accionesPendientes} acción{accionesPendientes !== 1 ? 'es' : ''} pendiente{accionesPendientes !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
          <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
            Alertas
          </p>
          <p className={
            totalAlertas > 0
              ? 'text-xl font-display font-bold text-peligro'
              : 'text-xl font-display font-bold text-texto-primario'
          }>
            {totalAlertas}
          </p>
          <p className="text-2xs font-sans text-texto-apagado mt-0.5">
            {totalAlertas === 0
              ? 'Sin alertas activas'
              : `alerta${totalAlertas !== 1 ? 's' : ''} sin leer`}
          </p>
        </div>

      </section>

      {/* ── Métricas de dominio ───────────────────────────── */}
      <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">

        <div className="px-4 py-3 border-b border-fondo-borde">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Resumen operativo
          </p>
        </div>

        <div className="px-4 py-5">

          {isPending && (
            <div className="space-y-2.5">
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-3/4" />
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/2" />
              <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
            </div>
          )}

          {isError && (
            <div className="rounded-lg bg-info-suave border border-info-borde px-3 py-3">
              <p className="text-xs font-sans font-medium text-info-texto">
                Métricas no disponibles en esta fase
              </p>
              <p className="text-2xs font-sans text-info-texto/70 mt-0.5">
                El resumen operativo estará disponible en Fase 3.2,
                cuando los fetchers de dominio sean implementados.
              </p>
            </div>
          )}

          {isSuccess && (
            /*
             * TODO (Fase 3.2):
             * Reemplazar por widgets reales de métricas:
             * - Producción del día
             * - Ventas del turno
             * - Mermas acumuladas
             * - Stock crítico
             */
            <p className="text-xs font-sans text-texto-apagado">
              Datos disponibles. Widgets pendientes de implementación.
            </p>
          )}

        </div>

      </section>

      {/* ── Plan del restaurante ──────────────────────────── */}
      {restaurante?.plan && (
        <section className="flex items-center justify-between
                            rounded-xl bg-fondo-elevado border border-fondo-borde
                            px-4 py-3">
          <p className="text-xs font-sans text-texto-apagado">
            Plan activo
          </p>
          <span className="px-2.5 py-1 rounded-full bg-acento-suave
                           text-2xs font-sans font-medium text-acento capitalize">
            {restaurante.plan}
          </span>
        </section>
      )}

    </div>
  )
      }
