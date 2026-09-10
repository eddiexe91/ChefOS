'use client'

/**
 * src/components/mermas/MermaFormCliente.tsx
 *
 * Formulario de registro de mermas — wizard de 3 pasos:
 * producto → cantidad → motivo (según CHEFOS_ROADMAP.md).
 *
 * La lógica de React Query está completamente encapsulada en:
 * src/hooks/useRegistrarMerma.ts
 *
 * Este componente es responsable únicamente de:
 * - mantener el estado visual del formulario (paso actual + campos)
 * - renderizar la interfaz
 * - llamar al hook
 *
 * Mismo patrón visual y de composición que
 * src/components/produccion/RegistrarProduccionForm.tsx, extendido con
 * navegación por pasos.
 */

import { useState, type ChangeEvent }                      from 'react'
import { useRegistrarMerma }                                from '@/hooks/useRegistrarMerma'
import { useProductos }                                     from '@/hooks/useDominio'
import type { FormNuevaMerma, MotivaMerma, UnidadEntrada }  from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface CamposForm {
  producto_id:   string
  cantidad:      string
  unidad_medida: string
  motivo:        string
  notas:         string
}

const ESTADO_INICIAL: CamposForm = {
  producto_id:   '',
  cantidad:      '',
  unidad_medida: 'g',
  motivo:        '',
  notas:         '',
}

const UNIDADES_MERMA: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

const MOTIVOS_MERMA: readonly MotivaMerma[] = [
  'sobreproduccion',
  'error_coccion',
  'vencimiento',
  'manipulacion',
  'accidente',
  'otro',
]

type Paso = 1 | 2 | 3

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function MermaFormCliente() {
  const [paso, setPaso]     = useState<Paso>(1)
  const [campos, setCampos] = useState<CamposForm>(ESTADO_INICIAL)

  const {
    data:      productos,
    isPending: cargandoProductos,
    isError:   errorProductos,
  } = useProductos()

  const mutacion = useRegistrarMerma({
    onSuccess: () => {
      setCampos(ESTADO_INICIAL)
      setPaso(1)
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

  const cantidadNumerica = Number(campos.cantidad)

  const paso1Valido =
    campos.producto_id !== '' &&
    !cargandoProductos &&
    !errorProductos

  const paso2Valido =
    campos.cantidad !== '' &&
    !Number.isNaN(cantidadNumerica) &&
    cantidadNumerica > 0 &&
    campos.unidad_medida !== ''

  const paso3Valido = campos.motivo !== ''

  const formularioValido = paso1Valido && paso2Valido && paso3Valido

  const enviando = mutacion.isPending

  const handleSubmit = () => {
    if (!formularioValido) {
      return
    }

    const body: FormNuevaMerma = {
      producto_id:   campos.producto_id,
      cantidad:      cantidadNumerica,
      unidad_medida: campos.unidad_medida,
      motivo:        campos.motivo as MotivaMerma,
      ...(campos.notas.trim() !== '' ? { notas: campos.notas.trim() } : {}),
    }
    mutacion.registrar(body)
  }

  const irSiguiente = () => setPaso((p) => (p < 3 ? ((p + 1) as Paso) : p))
  const irAtras     = () => setPaso((p) => (p > 1 ? ((p - 1) as Paso) : p))

  return (
    <div className="space-y-4">

      {/* ── Indicador de pasos ────────────────────────────── */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((p) => (
          <div
            key={p}
            className={`flex-1 h-1 rounded-full transition-colors
                        ${p <= paso ? 'bg-acento' : 'bg-fondo-borde'}`}
          />
        ))}
      </div>
      <p className="text-2xs font-sans text-texto-apagado">
        Paso {paso} de 3
      </p>

      {/* ── Paso 1: producto ──────────────────────────────── */}
      {paso === 1 && (
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

      {/* ── Paso 2: cantidad ──────────────────────────────── */}
      {paso === 2 && (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="cantidad"
              className="text-xs font-sans font-medium text-texto-secundario"
            >
              Cantidad <span className="text-peligro">*</span>
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              inputMode="decimal"
              min="0.001"
              step="0.001"
              value={campos.cantidad}
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
              {UNIDADES_MERMA.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* ── Paso 3: motivo ────────────────────────────────── */}
      {paso === 3 && (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="motivo"
              className="text-xs font-sans font-medium text-texto-secundario"
            >
              Motivo <span className="text-peligro">*</span>
            </label>
            <select
              id="motivo"
              name="motivo"
              value={campos.motivo}
              onChange={handleChange}
              disabled={enviando}
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2.5 text-sm font-sans text-texto-primario
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                Seleccionar motivo...
              </option>
              {MOTIVOS_MERMA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

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
        </>
      )}

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
            Merma registrada correctamente.
          </p>
        </div>
      )}

      {/* ── Navegación ────────────────────────────────────── */}
      <div className="flex gap-3">
        {paso > 1 && (
          <button
            type="button"
            onClick={irAtras}
            disabled={enviando}
            className="flex-1 rounded-xl bg-fondo-elevado border border-fondo-borde
                       text-texto-secundario py-3 px-4 text-sm font-sans font-medium
                       active:bg-fondo-hover transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Atrás
          </button>
        )}

        {paso < 3 && (
          <button
            type="button"
            onClick={irSiguiente}
            disabled={
              enviando ||
              (paso === 1 && !paso1Valido) ||
              (paso === 2 && !paso2Valido)
            }
            className="flex-1 rounded-xl bg-acento text-white
                       py-3 px-4 text-sm font-sans font-medium
                       active:bg-acento/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        )}

        {paso === 3 && (
          <button
            type="button"
            disabled={!formularioValido || enviando}
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-acento text-white
                       py-3 px-4 text-sm font-sans font-medium
                       active:bg-acento/90 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviando ? 'Registrando...' : 'Registrar merma'}
          </button>
        )}
      </div>

    </div>
  )
}
