/**
 * src/hooks/useLoteDetalle.ts
 *
 * Hook de dominio para la vista de detalle de un lote de producción.
 *
 * Orquesta dos queries simultáneas:
 * - useLoteProduccion(loteId)               → datos del lote
 * - useRegistrosProduccion({ lote_id })     → registros del turno
 *
 * Retorna los resultados completos de React Query sin reconstruirlos,
 * preservando toda la API disponible (error, refetch, isFetching, etc.).
 *
 * La única transformación aplicada es:
 * - registros.data ?? []  → garantiza ProduccionRegistro[] (nunca undefined)
 *
 * El componente únicamente consume esta API sin conocer
 * los detalles de React Keys ni los fetchers.
 */

import { useLoteProduccion, useRegistrosProduccion } from '@/hooks/useDominio'
import type { ProduccionRegistro }                   from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useLoteDetalle(loteId: string) {
  const queryLote      = useLoteProduccion(loteId)
  const queryRegistros = useRegistrosProduccion({ lote_id: loteId })

  return {
    // Resultado completo de React Query para el lote — toda la API disponible
    lote: queryLote,

    // Resultado completo de React Query para los registros,
    // con data normalizada a ProduccionRegistro[] (nunca undefined)
    registros: {
      ...queryRegistros,
      data: (queryRegistros.data ?? []) as ProduccionRegistro[],
    },
  }
}
