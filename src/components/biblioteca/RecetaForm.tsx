'use client'

/**
 * src/components/biblioteca/RecetaForm.tsx
 *
 * Formulario de creación de receta completa (datos generales + ingredientes
 * + pasos) — primer formulario real de Biblioteca Culinaria.
 *
 * La lógica de React Query está completamente encapsulada en:
 * src/hooks/useRegistrarReceta.ts
 *
 * Este componente es responsable únicamente de:
 * - mantener el estado visual del formulario (campos generales + filas
 *   dinámicas de ingredientes y pasos)
 * - renderizar la interfaz
 * - construir CuerpoNuevaReceta y llamar al hook
 *
 * Mismo patrón visual y de composición que
 * src/components/produccion/RegistrarProduccionForm.tsx: sin props de
 * callback (onSuccess/onCancel) — ese patrón no existe en ningún formulario
 * real del proyecto; el reset tras éxito se maneja internamente vía el
 * onSuccess del propio hook, igual que allí. Sin prop de entidad padre
 * (a diferencia de RegistrarProduccionForm({ loteId })): la creación de
 * receta no depende de un recurso ya existente.
 *
 * orden (ingredientes) y numero (pasos) se derivan siempre de la posición
 * actual en el array al construir el body — nunca se guardan como estado
 * propio de cada fila — para que agregar/eliminar/reordenar nunca pueda
 * dejarlos duplicados o desincronizados.
 *
 * precio_venta, tiempo_preparacion (generales) y duracion_min/temperatura_c
 * (por paso): opcionales, permitidos vacíos. Cuando están informados, se
 * validan con Number.isFinite() (y Number.isInteger() donde route.ts lo
 * exige) antes de habilitar el envío, replicando exactamente el mismo
 * criterio que aplica src/app/api/biblioteca/recetas/route.ts del lado
 * del servidor.
 */

import { useState, type ChangeEvent }  from 'react'
import { X }                            from 'lucide-react'
import { useRegistrarReceta }           from '@/hooks/useRegistrarReceta'
import { useProductos }                 from '@/hooks/useDominio'
import type {
  CuerpoNuevaReceta,
  IngredienteNuevaReceta,
  PasoNuevaReceta,
} from '@/hooks/useRegistrarReceta'
import type { UnidadEntrada, DificultadReceta } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface CamposGenerales {
  nombre:                 string
  descripcion:            string
  categoria_id:           string
  rendimiento_porciones:  string
  unidad_rendimiento:     string
  precio_venta:           string
  tiempo_preparacion:     string
  dificultad:             string
  en_carta:               boolean
  es_produccion:          boolean
}

interface FilaIngrediente {
  key:            string
  producto_id:    string
  cantidad:       string
  unidad_medida:  string
  es_opcional:    boolean
  notas:          string
}

interface FilaPaso {
  key:            string
  titulo:         string
  descripcion:    string
  duracion_min:   string
  temperatura_c:  string
  tecnica:        string
  punto_critico:  boolean
  foto_url:       string
}

const ESTADO_INICIAL: CamposGenerales = {
  nombre:                 '',
  descripcion:            '',
  categoria_id:           '',
  rendimiento_porciones:  '',
  unidad_rendimiento:     'porción',
  precio_venta:           '',
  tiempo_preparacion:     '',
  dificultad:             '',
  en_carta:               true,
  es_produccion:          false,
}

const UNIDADES_INGREDIENTE: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

const DIFICULTADES: readonly DificultadReceta[] = [
  'basica',
  'intermedia',
  'avanzada',
]

function nuevaFilaIngrediente(): FilaIngrediente {
  return {
    key:           crypto.randomUUID(),
    producto_id:   '',
    cantidad:      '',
    unidad_medida: 'g',
    es_opcional:   false,
    notas:         '',
  }
}

function nuevaFilaPaso(): FilaPaso {
  return {
    key:            crypto.randomUUID(),
    titulo:         '',
    descripcion:    '',
    duracion_min:   '',
    temperatura_c:  '',
    tecnica:        '',
    punto_critico:  false,
    foto_url:       '',
  }
}

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

