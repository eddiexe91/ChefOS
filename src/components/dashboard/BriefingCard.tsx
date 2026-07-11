'use client'

/**
 * src/components/dashboard/BriefingCard.tsx
 *
 * Widget de briefing del turno actual.
 *
 * Muestra la producción sugerida, compras sugeridas y riesgos
 * generados por IA para el día actual.
 *
 * Si briefing es null, muestra estado vacío elegante.
 * Si alguna lista viene vacía, muestra "Sin recomendaciones para hoy."
 *
 * Tipos utilizados verificados contra src/types/index.ts:
 * - Briefing: fecha (string), turno (TurnoServicio), produccion_sugerida,
 *   compras_sugeridas, riesgos, alertas — todos confirmados.
 */

import type { Briefing } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const ETIQUETAS_TURNO: Record<string, string> = {
  mañana: 'Mañana',
  tarde:  'Tarde',
  noche:  'Noche',
}

const CLASES_NIVEL: Record<string, string> = {
  critica: 'bg-peligro text-white',
  alta:    'bg-advertencia text-texto-inverso',
  media:   'bg-info-suave text-info-texto border border-info-borde',
  baja:    'bg-fondo-hover text-texto-apagado',
}

// ─────────────────────────────────────────────────────────────
// Subcomponente
// ─────────────────────────────────────────────────────────────

function ListaVacia() {
  return (
    <p className="text-xs font-sans text-texto-apagado py-2">
      Sin recomendaciones para hoy.
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  briefing: Briefing | null
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function BriefingCard({ briefing }: Props) {

  if (!briefing) {
    return (
      <section className="rounded-xl bg-fondo-elevado border border-fondo-borde px-4 py-6 text-center">
        <p className="text-sm font-sans font-medium text-texto-secundario">
          Sin briefing para hoy
        </p>
        <p className="text-xs font-sans text-texto-apagado mt-1 leading-relaxed">
          El briefing del turno se genera automáticamente.
          Vuelve a consultar más tarde.
        </p>
      </section>
    )
  }

  // fecha es string 'YYYY-MM-DD' — concatenar 'T00:00:00' evita desfase de zona horaria
  const fechaFormateada = new Date(briefing.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })

  return (
    <section className="space-y-4">

      {/* Encabezado */}
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-sans font-medium text-texto-secundario capitalize">
          {fechaFormateada}
        </h2>
        <span className="text-2xs font-sans text-texto-apagado flex-shrink-0">
          Turno {ETIQUETAS_TURNO[briefing.turno] ?? briefing.turno}
        </span>
      </div>

      {/* Producción sugerida */}
      <div className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <div className="px-4 py-3 border-b border-fondo-borde">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Producción sugerida
          </p>
        </div>
        <div className="px-4 py-3 space-y-3">
          {briefing.produccion_sugerida.length === 0 ? (
            <ListaVacia />
          ) : (
            briefing.produccion_sugerida.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-sans font-medium text-texto-primario truncate">
                    {item.nombre}
                  </p>
                  <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                    {item.cantidad} {item.unidad}
                    {item.razon ? ` · ${item.razon}` : ''}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium
                              flex-shrink-0 ${CLASES_NIVEL[item.prioridad] ?? CLASES_NIVEL.baja}`}
                >
                  {item.prioridad}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Compras sugeridas */}
      <div className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
        <div className="px-4 py-3 border-b border-fondo-borde">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Compras sugeridas
          </p>
        </div>
        <div className="px-4 py-3 space-y-3">
          {briefing.compras_sugeridas.length === 0 ? (
            <ListaVacia />
          ) : (
            briefing.compras_sugeridas.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Campo correcto: 'producto' (string), no 'nombre' */}
                  <p className="text-sm font-sans font-medium text-texto-primario truncate">
                    {item.producto}
                  </p>
                  <p className="text-2xs font-sans text-texto-apagado mt-0.5">
                    {/* Campo correcto: 'cantidad_sugerida', no 'cantidad' */}
                    {item.cantidad_sugerida} {item.unidad}
                    {item.razon ? ` · ${item.razon}` : ''}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium
                              flex-shrink-0 ${CLASES_NIVEL[item.urgencia] ?? CLASES_NIVEL.baja}`}
                >
                  {item.urgencia}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Riesgos — solo si existen */}
      {briefing.riesgos.length > 0 && (
        <div className="rounded-xl bg-fondo-elevado border border-fondo-borde overflow-hidden">
          <div className="px-4 py-3 border-b border-fondo-borde">
            <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
              Riesgos del turno
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {briefing.riesgos.map((riesgo, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-sans font-medium text-texto-secundario truncate">
                    {riesgo.tipo}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-2xs font-sans font-medium
                                flex-shrink-0 ${CLASES_NIVEL[riesgo.severidad] ?? CLASES_NIVEL.baja}`}
                  >
                    {riesgo.severidad}
                  </span>
                </div>
                <p className="text-2xs font-sans text-texto-apagado leading-relaxed">
                  {riesgo.descripcion}
                </p>
                {riesgo.accion_sugerida && (
                  <p className="text-2xs font-sans text-acento">
                    → {riesgo.accion_sugerida}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  )
      }
