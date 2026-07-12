'use client'

/**
 * src/components/produccion/RegistrarProduccionForm.tsx
 *
 * Formulario de registro de producción dentro de un lote activo.
 *
 * ESTADO ACTUAL (Fase 3.3 — UI):
 * El submit imprime los datos en consola.
 * No llama a ninguna API Route, fetch, mutación ni Server Action.
 *
 * TODO (Fase 3.3 — API Routes):
 * Reemplazar console.log por llamada a POST /api/produccion
 * cuando la API Route esté implementada.
 */

import { useState, type ChangeEvent } from 'react'

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setCampos((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = () => {
    const cantidad = Number(campos.cantidad_producida)

    /**
     * TODO (Fase 3.3 — API Routes):
     * Reemplazar este console.log por:
     *   await fetch('/api/produccion', {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify({ lote_id: loteId, ...campos }),
     *   })
     */
    console.log('[ChefOS/produccion] Datos del formulario:', {
      lote_id:            loteId,
      receta_id:          campos.receta_id || null,
      cantidad_producida: cantidad,
      unidad:             campos.unidad,
      notas:              campos.notas || null,
    })
  }

  const esValido =
    campos.cantidad_producida !== '' &&
    Number(campos.cantidad_producida) > 0 &&
    campos.unidad !== ''

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
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     focus:outline-none focus:border-acento transition-colors"
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
          placeholder="0"
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     placeholder:text-texto-apagado
                     focus:outline-none focus:border-acento transition-colors"
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
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     focus:outline-none focus:border-acento transition-colors"
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
          rows={2}
          placeholder="Observaciones opcionales..."
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     placeholder:text-texto-apagado resize-none
                     focus:outline-none focus:border-acento transition-colors"
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        disabled={!esValido}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-acento text-white
                   py-3 px-4 text-sm font-sans font-medium
                   active:bg-acento/90 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Registrar producción
      </button>

    </div>
  )
}
