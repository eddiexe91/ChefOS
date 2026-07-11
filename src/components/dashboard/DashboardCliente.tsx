'use client'

/**
 * src/components/dashboard/DashboardCliente.tsx
 *
 * Contenedor principal del dashboard de ChefOS.
 *
 * Corrección aplicada:
 * - Añadido guard `&& data` antes de acceder a data.briefing.
 *   Razón: al desestructurar { isSuccess, data } de useQuery, TypeScript
 *   no puede narrowear data a MetricasDashboard (no undefined) basándose
 *   solo en isSuccess === true. El guard explícito `&& data` resuelve
 *   el posible error de compilación bajo strictNullChecks.
 *
 * Datos de contexto (useApp):
 * - usuario: Pick<Usuario,'id'|'nombre'|'rol'|'restaurante_id'|'avatar_url'> | null
 * - restaurante: Pick<Restaurante,'id'|'nombre'|'plan'> | null
 * - estaOnline: boolean
 * - totalAlertas: number
 * - accionesPendientes: number
 *
 * Datos de dominio (useMetricasDashboard):
 * - data.briefing: Briefing | null  (cuando data !== undefined)
 * - data.cierre: null
 * - data.resumen: null
 */

import Link                     from 'next/link'
import { useApp }               from '@/providers/AppProvider'
import { useMetricasDashboard } from '@/hooks/useDominio'
import BriefingCard             from '@/components/dashboard/BriefingCard'
import StockCriticoWidget       from '@/components/dashboard/StockCriticoWidget'

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
    data,
  } = useMetricasDashboard()

  const hora   = new Date().getHours()
  const saludo =
    hora < 12 ? 'Buenos días'   :
    hora < 19 ? 'Buenas tardes' :
                'Buenas noches'

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── 1. Saludo ────────────────────────────────────── */}
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

      {/* ── 2. Estado de conexión ────────────────────────── */}
      <section className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={
              estaOnline
                ? 'w-2 h-2 rounded-full bg-exito flex-shrink-0'
                : 'w-2 h-2 rounded-full bg-advertencia animate-pulse-suave flex-shrink-0'
            }
          />
          <p className="text-xs font-sans text-texto-apagado">
            {estaOnline ? 'En línea' : 'Sin conexión'}
          </p>
        </div>
        {accionesPendientes > 0 && (
          <p className="text-xs font-sans text-texto-apagado">
            · {accionesPendientes} acción{accionesPendientes !== 1 ? 'es' : ''} pendiente{accionesPendientes !== 1 ? 's' : ''}
          </p>
        )}
      </section>

      {/* ── 3. Briefing ──────────────────────────────────── */}
      <section>
        {isPending && (
          <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4 space-y-3">
            <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
            <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
            <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/2" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
            <p className="text-xs font-sans font-medium text-info-texto">
              No se pudo cargar el briefing del turno.
            </p>
            <p className="text-2xs font-sans text-info-texto/70 mt-1">
              El resto del dashboard sigue disponible.
            </p>
          </div>
        )}

        {/*
         * Guard explícito `&& data` necesario bajo strictNullChecks:
         * desestructurar { isSuccess, data } rompe el narrowing de TypeScript
         * y data permanece como MetricasDashboard | undefined.
         * El guard `&& data` garantiza que data es MetricasDashboard
         * antes de acceder a data.briefing.
         */}
        {isSuccess && data && (
          <BriefingCard briefing={data.briefing} />
        )}
      </section>

      {/* ── 4. Stock crítico ─────────────────────────────── */}
      <StockCriticoWidget />

      {/* ── 5. Alertas ───────────────────────────────────── */}
      <section className="flex items-center justify-between
                          rounded-xl bg-fondo-elevado border border-fondo-borde
                          px-4 py-3">
        <p className="text-xs font-sans text-texto-apagado">
          Alertas sin leer
        </p>
        <Link
          href="/alertas"
          className="flex items-center gap-2"
        >
          <span
            className={
              totalAlertas > 0
                ? 'text-lg font-display font-bold text-peligro'
                : 'text-lg font-display font-bold text-texto-primario'
            }
          >
            {totalAlertas}
          </span>
          {totalAlertas > 0 && (
            <span className="text-2xs font-sans text-acento">
              Ver →
            </span>
          )}
        </Link>
      </section>

      {/* ── 6. Plan activo ───────────────────────────────── */}
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