export default function RecetaForm() {
  const [campos, setCampos]             = useState<CamposGenerales>(ESTADO_INICIAL)
  const [ingredientes, setIngredientes] = useState<FilaIngrediente[]>([])
  const [pasos, setPasos]               = useState<FilaPaso[]>([])

  const {
    data:      productos,
    isPending: cargandoProductos,
    isError:   errorProductos,
  } = useProductos()

  const mutacion = useRegistrarReceta({
    onSuccess: () => {
      setCampos(ESTADO_INICIAL)
      setIngredientes([])
      setPasos([])
    },
  })

  const enviando = mutacion.isPending

  const limpiarEstadoMutacion = () => {
    if (mutacion.isError || mutacion.isSuccess) {
      mutacion.reset()
    }
  }

  const handleChangeGeneral = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    limpiarEstadoMutacion()
    const { name, value } = e.target
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      setCampos((prev) => ({ ...prev, [name]: e.target.checked }))
    } else {
      setCampos((prev) => ({ ...prev, [name]: value }))
    }
  }

  // ── Ingredientes ────────────────────────────────────────────

  const agregarIngrediente = () => {
    limpiarEstadoMutacion()
    setIngredientes((prev) => [...prev, nuevaFilaIngrediente()])
  }

  const actualizarIngrediente = (
    key: string,
    campo: keyof Omit<FilaIngrediente, 'key'>,
    valor: string | boolean
  ) => {
    limpiarEstadoMutacion()
    setIngredientes((prev) =>
      prev.map((fila) => (fila.key === key ? { ...fila, [campo]: valor } : fila))
    )
  }

  const eliminarIngrediente = (key: string) => {
    limpiarEstadoMutacion()
    setIngredientes((prev) => prev.filter((fila) => fila.key !== key))
  }

  // ── Pasos ────────────────────────────────────────────────────

  const agregarPaso = () => {
    limpiarEstadoMutacion()
    setPasos((prev) => [...prev, nuevaFilaPaso()])
  }

  const actualizarPaso = (
    key: string,
    campo: keyof Omit<FilaPaso, 'key'>,
    valor: string | boolean
  ) => {
    limpiarEstadoMutacion()
    setPasos((prev) =>
      prev.map((fila) => (fila.key === key ? { ...fila, [campo]: valor } : fila))
    )
  }

  const eliminarPaso = (key: string) => {
    limpiarEstadoMutacion()
    setPasos((prev) => prev.filter((fila) => fila.key !== key))
  }

  // ── Validación mínima de UX (el servidor sigue siendo la autoridad) ──

  const rendimientoNumerico = Number(campos.rendimiento_porciones)

  const precioVentaNumerico = campos.precio_venta.trim() !== '' ? Number(campos.precio_venta) : null
  const precioVentaValido =
    precioVentaNumerico === null || Number.isFinite(precioVentaNumerico)

  const tiempoPreparacionNumerico =
    campos.tiempo_preparacion.trim() !== '' ? Number(campos.tiempo_preparacion) : null
  const tiempoPreparacionValido =
    tiempoPreparacionNumerico === null ||
    (Number.isFinite(tiempoPreparacionNumerico) && Number.isInteger(tiempoPreparacionNumerico))

  const generalesValidos =
    campos.nombre.trim() !== '' &&
    campos.rendimiento_porciones !== '' &&
    Number.isFinite(rendimientoNumerico) &&
    Number.isInteger(rendimientoNumerico) &&
    rendimientoNumerico > 0 &&
    campos.unidad_rendimiento.trim() !== '' &&
    precioVentaValido &&
    tiempoPreparacionValido

  const ingredientesValidos =
    ingredientes.length > 0 &&
    ingredientes.every((fila) => {
      const cantidadNumerica = Number(fila.cantidad)
      return (
        fila.producto_id !== '' &&
        fila.cantidad !== '' &&
        Number.isFinite(cantidadNumerica) &&
        cantidadNumerica > 0 &&
        fila.unidad_medida !== ''
      )
    })

  const pasosValidos =
    pasos.length > 0 &&
    pasos.every((fila) => {
      const duracionValida =
        fila.duracion_min.trim() === '' ||
        (Number.isFinite(Number(fila.duracion_min)) && Number.isInteger(Number(fila.duracion_min)))
      const temperaturaValida =
        fila.temperatura_c.trim() === '' ||
        (Number.isFinite(Number(fila.temperatura_c)) && Number.isInteger(Number(fila.temperatura_c)))
      return (
        fila.titulo.trim() !== '' &&
        fila.descripcion.trim() !== '' &&
        duracionValida &&
        temperaturaValida
      )
    })

  const esValido =
    generalesValidos &&
    !cargandoProductos &&
    !errorProductos &&
    ingredientesValidos &&
    pasosValidos

  // ── Submit ───────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!esValido) {
      return
    }

    const ingredientesBody: IngredienteNuevaReceta[] = ingredientes.map((fila, indice) => ({
      producto_id:    fila.producto_id,
      cantidad:       Number(fila.cantidad),
      unidad_medida:  fila.unidad_medida as UnidadEntrada,
      es_opcional:    fila.es_opcional,
      orden:          indice,
      ...(fila.notas.trim() !== '' ? { notas: fila.notas.trim() } : {}),
    }))

    const pasosBody: PasoNuevaReceta[] = pasos.map((fila, indice) => ({
      numero:         indice + 1,
      titulo:         fila.titulo.trim(),
      descripcion:    fila.descripcion.trim(),
      punto_critico:  fila.punto_critico,
      ...(fila.duracion_min.trim() !== '' ? { duracion_min: Number(fila.duracion_min) } : {}),
      ...(fila.temperatura_c.trim() !== '' ? { temperatura_c: Number(fila.temperatura_c) } : {}),
      ...(fila.tecnica.trim() !== '' ? { tecnica: fila.tecnica.trim() } : {}),
      ...(fila.foto_url.trim() !== '' ? { foto_url: fila.foto_url.trim() } : {}),
    }))

    const body: CuerpoNuevaReceta = {
      nombre:                 campos.nombre.trim(),
      rendimiento_porciones:  rendimientoNumerico,
      unidad_rendimiento:     campos.unidad_rendimiento.trim(),
      en_carta:               campos.en_carta,
      es_produccion:          campos.es_produccion,
      ...(campos.descripcion.trim() !== '' ? { descripcion: campos.descripcion.trim() } : {}),
      ...(campos.categoria_id.trim() !== '' ? { categoria_id: campos.categoria_id.trim() } : {}),
      ...(precioVentaNumerico !== null ? { precio_venta: precioVentaNumerico } : {}),
      ...(tiempoPreparacionNumerico !== null ? { tiempo_preparacion: tiempoPreparacionNumerico } : {}),
      ...(campos.dificultad !== '' ? { dificultad: campos.dificultad as DificultadReceta } : {}),
      ingredientes: ingredientesBody,
      pasos:        pasosBody,
    }

    mutacion.registrar(body)
  }

  return (
    <div className="space-y-6">

      {/* ── Datos generales ──────────────────────────────────── */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="nombre" className="text-xs font-sans font-medium text-texto-secundario">
            Nombre <span className="text-peligro">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={campos.nombre}
            onChange={handleChangeGeneral}
            disabled={enviando}
            placeholder="Nombre de la receta"
            className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                       px-3 py-2.5 text-sm font-sans text-texto-primario
                       placeholder:text-texto-apagado
                       focus:outline-none focus:border-acento transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="descripcion" className="text-xs font-sans font-medium text-texto-secundario">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={campos.descripcion}
            onChange={handleChangeGeneral}
            disabled={enviando}
            rows={2}
            placeholder="Descripción opcional..."
            className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                       px-3 py-2.5 text-sm font-sans text-texto-primario
                       placeholder:text-texto-apagado resize-none
                       focus:outline-none focus:border-acento transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="rendimiento_porciones" className="text-xs font-sans font-medium text-texto-secundario">
              Rendimiento <span className="text-peligro">*</span>
            </label>
            <input
              id="rendimiento_porciones"
              name="rendimiento_porciones"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={campos.rendimiento_porciones}
              onChange={handleChangeGeneral}
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
            <label htmlFor="unidad_rendimiento" className="text-xs font-sans font-medium text-texto-secundario">
              Unidad <span className="text-peligro">*</span>
            </label>
            <input
              id="unidad_rendimiento"
              name="unidad_rendimiento"
              type="text"
              value={campos.unidad_rendimiento}
              onChange={handleChangeGeneral}
              disabled={enviando}
              placeholder="porción, kg, lt..."
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2.5 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="precio_venta" className="text-xs font-sans font-medium text-texto-secundario">
              Precio de venta
            </label>
            <input
              id="precio_venta"
              name="precio_venta"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={campos.precio_venta}
              onChange={handleChangeGeneral}
              disabled={enviando}
              placeholder="0.00"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2.5 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tiempo_preparacion" className="text-xs font-sans font-medium text-texto-secundario">
              Tiempo (min)
            </label>
            <input
              id="tiempo_preparacion"
              name="tiempo_preparacion"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={campos.tiempo_preparacion}
              onChange={handleChangeGeneral}
              disabled={enviando}
              placeholder="0"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2.5 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dificultad" className="text-xs font-sans font-medium text-texto-secundario">
            Dificultad
          </label>
          <select
            id="dificultad"
            name="dificultad"
            value={campos.dificultad}
            onChange={handleChangeGeneral}
            disabled={enviando}
            className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                       px-3 py-2.5 text-sm font-sans text-texto-primario
                       focus:outline-none focus:border-acento transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Sin especificar</option>
            {DIFICULTADES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-sans text-texto-secundario">
            <input
              type="checkbox"
              name="en_carta"
              checked={campos.en_carta}
              onChange={handleChangeGeneral}
              disabled={enviando}
            />
            En carta
          </label>
          <label className="flex items-center gap-2 text-xs font-sans text-texto-secundario">
            <input
              type="checkbox"
              name="es_produccion"
              checked={campos.es_produccion}
              onChange={handleChangeGeneral}
              disabled={enviando}
            />
            Es producción
          </label>
        </div>
      </div>

      {/* ── Ingredientes ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Ingredientes <span className="text-peligro">*</span>
          </p>
          <button
            type="button"
            onClick={agregarIngrediente}
            disabled={enviando}
            className="text-xs font-sans font-medium text-acento
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Agregar ingrediente
          </button>
        </div>

        {cargandoProductos && (
          <p className="text-xs font-sans text-texto-apagado">Cargando productos...</p>
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

        {!cargandoProductos && !errorProductos && ingredientes.length === 0 && (
          <p className="text-xs font-sans text-texto-apagado">
            Sin ingredientes todavía. Agrega al menos uno.
          </p>
        )}

        {!cargandoProductos && !errorProductos && ingredientes.map((fila) => (
          <div
            key={fila.key}
            className="rounded-xl bg-fondo-elevado border border-fondo-borde p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <select
                value={fila.producto_id}
                onChange={(e) => actualizarIngrediente(fila.key, 'producto_id', e.target.value)}
                disabled={enviando}
                className="flex-1 rounded-lg bg-fondo-base border border-fondo-borde
                           px-3 py-2 text-sm font-sans text-texto-primario
                           focus:outline-none focus:border-acento transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar producto...</option>
                {(productos ?? []).map((producto) => (
                  <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => eliminarIngrediente(fila.key)}
                disabled={enviando}
                aria-label="Eliminar ingrediente"
                className="text-texto-apagado active:text-peligro transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={fila.cantidad}
                onChange={(e) => actualizarIngrediente(fila.key, 'cantidad', e.target.value)}
                disabled={enviando}
                placeholder="Cantidad"
                className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                           px-3 py-2 text-sm font-sans text-texto-primario
                           placeholder:text-texto-apagado
                           focus:outline-none focus:border-acento transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <select
                value={fila.unidad_medida}
                onChange={(e) => actualizarIngrediente(fila.key, 'unidad_medida', e.target.value)}
                disabled={enviando}
                className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                           px-3 py-2 text-sm font-sans text-texto-primario
                           focus:outline-none focus:border-acento transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {UNIDADES_INGREDIENTE.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={fila.notas}
              onChange={(e) => actualizarIngrediente(fila.key, 'notas', e.target.value)}
              disabled={enviando}
              placeholder="Notas (opcional)"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <label className="flex items-center gap-2 text-2xs font-sans text-texto-apagado">
              <input
                type="checkbox"
                checked={fila.es_opcional}
                onChange={(e) => actualizarIngrediente(fila.key, 'es_opcional', e.target.checked)}
                disabled={enviando}
              />
              Ingrediente opcional
            </label>
          </div>
        ))}
      </div>

      {/* ── Pasos ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-medium text-texto-secundario uppercase tracking-wide">
            Pasos <span className="text-peligro">*</span>
          </p>
          <button
            type="button"
            onClick={agregarPaso}
            disabled={enviando}
            className="text-xs font-sans font-medium text-acento
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Agregar paso
          </button>
        </div>

        {pasos.length === 0 && (
          <p className="text-xs font-sans text-texto-apagado">
            Sin pasos todavía. Agrega al menos uno.
          </p>
        )}

        {pasos.map((fila, indice) => (
          <div
            key={fila.key}
            className="rounded-xl bg-fondo-elevado border border-fondo-borde p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-2xs font-sans font-medium text-texto-apagado uppercase tracking-wide">
                Paso {indice + 1}
              </p>
              <button
                type="button"
                onClick={() => eliminarPaso(fila.key)}
                disabled={enviando}
                aria-label="Eliminar paso"
                className="text-texto-apagado active:text-peligro transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={fila.titulo}
              onChange={(e) => actualizarPaso(fila.key, 'titulo', e.target.value)}
              disabled={enviando}
              placeholder="Título"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <textarea
              value={fila.descripcion}
              onChange={(e) => actualizarPaso(fila.key, 'descripcion', e.target.value)}
              disabled={enviando}
              rows={2}
              placeholder="Descripción del paso"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado resize-none
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={fila.duracion_min}
                onChange={(e) => actualizarPaso(fila.key, 'duracion_min', e.target.value)}
                disabled={enviando}
                placeholder="Duración (min)"
                className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                           px-3 py-2 text-sm font-sans text-texto-primario
                           placeholder:text-texto-apagado
                           focus:outline-none focus:border-acento transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="number"
                inputMode="numeric"
                step="1"
                value={fila.temperatura_c}
                onChange={(e) => actualizarPaso(fila.key, 'temperatura_c', e.target.value)}
                disabled={enviando}
                placeholder="Temperatura (°C)"
                className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                           px-3 py-2 text-sm font-sans text-texto-primario
                           placeholder:text-texto-apagado
                           focus:outline-none focus:border-acento transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <input
              type="text"
              value={fila.tecnica}
              onChange={(e) => actualizarPaso(fila.key, 'tecnica', e.target.value)}
              disabled={enviando}
              placeholder="Técnica (opcional)"
              className="w-full rounded-lg bg-fondo-base border border-fondo-borde
                         px-3 py-2 text-sm font-sans text-texto-primario
                         placeholder:text-texto-apagado
                         focus:outline-none focus:border-acento transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <label className="flex items-center gap-2 text-2xs font-sans text-texto-apagado">
              <input
                type="checkbox"
                checked={fila.punto_critico}
                onChange={(e) => actualizarPaso(fila.key, 'punto_critico', e.target.checked)}
                disabled={enviando}
              />
              Punto crítico
            </label>
          </div>
        ))}
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
            Receta creada correctamente.
          </p>
        </div>
      )}

      {/* ── Envío ────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={!esValido || enviando}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-acento text-white
                   py-3 px-4 text-sm font-sans font-medium
                   active:bg-acento/90 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Creando receta...' : 'Crear receta'}
      </button>

    </div>
  )
}
