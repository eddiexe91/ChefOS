/**
 * src/hooks/useRegistrarReceta.ts
 *
 * Hook de dominio para crear una receta completa (receta + ingredientes + pasos).
 *
 * Encapsula completamente la lógica de React Query:
 * - useMutation con tipos explícitos
 * - mutationFn con parseo defensivo del JSON
 * - invalidaciones de caché tras éxito
 *
 * API pública:
 *   registrar(body: CuerpoNuevaReceta): void
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
 *   Extiende FormNuevaReceta (src/types/index.ts) — reutiliza los campos
 *   planos ya existentes, sin duplicarlos — y agrega ingredientes/pasos,
 *   que no existen en ningún tipo compartido todavía (FormNuevaReceta no
 *   los incluye). Mismo patrón que src/app/api/biblioteca/recetas/route.ts,
 *   que define BodyIngrediente/BodyPaso localmente por la misma razón.
 *
 * Invalida tras éxito:
 *   bibliotecaKeys.recetas() → ['biblioteca', 'recetas']
 *   Prefijo oficial ya exportado por src/lib/queries/index.ts — cubre
 *   bibliotecaKeys.recetasFiltradas(filtros) y bibliotecaKeys.receta(id).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bibliotecaKeys }              from '@/lib/queries'
import type {
  FormNuevaReceta,
  UnidadEntrada,
} from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────

export interface IngredienteNuevaReceta {
  producto_id:    string
  cantidad:       number
  unidad_medida:  UnidadEntrada
  es_opcional:    boolean
  orden:          number
  notas?:         string
}

export interface PasoNuevaReceta {
  numero:         number
  titulo:         string
  descripcion:    string
  duracion_min?:  number
  temperatura_c?: number
  tecnica?:       string
  punto_critico?: boolean
  foto_url?:      string
}

export interface CuerpoNuevaReceta extends FormNuevaReceta {
  ingredientes: IngredienteNuevaReceta[]
  pasos:        PasoNuevaReceta[]
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

// Type guard estructural — nunca confía en un cast para validar datos
// recibidos por HTTP. Exige explícitamente que 'data' y 'error' existan
// como propiedades propias, y que 'error' sea exactamente string | null,
// tal como lo declara RespuestaAPI.
function esRespuestaAPIValida(valor: unknown): valor is RespuestaAPI {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false
  }

  if (
    !Object.prototype.hasOwnProperty.call(valor, 'data') ||
    !Object.prototype.hasOwnProperty.call(valor, 'error')
  ) {
    return false
  }

  const error = (valor as Record<string, unknown>).error

  return error === null || typeof error === 'string'
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useRegistrarReceta(opciones?: OpcionesHook) {
  const queryClient = useQueryClient()

  const mutacion = useMutation<RespuestaAPI, Error, CuerpoNuevaReceta>({
    mutationFn: async (body: CuerpoNuevaReceta): Promise<RespuestaAPI> => {
      const response = await fetch('/api/biblioteca/recetas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      // Parseo defensivo: nunca lanzar por intentar leer/parsear el body.
      // Soporta: JSON válido, respuesta vacía, HTML, texto plano,
      // cualquier Content-Type inesperado.
      let texto = ''
      try {
        texto = await response.text()
      } catch {
        texto = ''
      }

      let parseado: unknown = null
      if (texto.trim() !== '') {
        try {
          parseado = JSON.parse(texto)
        } catch {
          parseado = null
        }
      }

      // HTTP no exitoso: usar el mensaje del servidor solo si es realmente
      // un string no vacío; nunca confiar en un cast, siempre en el
      // resultado directo del type guard (necesario para que TypeScript
      // estreche 'parseado' de 'unknown' a RespuestaAPI).
      if (!response.ok) {
        if (esRespuestaAPIValida(parseado)) {
          const mensaje =
            typeof parseado.error === 'string' && parseado.error.trim() !== ''
              ? parseado.error
              : `Error ${response.status} — intenta nuevamente.`
          throw new Error(mensaje)
        }
        throw new Error(`Error ${response.status} — intenta nuevamente.`)
      }

      // HTTP exitoso pero estructura inválida/inesperada (body vacío, JSON
      // malformado, objeto sin 'data'/'error', o 'error' con tipo incorrecto)
      // — nunca se trata como éxito silencioso.
      if (!esRespuestaAPIValida(parseado)) {
        throw new Error('Respuesta inesperada del servidor. Intenta nuevamente.')
      }

      // HTTP exitoso y estructura válida, pero con error de aplicación
      // (por ejemplo, un 2xx que igualmente reporta error en el body).
      if (typeof parseado.error === 'string' && parseado.error.trim() !== '') {
        throw new Error(parseado.error)
      }

      return parseado
    },

    onSuccess: () => {
      // Ejecutar callback del componente primero (ej: reset del formulario)
      opciones?.onSuccess?.()
      // Prefijo oficial de src/lib/queries/index.ts — invalida todas las
      // variantes de bibliotecaKeys.recetasFiltradas(filtros) y
      // bibliotecaKeys.receta(id).
      void queryClient.invalidateQueries({ queryKey: bibliotecaKeys.recetas() })
    },
  })

  return {
    registrar:  (body: CuerpoNuevaReceta) => mutacion.mutate(body),
    isPending:  mutacion.isPending,
    isSuccess:  mutacion.isSuccess,
    isError:    mutacion.isError,
    error:      mutacion.error,
    reset:      () => mutacion.reset(),
  }
}
