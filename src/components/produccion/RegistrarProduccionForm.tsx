'use client'

/**
 * src/components/produccion/RegistrarProduccionForm.tsx
 *
 * Formulario de registro de producción dentro de un lote activo.
 *
 * La lógica de React Query está completamente encapsulada en:
 * src/hooks/useRegistrarProduccion.ts
 *
 * Este componente es responsable únicamente de:
 * - mantener el estado visual del formulario
 * - renderizar la interfaz
 * - llamar al hook
 */

import { useState, type ChangeEvent }                    from 'react'
import { useRegistrarProduccion, type BodyProduccion }   from '@/hooks/useRegistrarProduccion'
import { useRecetas }                                    from '@/hooks/useDominio'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface CamposForm {
  receta_id:          string
  cantidad_producida: string
  unidad:             string
  notas:              string
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
  const [campos, setCampos] = useState<CamposForm>(ESTADO_INICIAL)
  const recetas = useRecetas()

  const mutacion = useRegistrarProduccion({
    onSuccess: () => setCampos(ESTADO_INICIAL),
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
    const body: BodyProduccion = {
      lote_id:            loteId,
      receta_id:          campos.receta_id.trim() !== ''
                            ? campos.receta_id.trim()
                            : null,
      cantidad_producida: Number(campos.cantidad_producida),
      unidad:             campos.unidad,
      notas:              campos.notas.trim() !== ''
                            ? campos.notas.trim()
                            : null,
    }
    mutacion.registrar(body)
  }

  const esValido =
    campos.cantidad_producida !== '' &&
    Number(campos.cantidad_producida) > 0 &&
    campos.unidad !== ''

  const enviando = mutacion.isPending

  return (
    <div className="space-y-4">

      {/* Selector de receta */}
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
          <option value="">{recetas.isPending ? 'Cargando recetas…' : 'Seleccionar receta…'}</option>
          {(recetas.data ?? []).map((receta) => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}
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
