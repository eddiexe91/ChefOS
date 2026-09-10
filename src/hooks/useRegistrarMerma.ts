/**
 * src/hooks/useRegistrarMerma.ts
 *
 * Hook de dominio para registrar una merma de inventario.
 *
 * Encapsula completamente la lógica de React Query:
 * - useMutation con tipos explícitos
 * - mutationFn con parseo defensivo del JSON
 * - invalidaciones de caché tras éxito
 *
 * API pública:
 *   registrar(body: FormNuevaMerma): void
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
 *   Reutiliza FormNuevaMerma (src/types/index.ts) — no se duplica el contrato
 *   entre frontend y backend.
 *
 * Invalida tras éxito:
 *   mermasKeys.all → ['mermas']
 *   Prefijo oficial ya exportado por src/lib/queries/index.ts — cubre
 *   mermasKeys.lista(cualquier filtro) y mermasKeys.merma(id).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mermasKeys }                  from '@/lib/queries'
import type { FormNuevaMerma }         from '@/types/index'
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

export function useRegistrarMerma(opciones?: OpcionesHook) {
  const queryClient = useQueryClient()

  const mutacion = useMutation<RespuestaAPI, Error, FormNuevaMerma>({
    mutationFn: async (body: FormNuevaMerma): Promise<RespuestaAPI> => {
      let response: Response
      try {
        response = await fetch('/api/mermas', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
      } catch (error) {
        if (typeof window !== 'undefined' && (!window.navigator.onLine || error instanceof TypeError)) {
          await encolarAccion({
            tabla: 'api/mermas',
            operacion: 'INSERT',
            payload: { endpoint: '/api/mermas', body },
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
      // Prefijo oficial de src/lib/queries/index.ts — invalida todas las
      // variantes de mermasKeys.lista(filtros) y mermasKeys.merma(id).
      void queryClient.invalidateQueries({ queryKey: mermasKeys.all })
    },
  })

  return {
    registrar:  (body: FormNuevaMerma) => mutacion.mutate(body),
    isPending:  mutacion.isPending,
    isSuccess:  mutacion.isSuccess,
    isError:    mutacion.isError,
    error:      mutacion.error,
    reset:      () => mutacion.reset(),
  }
}
