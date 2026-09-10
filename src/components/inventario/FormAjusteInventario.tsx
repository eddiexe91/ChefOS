'use client'

/**
 * src/components/inventario/FormAjusteInventario.tsx
 *
 * Formulario de ajuste manual de inventario — un solo paso:
 * producto, cantidad física, unidad, motivo opcional.
 *
 * La lógica de React Query está completamente encapsulada en:
 * src/hooks/useAjustarInventario.ts
 *
 * Este componente es responsable únicamente de:
 * - mantener el estado visual del formulario
 * - renderizar la interfaz
 * - llamar al hook
 *
 * Mismo patrón visual y de composición que
 * src/components/mermas/MermaFormCliente.tsx, sin pasos (el ROADMAP no
 * documenta un wizard para el ajuste de inventario).
 *
 * Prop opcional productoId — mismo patrón que
 * RegistrarProduccionForm({ loteId }): cuando se provee, el componente se usa
 * embebido en una vista de detalle de producto ya determinado (oculta el
 * selector, no depende de useProductos() para validar, usa productoId
 * directamente como producto_id del body). Cuando no se provee, conserva el
 * comportamiento standalone original sin cambios.
 *
 * Nota: el tipo FormAjusteInventario (src/types/index.ts) se importa con
 * alias porque coincide con el nombre de este archivo/componente.
 */

import { useState, useEffect, type ChangeEvent }              from 'react'
import { useAjustarInventario }                               from '@/hooks/useAjustarInventario'
import { useProductos }                                       from '@/hooks/useDominio'
import type { FormAjusteInventario as CuerpoAjusteInventario, UnidadEntrada } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface CamposForm {
  producto_id:     string
  cantidad_fisica: string
  unidad_medida:   string
  motivo:          string
}

const ESTADO_INICIAL: CamposForm = {
  producto_id:     '',
  cantidad_fisica: '',
  unidad_medida:   'g',
  motivo:          '',
}

const UNIDADES_AJUSTE: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface Props {
  productoId?: string
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function FormAjusteInventario({ productoId }: Props = {}) {
  const estadoInicialConProducto: CamposForm = {
    ...ESTADO_INICIAL,
    producto_id: productoId ?? '',
  }

  const [campos, setCampos] = useState<CamposForm>(estadoInicialConProducto)

  useEffect(() => {
    if (productoId !== undefined) {
      setCampos((prev) => ({ ...prev, producto_id: productoId }))
    }
  }, [productoId])

  const {
    data:      productos,
    isPending: cargandoProductos,
    isError:   errorProductos,
  } = useProductos()

  const mutacion = useAjustarInventario({
    onSuccess: () => {
      setCampos({
        ...ESTADO_INICIAL,
        producto_id: productoId ?? '',
      })
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

  const cantidadNumerica = Number(campos.cantidad_fisica)

  const productoValido = productoId
    ? true
    : campos.producto_id !== '' && !cargandoProductos && !errorProductos

  const esValido =
    productoValido &&
    campos.cantidad_fisica !== '' &&
    !Number.isNaN(cantidadNumerica) &&
    cantidadNumerica >= 0 &&
    campos.unidad_medida !== ''

  const enviando = mutacion.isPending

  const handleSubmit = () => {
    if (!esValido) {
      return
    }

    const body: CuerpoAjusteInventario = {
      producto_id:     productoId ?? campos.producto_id,
      cantidad_fisica: cantidadNumerica,
      unidad_medida:   campos.unidad_medida as UnidadEntrada,
      ...(campos.motivo.trim() !== '' ? { motivo: campos.motivo.trim() } : {}),
    }
    mutacion.ajustar(body)
  }

  return (
    <div className="space-y-4">

      {/* ── Producto (oculto cuando productoId ya viene dado) ── */}
      {!productoId && (
        <div className="space-y-1.5">
          <label
            htmlFor="producto_id"
            className="text-xs font-sans font-medium text-texto-secundario"
          >
            Producto <span className="text-peligro">*</span>
          </label>

          {cargandoProductos && (
            <p className="text-xs font-sans text-texto-apagado">
              Cargando productos...
            </p>
          )}

          {errorProductos && (
            <div className="rounded-xl bg-info-suave border border-info-borde px-4 py-4">
              <p className="text-xs font-sans font-medium text-info-texto">
                No se pudieron cargar los productos
              </p>
              <p className="text-2xs font-sans text-info-texto/70 mt-1 leading-relaxed">
                Verifica tu conexión e intenta nuevamente.
              </p>
            </div>
          )}

          {!cargandoProductos && !errorProductos && (
            <select
              id="producto_id"
              name="producto_id"
              value={campos.producto_id}
              onChange={handleChange}
              disabled={enviando}
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2.5 text-sm font-sans text-texto-primario
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                Seleccionar producto...
              </option>
              {(productos ?? []).map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Cantidad física ──────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="cantidad_fisica"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Cantidad física contada <span className="text-peligro">*</span>
        </label>
        <input
          id="cantidad_fisica"
          name="cantidad_fisica"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          value={campos.cantidad_fisica}
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

      {/* ── Unidad ───────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="unidad_medida"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Unidad <span className="text-peligro">*</span>
        </label>
        <select
          id="unidad_medida"
          name="unidad_medida"
          value={campos.unidad_medida}
          onChange={handleChange}
          disabled={enviando}
          className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                     px-3 py-2.5 text-sm font-sans text-texto-primario
                     focus:outline-none focus:border-acento transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {UNIDADES_AJUSTE.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* ── Motivo (opcional) ────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="motivo"
          className="text-xs font-sans font-medium text-texto-secundario"
        >
          Motivo
        </label>
        <textarea
          id="motivo"
          name="motivo"
          value={campos.motivo}
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
            Ajuste registrado correctamente.
          </p>
        </div>
      )}

      {/* ── Envío ────────────────────────────────────────── */}
      <button
        type="button"
        disabled={!esValido || enviando}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-acento text-white
                   py-3 px-4 text-sm font-sans font-medium
                   active:bg-acento/90 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Registrando...' : 'Registrar ajuste'}
      </button>

    </div>
  )
}
