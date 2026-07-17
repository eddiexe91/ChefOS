'use client'

/**
 * src/components/produccion/RegistrarProduccionForm.tsx
 *
 * Formulario de registro de producción dentro de un lote activo.
 *
 * Conectado a POST /api/produccion mediante useMutation de React Query v5.
 *
 * Invalida tras éxito:
 * - produccionKeys.lotes()           → ['produccion', 'lotes']
 * - ['produccion', 'registros']      → prefijo de todos los registros
 *
 * El parseo de la respuesta es defensivo: nunca lanza por intentar parsear
 * JSON sobre respuestas con Content-Type incorrecto, vacías o de error.
 *
 * TODO:
 * Extraer la mutationFn a un hook personalizado cuando se necesite
 * reutilizar este registro en otras pantallas.
 */

import { useState, type ChangeEvent }  from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produccionKeys }              from '@/lib/queries'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface CamposForm {
  receta_id:          string
  cantidad_producida: string
  unidad:             string
  notas:              string
}

interface BodyProduccion {
  lote_id:            string
  receta_id:          string | null
  cantidad_producida: number
  unidad:             string
  notas:              string | null
}

interface RespuestaAPI {
  data:  unknown | null
  error: string | null
}

const ESTADO_INICIAL: CamposForm = {
  receta_id:          '',
  cantidad_producida: '',
  unidad:             'porciones',
  notas:              '',
}

const UNIDADES_COMUNES = [
  'porciones',
  'kg',
  'g',
  'lt',
  'ml',
  'unidades',
] as const

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  loteId: string
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function RegistrarProduccionForm({ loteId }: Props) {
  const queryClient = useQueryClient()
  const [campos, setCampos] = useState<CamposForm>(ESTADO_INICIAL)

  const mutacion = useMutation<RespuestaAPI, Error, BodyProduccion>({
    mutationFn: async (body: BodyProduccion): Promise<RespuestaAPI> => {
      const response = await fetch('/api/produccion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

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
      // Invalidar queries de producción para refrescar la UI
      void queryClient.invalidateQueries({ queryKey: produccionKeys.lotes() })
      // Prefijo común a todos los registros — invalida cualquier combinación de filtros.
      // React Query v5 hace matching por prefijo: ['produccion', 'registros'] cubre
      // produccionKeys.registros({ lote_id: ... }) y produccionKeys.registro(id).
      void queryClient.invalidateQueries({ queryKey: ['produccion', 'registros'] })
      // Resetear formulario tras éxito
      setCampos(ESTADO_INICIAL)
    },
  })

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    // Limpiar estado de mutación al editar tras un intento
    if (mutacion.isError || mutacion.isSuccess) {
      mutacion.reset()
    }
    setCampos((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = () => {
    mutacion.mutate({
      lote_id:            loteId,
      receta_id:          campos.receta_id.trim() !== ''
                            ? campos.receta_id.trim()
                            : null,
      cantidad_producida: Number(campos.cantidad_producida),
      unidad:             campos.unidad,
      notas:              campos.notas.trim() !== ''
                            ? campos.notas.trim()
                            : null,
    })
  }

  const esValido =
    campos.cantidad_producida !== '' &&
    Number(campos.cantidad_producida) > 0 &&
    campos.unidad !== ''

  const enviando = mutacion.isPending

  return (
    <div className="space-y-4">

      {/* Selector de receta — placeholder */}
      <div className="space-y-1.5">
        <label
          htmlFor="receta_id"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Receta
        </label>
        <select
          id="receta_id"
          name="receta_id"
          value={campos.receta_id}
          onChange={handleChange}
          disabled={enviando}
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     focus:outline-none focus:border-acento transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            Seleccionar receta...
          </option>
        </select>
        <p className="text-2xs font-sans text-texto-apagado">
          Opcional — deja vacío para producción libre
        </p>
      </div>

      {/* Cantidad */}
      <div className="space-y-1.5">
        <label
          htmlFor="cantidad_producida"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Cantidad producida <span className="text-peligro">*</span>
        </label>
        <input
          id="cantidad_producida"
          name="cantidad_producida"
          type="number"
          inputMode="decimal"
          min="0.001"
          step="0.001"
          value={campos.cantidad_producida}
          onChange={handleChange}
          disabled={enviando}
          placeholder="0"
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     placeholder:text-texto-apagado
                     focus:outline-none focus:border-acento transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Unidad */}
      <div className="space-y-1.5">
        <label
          htmlFor="unidad"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Unidad <span className="text-peligro">*</span>
        </label>
        <select
          id="unidad"
          name="unidad"
          value={campos.unidad}
          onChange={handleChange}
          disabled={enviando}
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     focus:outline-none focus:border-acento transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {UNIDADES_COMUNES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label
          htmlFor="notas"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          value={campos.notas}
          onChange={handleChange}
          disabled={enviando}
          rows={2}
          placeholder="Observaciones opcionales..."
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     placeholder:text-texto-apagado resize-none
                     focus:outline-none focus:border-acento transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Mensaje de error */}
      {mutacion.isError && (
        <div className="rounded-lg bg-peligro-suave border border-peligro-borde px-3 py-2.5">
          <p className="text-xs font-sans font-medium text-peligro-texto">
            {mutacion.error instanceof Error
              ? mutacion.error.message
              : 'Error al registrar. Intenta nuevamente.'
            }
          </p>
        </div>
      )}

      {/* Mensaje de éxito */}
      {mutacion.isSuccess && (
        <div className="rounded-lg bg-exito-suave border border-exito-borde px-3 py-2.5">
          <p className="text-xs font-sans font-medium text-exito-texto">
            Producción registrada correctamente.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        disabled={!esValido || enviando}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-acento text-white
                   py-3 px-4 text-sm font-sans font-medium
                   active:bg-acento/90 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Registrando...' : 'Registrar producción'}
      </button>

    </div>
  )
}
