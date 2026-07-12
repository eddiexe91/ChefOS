'use client'

/**
 * src/components/produccion/LoteDetalleCliente.tsx
 *
 * Vista de detalle de un lote de producción.
 *
 * Tipos verificados:
 * - ProduccionLote: id, fecha, turno, estado, items_producidos,
 *   costo_total_lote?, responsable?, notas? — todos confirmados.
 * - ProduccionRegistro: id, cantidad_producida, unidad, costo_real?,
 *   costo_produccion?, porciones_reales?, receta?.nombre,
 *   producto?.nombre — todos opcionales correctamente manejados.
 *
 * Riesgos corregidos:
 * - data de useQuery desestructurada puede ser undefined.
 *   Se usa guard `lote &&` antes de acceder a sus propiedades.
 * - costo_total_lote, costo_real, costo_produccion son opcionales.
 *   Se usan guards explícitos antes de mostrar.
 */

import Link                                           from 'next/link'
import { ChevronLeft, Package, ClipboardList }        from 'lucide-react'
import { useLoteProduccion, useRegistrosProduccion }  from '@/hooks/useDominio'
import RegistrarProduccionForm                        from '@/components/produccion/RegistrarProduccionForm'

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

  // registros puede ser undefined — base segura
  const listaRegistros = registros ?? []

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
      {lotePending && (
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
      {/* Guard explícito `lote &&`: data puede ser undefined aunque isSuccess=true al desestructurar */}
      {loteSuccess && lote && (
        <>
          {/* Encabezado */}
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-display font-bold text-texto-primario leading-tight">
                  Turno {ETIQUETAS_TURNO[lote.turno] ?? lote.turno}
                </h1>
                <p className="text-xs font-sans text-texto-apagado mt-0.5">
                  {new Date(lote.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day:     'numeric',
                    month:   'long',
                  })}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-2xs font-sans font-medium
                            flex-shrink-0 mt-1
                            ${CLASES_ESTADO[lote.estado] ?? 'bg-fondo-hover text-texto-apagado'}`}
              >
                {ETIQUETAS_ESTADO[lote.estado] ?? lote.estado}
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
                {lote.items_producidos}
              </p>
            </div>

            <div className="rounded-xl bg-fondo-elevado border border-fondo-borde p-4">
              <p className="text-2xs font-sans text-texto-apagado uppercase tracking-wide mb-1">
                Costo total
              </p>
              <p className="text-2xl font-display font-bold text-texto-primario">
                {lote.costo_total_lote !== undefined && lote.costo_total_lote !== null
                  ? `$${lote.costo_total_lote.toLocaleString('es-CL')}`
                  : '—'
                }
              </p>
            </div>
          </section>

          {/* Responsable y notas */}
          {(lote.responsable?.nombre ?? lote.notas) && (
            <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-3 space-y-2">
              {lote.responsable?.nombre && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-sans text-texto-apagado">Responsable</p>
                  <p className="text-xs font-sans font-medium text-texto-secundario">
                    {lote.responsable.nombre}
                  </p>
                </div>
              )}
              {lote.notas && (
                <div>
                  <p className="text-2xs font-sans text-texto-apagado mb-0.5">Notas</p>
                  <p className="text-xs font-sans text-texto-secundario leading-relaxed">
                    {lote.notas}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Formulario de registro — solo si lote en progreso */}
          {lote.estado === 'en_progreso' && (
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
          {registrosPending && (
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
          {registrosError && (
            <p className="text-xs font-sans text-texto-apagado py-2">
              No se pudieron cargar los registros de este lote.
            </p>
          )}

          {/* Sin registros */}
          {registrosSuccess && listaRegistros.length === 0 && (
            <p className="text-xs font-sans text-texto-apagado text-center py-4">
              Sin registros en este turno todavía.
            </p>
          )}

          {/* Lista de registros */}
          {registrosSuccess && listaRegistros.length > 0 && (
            <div className="space-y-3">
              {listaRegistros.map((registro) => {
                // Nombre: preferir receta, luego producto, luego fallback
                const nombre =
                  registro.receta?.nombre ??
                  registro.producto?.nombre ??
                  'Sin nombre'

                // Costo: preferir costo_real, luego costo_produccion
                const costo = registro.costo_real ?? registro.costo_produccion

                return (
                  <div
                    key={registro.id}
                    className="flex items-start justify-between gap-3 py-2.5
                               border-b border-fondo-borde last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-sans font-medium text-texto-primario truncate">
                        {nombre}
                      </p>
                      <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                        {registro.cantidad_producida} {registro.unidad}
                        {registro.porciones_reales !== undefined &&
                         registro.porciones_reales !== null && (
                          <> · {registro.porciones_reales} porción{registro.porciones_reales !== 1 ? 'es' : ''}</>
                        )}
                      </p>
                      {registro.responsable?.nombre && (
                        <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                          {registro.responsable.nombre}
                        </p>
                      )}
                    </div>

                    {costo !== undefined && costo !== null && (
                      <p className="text-xs font-sans font-medium text-texto-secundario flex-shrink-0">
                        ${costo.toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </section>

    </div>
  )
}
