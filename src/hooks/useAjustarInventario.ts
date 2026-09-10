/**
 * src/hooks/useAjustarInventario.ts
 *
 * Hook de dominio para registrar un ajuste manual de inventario.
 *
 * Encapsula completamente la lógica de React Query:
 * - useMutation con tipos explícitos
 * - mutationFn con parseo defensivo del JSON
 * - invalidaciones de caché tras éxito
 *
 * API pública:
 *   ajustar(body: FormAjusteInventario): void
 *   isPending: boolean
 *   isSuccess: boolean
 *   isError: boolean
 *   error: Error | null
 *   reset(): void
 *
 * Parámetro opcional:
 *   onSuccess?: () => void   — callback ejecutado tras éxito, antes del reset de queries
 *
 * Contrato del body:
 *   Reutiliza FormAjusteInventario (src/types/index.ts) — no se duplica el
 *   contrato entre frontend y backend.
 *
 * Invalida tras éxito:
 *   inventarioKeys.productos()              → ['inventario', 'productos']
 *   inventarioKeys.movimientos(producto_id) → ['inventario', 'movimientos', { producto_id }]
 *   Prefijos/llaves oficiales ya exportados por src/lib/queries/index.ts —
 *   cubren tanto el listado de productos (stock actualizado) como el
 *   historial de movimientos del producto ajustado.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventarioKeys }              from '@/lib/queries'
import type { FormAjusteInventario }   from '@/types/index'
import { encolarAccion }               from '@/lib/offline/cola'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface RespuestaAPI {
  data:  unknown | null
  error: string | null
}

interface OpcionesHook {
  onSuccess?: () => void
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useAjustarInventario(opciones?: OpcionesHook) {
  const queryClient = useQueryClient()

  const mutacion = useMutation<RespuestaAPI, Error, FormAjusteInventario>({
    mutationFn: async (body: FormAjusteInventario): Promise<RespuestaAPI> => {
      let response: Response
      try {
        response = await fetch('/api/inventario/movimientos', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
      } catch (error) {
        if (typeof window !== 'undefined' && (!window.navigator.onLine || error instanceof TypeError)) {
          await encolarAccion({
            tabla: 'api/inventario/movimientos',
            operacion: 'INSERT',
            payload: { endpoint: '/api/inventario/movimientos', body },
          })
          return { data: { pendiente: true }, error: null }
        }
        throw error
      }

      // Parseo defensivo: nunca lanzar por intentar parsear JSON.
      // Soporta: JSON válido, respuesta vacía, HTML, texto plano,
      // cualquier Content-Type inesperado.
      let json: RespuestaAPI = { data: null, error: null }
      try {
        const texto = await response.text()
        if (texto.trim() !== '') {
          const parseado: unknown = JSON.parse(texto)
          if (
            typeof parseado === 'object' &&
            parseado !== null &&
            'error' in parseado
          ) {
            json = parseado as RespuestaAPI
          }
        }
      } catch {
        // El cuerpo no era JSON válido — json permanece con valores por defecto.
        // La validación de response.ok a continuación producirá el error correcto.
      }

      if (!response.ok || json.error !== null) {
        throw new Error(
          typeof json.error === 'string' && json.error.trim() !== ''
            ? json.error
            : `Error ${response.status} — intenta nuevamente.`
        )
      }

      return json
    },

    onSuccess: (_data, variables) => {
      // Ejecutar callback del componente primero (ej: reset del formulario)
      opciones?.onSuccess?.()
      // Prefijos/llaves oficiales de src/lib/queries/index.ts.
      void queryClient.invalidateQueries({ queryKey: inventarioKeys.productos() })
      void queryClient.invalidateQueries({ queryKey: inventarioKeys.movimientos(variables.producto_id) })
    },
  })

  return {
    ajustar:    (body: FormAjusteInventario) => mutacion.mutate(body),
    isPending:  mutacion.isPending,
    isSuccess:  mutacion.isSuccess,
    isError:    mutacion.isError,
    error:      mutacion.error,
    reset:      () => mutacion.reset(),
  }
}
