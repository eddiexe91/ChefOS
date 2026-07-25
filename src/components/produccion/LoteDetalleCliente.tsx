'use client'

/**
 * src/components/produccion/LoteDetalleCliente.tsx
 *
 * Vista de detalle de un lote de producción.
 *
 * Responsabilidad exclusiva: presentación.
 *
 * Orquestación de queries:    src/hooks/useLoteDetalle.ts
 * Transformación de dominio:  src/lib/produccion.ts
 * Constantes de presentación: src/lib/produccionUI.ts
 */

import { useMemo }                             from 'react'
import Link                                    from 'next/link'
import { ChevronLeft, Package, ClipboardList } from 'lucide-react'
import { useLoteDetalle }                      from '@/hooks/useLoteDetalle'
import { prepararRegistros, parsearFechaLocal } from '@/lib/produccion'
import { ETIQUETAS_TURNO, ETIQUETAS_ESTADO, CLASES_ESTADO } from '@/lib/produccionUI'
import RegistrarProduccionForm                 from '@/components/produccion/RegistrarProduccionForm'

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
  const { lote, registros } = useLoteDetalle(loteId)

  const registrosPreparados = useMemo(
    () => prepararRegistros(registros.data),
    [registros.data]
  )

  return (
    <div className="px-4 pt-6 pb-28 space-y-6 max-w-lg mx-auto">

      {/* ── Navegación ───────────────────────────────────── */}
      <Link
        href="/produccion"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-texto-apagado
                   active:text-texto-secundario transition-colors"
      >
        <ChevronLeft size={14} />
        Producción
      </Link>

      {/* ── Estado: cargando lote ────────────────────────── */}
      {lote.isPending && (
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

      {/* ── Estado: error lote ───────────────────────────── */}
      {lote.isError && (
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
      {lote.isSuccess && lote.data && (
        <>
          {/* Encabezado */}
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
                  Turno {ETIQUETAS_TURNO[lote.data.turno]}
                </h1>
                <p className="text-xs font-sans text-texto-apagado mt-0.5">
                  {parsearFechaLocal(lote.data.fecha).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day:     'numeric',
                    month:   'long',
                  })}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-2xs font-sans font-medium
                            flex-shrink-0 mt-1
                            ${CLASES_ESTADO[lote.data.estado]}`}
              >
                {ETIQUETAS_ESTADO[lote.data.estado]}
              </span>
            </div>
          </section>

          {/* Métricas del lote */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Ítems producidos
              </p>
              <p className="text-2xl font-display font-bold text-texto-primario">
                {lote.data.items_producidos}
              </p>
            </div>

            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Costo total
              </p>
              <p className="text-2xl font-display font-bold text-texto-primario">
                {lote.data.costo_total_lote !== undefined && lote.data.costo_total_lote !== null
                  ? `$${lote.data.costo_total_lote.toLocaleString('es-CL')}`
                  : '—'
                }
              </p>
            </div>
          </section>

          {/* Responsable y notas */}
          {(lote.data.responsable?.nombre ?? lote.data.notas) && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3 space-y-2">
              {lote.data.responsable?.nombre && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-sans text-texto-apagado">Responsable</p>
                  <p className="text-xs font-sans font-medium text-texto-secundario">
                    {lote.data.responsable.nombre}
                  </p>
                </div>
              )}
              {lote.data.notas && (
                <div>
                  <p className="text-2xs font-sans text-texto-apagado mb-0.5">Notas</p>
                  <p className="text-xs font-sans text-texto-secundario leading-relaxed">
                    {lote.data.notas}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Formulario de registro — solo si lote en progreso */}
          {lote.data.estado === 'en_progreso' && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
              <div className="px-4 py-3 border-b border-fondo-borde flex items-center gap-2">
                <Package size={14} className="text-texto-apagado" />
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

      {/* ── Registros del turno ──────────────────────────── */}
      <section className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <div className="px-4 py-3 border-b border-fondo-borde flex items-center gap-2">
          <ClipboardList size={14} className="text-texto-apagado" />
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Producción del turno
          </p>
        </div>

        <div className="px-4 py-3">

          {/* Cargando */}
          {registros.isPending && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 rounded-full bg-fondo-hover animate-pulse w-2/3" />
                    <div className="h-2.5 rounded-full bg-fondo-hover animate-pulse w-1/3" />
                  </div>
                  <div className="h-3 w-16 rounded-full bg-fondo-hover animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {registros.isError && (
            <p className="text-xs font-sans text-texto-apagado py-2">
              No se pudieron cargar los registros de este lote.
            </p>
          )}

          {/* Sin registros */}
          {registros.isSuccess && registrosPreparados.length === 0 && (
            <p className="text-xs font-sans text-texto-apagado text-center py-4">
              Sin registros en este turno todavía.
            </p>
          )}

          {/* Lista de registros */}
          {registros.isSuccess && registrosPreparados.length > 0 && (
            <div className="space-y-3">
              {registrosPreparados.map((registro) => (
                <div
                  key={registro.id}
                  className="flex items-start justify-between gap-3 py-2.5
                             border-b border-fondo-borde last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-sans font-medium text-texto-primario truncate">
                      {registro.nombre}
                    </p>
                    <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                      {registro.cantidad} {registro.unidad}
                      {registro.porciones !== null && (
                        <> · {registro.porciones} porción{registro.porciones !== 1 ? 'es' : ''}</>
                      )}
                    </p>
                    {registro.responsable !== null && (
                      <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                        {registro.responsable}
                      </p>
                    )}
                  </div>

                  {registro.costo !== undefined && registro.costo !== null && (
                    <p className="text-xs font-sans font-medium text-texto-secundario flex-shrink-0">
                      ${registro.costo.toLocaleString('es-CL')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  )
}
