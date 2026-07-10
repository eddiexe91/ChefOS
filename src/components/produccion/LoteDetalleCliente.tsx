'use client'

/**
 * src/components/produccion/LoteDetalleCliente.tsx
 *
 * Vista de detalle de un lote de producción.
 *
 * Muestra la información del lote, lista los registros de producción
 * asociados y renderiza el formulario de registro para nuevas entradas.
 *
 * TODO (Fase 3.3 — API Routes):
 * Cuando se implementen las API Routes de producción, el formulario
 * RegistrarProduccionForm pasará de console.log a llamadas reales.
 */

import Link                    from 'next/link'
import { ChevronLeft }         from 'lucide-react'
import { useLoteProduccion, useRegistrosProduccion } from '@/hooks/useDominio'
import RegistrarProduccionForm from '@/components/produccion/RegistrarProduccionForm'

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
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  loteId: string
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function LoteDetalleCliente({ loteId }: Props) {
  const {
    isPending:  lotePending,
    isError:    loteError,
    isSuccess:  loteSuccess,
    data:       lote,
  } = useLoteProduccion(loteId)

  const {
    isPending:  registrosPending,
    isError:    registrosError,
    isSuccess:  registrosSuccess,
    data:       registros,
  } = useRegistrosProduccion({ lote_id: loteId })

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Navegación hacia atrás ────────────────────────── */}
      <Link
        href="/produccion"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-texto-apagado
                   active:text-texto-secundario transition-colors"
      >
        <ChevronLeft size={14} />
        Producción
      </Link>

      {/* ── Estado: cargando lote ─────────────────────────── */}
      {lotePending && (
        <section className="space-y-3">
          <div className="h-5 rounded-full bg-fondo-hover animate-pulse w-1/2" />
          <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-1/3" />
        </section>
      )}

      {/* ── Estado: error lote ───────────────────────────── */}
      {loteError && (
        <section className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
          <p className="text-xs font-sans font-medium text-info-texto">
            No se pudo cargar el lote de producción.
          </p>
          <p className="text-2xs font-sans text-info-texto/70 mt-1">
            Vuelve a la lista e intenta nuevamente.
          </p>
        </section>
      )}

      {/* ── Detalle del lote ─────────────────────────────── */}
      {loteSuccess && lote && (
        <>
          {/* Encabezado */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
                Turno {ETIQUETAS_TURNO[lote.turno] ?? lote.turno}
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-2xs font-sans font-medium flex-shrink-0
                            ${CLASES_ESTADO[lote.estado] ?? 'bg-fondo-hover text-texto-apagado'}`}
              >
                {ETIQUETAS_ESTADO[lote.estado] ?? lote.estado}
              </span>
            </div>
            <p className="text-xs font-sans text-texto-apagado mt-0.5">
              {new Date(lote.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
                weekday: 'long',
                day:     'numeric',
                month:   'long',
              })}
            </p>
          </section>

          {/* Métricas del lote */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Ítems producidos
              </p>
              <p className="text-xl font-display font-bold text-texto-primario">
                {lote.items_producidos}
              </p>
            </div>

            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Costo total
              </p>
              <p className="text-xl font-display font-bold text-texto-primario">
                {lote.costo_total_lote !== undefined && lote.costo_total_lote !== null
                  ? `$${lote.costo_total_lote.toLocaleString('es-CL')}`
                  : '—'
                }
              </p>
            </div>
          </section>

          {/* Responsable */}
          {lote.responsable && (
            <section className="flex items-center justify-between
                                rounded-xl bg-fondo-elevado border border-fondo-borde
                                px-4 py-3">
              <p className="text-xs font-sans text-texto-apagado">
                Responsable
              </p>
              <p className="text-xs font-sans font-medium text-texto-secundario">
                {lote.responsable.nombre}
              </p>
            </section>
          )}

          {/* ── Formulario de registro ────────────────────── */}
          {lote.estado === 'en_progreso' && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
              <div className="px-4 py-3 border-b border-fondo-borde">
                <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
                  Registrar producción
                </p>
              </div>
              <div className="px-4 py-4">
                <RegistrarProduccionForm loteId={loteId} />
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Registros del lote ───────────────────────────── */}
      <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <div className="px-4 py-3 border-b border-fondo-borde">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Producción del turno
          </p>
        </div>

        <div className="px-4 py-4 space-y-3">

          {/* Cargando registros */}
          {registrosPending && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3"
                />
              ))}
            </div>
          )}

          {/* Error registros */}
          {registrosError && (
            <p className="text-xs font-sans text-texto-apagado">
              No se pudieron cargar los registros de este lote.
            </p>
          )}

          {/* Sin registros */}
          {registrosSuccess && registros.length === 0 && (
            <p className="text-xs font-sans text-texto-apagado text-center py-4">
              Sin registros en este turno todavía.
            </p>
          )}

          {/* Lista de registros */}
          {registrosSuccess && registros.length > 0 && registros.map((registro) => (
            <div
              key={registro.id}
              className="flex items-start justify-between gap-3 py-2
                         border-b border-fondo-borde last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-sans font-medium text-texto-primario truncate">
                  {registro.receta?.nombre ?? registro.producto?.nombre ?? 'Sin nombre'}
                </p>
                <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                  {registro.cantidad_producida} {registro.unidad}
                </p>
              </div>
              {(registro.costo_real !== undefined && registro.costo_real !== null) ||
               (registro.costo_produccion !== undefined && registro.costo_produccion !== null) ? (
                <p className="text-xs font-sans font-medium text-texto-secundario flex-shrink-0">
                  ${(registro.costo_real ?? registro.costo_produccion ?? 0)
                    .toLocaleString('es-CL')}
                </p>
              ) : null}
            </div>
          ))}

        </div>
      </section>

    </div>
  )
          }
