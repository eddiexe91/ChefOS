'use client'

/**
 * src/components/produccion/RegistrarProduccionForm.tsx
 *
 * Formulario de registro de producción dentro de un lote activo.
 *
 * Conectado a POST /api/produccion.
 * Formato de respuesta esperado: { data: unknown | null, error: string | null }
 *
 * TODO:
 * Cuando se implemente React Query Mutation, reemplazar el fetch
 * manual por useMutation() e invalidar produccionKeys.lotes() tras éxito.
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
  const [campos,      setCampos]      = useState<CamposForm>(ESTADO_INICIAL)
  const [enviando,    setEnviando]    = useState(false)
  const [errorEnvio,  setErrorEnvio]  = useState<string | null>(null)
  const [exitoso,     setExitoso]     = useState(false)

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    // Limpiar mensajes previos al editar
    if (errorEnvio !== null) setErrorEnvio(null)
    if (exitoso)             setExitoso(false)
    setCampos((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (enviando) return

    setEnviando(true)
    setErrorEnvio(null)
    setExitoso(false)

    try {
      const response = await fetch('/api/produccion', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          lote_id:            loteId,
          // receta_id vacío se envía como null — la API lo acepta como campo opcional
          receta_id:          campos.receta_id.trim() !== ''
                                ? campos.receta_id.trim()
                                : null,
          // cantidad_producida se convierte a number antes de enviar
          cantidad_producida: Number(campos.cantidad_producida),
          unidad:             campos.unidad,
          notas:              campos.notas.trim() !== ''
                                ? campos.notas.trim()
                                : null,
        }),
      })

      const json: RespuestaAPI = await response.json() as RespuestaAPI

      if (!response.ok || json.error !== null) {
        // Usar el mensaje de error de la API si está disponible
        setErrorEnvio(
          typeof json.error === 'string' && json.error.trim() !== ''
            ? json.error
            : `Error ${response.status} — intenta nuevamente.`
        )
        return
      }

      // Éxito: limpiar formulario y mostrar confirmación
      setCampos(ESTADO_INICIAL)
      setExitoso(true)

    } catch {
      // Error de red — fetch lanzó antes de recibir respuesta
      setErrorEnvio('Sin conexión. Verifica tu red e intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
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
      {errorEnvio !== null && (
        <div className="rounded-lg bg-peligro-suave border border-peligro-borde px-3 py-2.5">
          <p className="text-xs font-sans font-medium text-peligro-texto">
            {errorEnvio}
          </p>
        </div>
      )}

      {/* Mensaje de éxito */}
      {exitoso && (
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
        onClick={() => { void handleSubmit() }}
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
