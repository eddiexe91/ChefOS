/**
 * src/hooks/useRegistrarProduccion.ts
 *
 * Hook de dominio para registrar producción en un lote activo.
 *
 * Encapsula completamente la lógica de React Query:
 * - useMutation con tipos explícitos
 * - mutationFn con parseo defensivo del JSON
 * - invalidaciones de caché tras éxito
 *
 * API pública:
 *   registrar(body: BodyProduccion): void
 *   isPending: boolean
 *   isSuccess: boolean
 *   isError: boolean
 *   error: Error | null
 *   reset(): void
 *
 * Parámetro opcional:
 *   onSuccess?: () => void   — callback ejecutado tras éxito, antes del reset de queries
 *
 * Invalida tras éxito:
 *   produccionKeys.lotes()        → ['produccion', 'lotes']
 *   ['produccion', 'registros']   → prefijo de todos los registros
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produccionKeys }              from '@/lib/queries'
import { encolarAccion }               from '@/lib/offline/cola'

// ─────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────

export interface BodyProduccion {
  lote_id:            string
  receta_id:          string | null
  cantidad_producida: number
  unidad:             string
  notas:              string | null
}

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

export function useRegistrarProduccion(opciones?: OpcionesHook) {
  const queryClient = useQueryClient()

  const mutacion = useMutation<RespuestaAPI, Error, BodyProduccion>({
    mutationFn: async (body: BodyProduccion): Promise<RespuestaAPI> => {
      let response: Response
      try {
        response = await fetch('/api/produccion', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
      } catch (error) {
        if (typeof window !== 'undefined' && (!window.navigator.onLine || error instanceof TypeError)) {
          await encolarAccion({
            tabla: 'api/produccion',
            operacion: 'INSERT',
            payload: { endpoint: '/api/produccion', body },
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

    onSuccess: () => {
      // Ejecutar callback del componente primero (ej: reset del formulario)
      opciones?.onSuccess?.()
      // Invalidar queries de producción para refrescar la UI
      void queryClient.invalidateQueries({ queryKey: produccionKeys.lotes() })
      // Prefijo común a todos los registros de producción.
      // React Query v5 invalida por prefijo: cubre produccionKeys.registros(...)
      // y produccionKeys.registro(id) sin necesidad de modificar produccionKeys.
      void queryClient.invalidateQueries({ queryKey: ['produccion', 'registros'] })
    },
  })

  return {
    registrar:  (body: BodyProduccion) => mutacion.mutate(body),
    isPending:  mutacion.isPending,
    isSuccess:  mutacion.isSuccess,
    isError:    mutacion.isError,
    error:      mutacion.error,
    reset:      () => mutacion.reset(),
  }
}
