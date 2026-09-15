'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2, X } from 'lucide-react'

import { useProductos } from '@/hooks/useDominio'
import { bibliotecaKeys, dashboardKeys, inventarioKeys } from '@/lib/queries'
import { etiquetaTipoOperativo } from '@/lib/productos'
import { obtenerClienteNavegador } from '@/lib/supabase/navegador'
import type { CategoriaReceta, DificultadReceta, Producto, Receta, UnidadEntrada } from '@/types'

const UNIDADES: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]
const DIFICULTADES: readonly DificultadReceta[] = ['basica', 'intermedia', 'avanzada']

interface IngredienteDraft {
  key: string
  producto_id: string
  cantidad: string
  unidad_medida: string
  notas: string
  es_opcional: boolean
}

interface PasoDraft {
  key: string
  titulo: string
  descripcion: string
  duracion_min: string
  temperatura_c: string
  tecnica: string
  punto_critico: boolean
}

function nuevaFilaIngrediente(): IngredienteDraft {
  return { key: crypto.randomUUID(), producto_id: '', cantidad: '', unidad_medida: 'g', notas: '', es_opcional: false }
}

function nuevaFilaPaso(): PasoDraft {
  return { key: crypto.randomUUID(), titulo: '', descripcion: '', duracion_min: '', temperatura_c: '', tecnica: '', punto_critico: false }
}

function recetaAVista(receta: Receta | null | undefined, modo: 'receta' | 'carta') {
  return {
    nombre: receta?.nombre ?? '',
    descripcion: receta?.descripcion ?? '',
    categoria_id: receta?.categoria_id ?? '',
    rendimiento_porciones: receta ? String(receta.rendimiento_porciones) : '1',
    unidad_rendimiento: receta?.unidad_rendimiento ?? (modo === 'carta' ? 'plato' : 'porcion'),
    tiempo_preparacion: receta?.tiempo_preparacion == null ? '' : String(receta.tiempo_preparacion),
    dificultad: receta?.dificultad ?? '',
    precio_venta: receta?.precio_venta == null ? '' : String(receta.precio_venta),
    en_carta: modo === 'carta' ? true : (receta?.en_carta ?? false),
    es_produccion: modo === 'carta' ? (receta?.es_produccion ?? false) : (receta?.es_produccion ?? true),
    producto_salida_id: receta?.producto_salida_id ?? '',
    cantidad_salida: receta?.cantidad_salida == null ? '' : String(receta.cantidad_salida),
    unidad_salida: receta?.unidad_salida ?? (receta?.producto_salida?.unidad_display ?? receta?.producto_salida?.unidad_medida ?? 'porcion'),
  }
}

export default function RecetaEditorSheet({
  modo,
  receta,
  embebido = false,
  onClose,
  onSaved,
}: {
  modo: 'receta' | 'carta'
  receta?: Receta | null
  embebido?: boolean
  onClose?: () => void
  onSaved?: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = obtenerClienteNavegador()
  const [categorias, setCategorias] = useState<CategoriaReceta[]>([])
  const [campos, setCampos] = useState(() => recetaAVista(receta, modo))
  const [ingredientes, setIngredientes] = useState<IngredienteDraft[]>(() => receta?.ingredientes?.length
    ? receta.ingredientes.map((ingrediente) => ({
        key: crypto.randomUUID(),
        producto_id: ingrediente.producto_id,
        cantidad: String(ingrediente.cantidad),
        unidad_medida: ingrediente.unidad_medida,
        notas: ingrediente.notas ?? '',
        es_opcional: ingrediente.es_opcional,
      }))
    : [nuevaFilaIngrediente()])
  const [pasos, setPasos] = useState<PasoDraft[]>(() => receta?.pasos?.length
    ? receta.pasos.map((paso) => ({
        key: crypto.randomUUID(),
        titulo: paso.titulo,
        descripcion: paso.descripcion,
        duracion_min: paso.duracion_min == null ? '' : String(paso.duracion_min),
        temperatura_c: paso.temperatura_c == null ? '' : String(paso.temperatura_c),
        tecnica: paso.tecnica ?? '',
        punto_critico: paso.punto_critico,
      }))
    : [nuevaFilaPaso()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    setCampos(recetaAVista(receta, modo))
    setIngredientes(receta?.ingredientes?.length
      ? receta.ingredientes.map((ingrediente) => ({
          key: crypto.randomUUID(),
          producto_id: ingrediente.producto_id,
          cantidad: String(ingrediente.cantidad),
          unidad_medida: ingrediente.unidad_medida,
          notas: ingrediente.notas ?? '',
          es_opcional: ingrediente.es_opcional,
        }))
      : [nuevaFilaIngrediente()])
    setPasos(receta?.pasos?.length
      ? receta.pasos.map((paso) => ({
          key: crypto.randomUUID(),
          titulo: paso.titulo,
          descripcion: paso.descripcion,
          duracion_min: paso.duracion_min == null ? '' : String(paso.duracion_min),
          temperatura_c: paso.temperatura_c == null ? '' : String(paso.temperatura_c),
          tecnica: paso.tecnica ?? '',
          punto_critico: paso.punto_critico,
        }))
      : [nuevaFilaPaso()])
  }, [modo, receta])

  useEffect(() => {
    let activo = true
    void supabase
      .from('categorias_receta')
      .select('id, restaurante_id, nombre, orden, activa')
      .eq('activa', true)
      .order('orden', { ascending: true })
      .then(({ data }) => { if (activo) setCategorias((data ?? []) as CategoriaReceta[]) })
    return () => { activo = false }
  }, [supabase])

  const productosQuery = useProductos()
  const salidasQuery = useProductos({ tipos_operativos: ['elaborado'] })
  const productos = useMemo(() => productosQuery.data ?? [], [productosQuery.data])
  const productosSalida = useMemo(() => salidasQuery.data ?? [], [salidasQuery.data])

  const titulo = receta
    ? (modo === 'carta' ? 'Editar elaboración de Carta' : 'Editar receta')
    : (modo === 'carta' ? 'Nueva elaboración de Carta' : 'Añadir receta')

  const textoCTA = receta
    ? (modo === 'carta' ? 'Guardar elaboración' : 'Guardar receta')
    : (modo === 'carta' ? 'Guardar elaboración' : 'Crear receta')

  const esValido = campos.nombre.trim() !== ''
    && campos.unidad_rendimiento.trim() !== ''
    && Number(campos.rendimiento_porciones) > 0
    && ingredientes.length > 0
    && ingredientes.every((ingrediente) => ingrediente.producto_id && Number(ingrediente.cantidad) > 0 && ingrediente.unidad_medida)
    && pasos.length > 0
    && pasos.every((paso) => paso.titulo.trim() !== '' && paso.descripcion.trim() !== '')

  async function postProcesoGuardado(enCarta: boolean) {
    await queryClient.invalidateQueries({ queryKey: bibliotecaKeys.all })
    await queryClient.invalidateQueries({ queryKey: inventarioKeys.all })
    await queryClient.invalidateQueries({ queryKey: ['actividad-operativa'] })
    if (enCarta) {
      await fetch('/api/ia/briefing', { method: 'POST' }).catch(() => null)
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    }
  }

  async function guardar() {
    if (!esValido) {
      setError('Completa nombre, rendimiento, ingredientes y pasos antes de guardar.')
      return
    }
    setGuardando(true)
    setError('')
    setExito('')
    const payload = {
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim() || undefined,
      categoria_id: campos.categoria_id || undefined,
      rendimiento_porciones: Number(campos.rendimiento_porciones),
      unidad_rendimiento: campos.unidad_rendimiento.trim(),
      tiempo_preparacion: campos.tiempo_preparacion ? Number(campos.tiempo_preparacion) : undefined,
      dificultad: campos.dificultad || undefined,
      precio_venta: campos.precio_venta ? Number(campos.precio_venta) : undefined,
      en_carta: modo === 'carta' ? true : campos.en_carta,
      es_produccion: campos.es_produccion,
      producto_salida_id: campos.es_produccion && campos.producto_salida_id ? campos.producto_salida_id : undefined,
      cantidad_salida: campos.es_produccion && campos.cantidad_salida ? Number(campos.cantidad_salida) : undefined,
      unidad_salida: campos.es_produccion && campos.unidad_salida ? campos.unidad_salida : undefined,
      origen_editor: modo,
      ingredientes: ingredientes.map((ingrediente, index) => ({
        producto_id: ingrediente.producto_id,
        cantidad: Number(ingrediente.cantidad),
        unidad_medida: ingrediente.unidad_medida,
        notas: ingrediente.notas.trim() || undefined,
        es_opcional: ingrediente.es_opcional,
        orden: index,
      })),
      pasos: pasos.map((paso, index) => ({
        numero: index + 1,
        titulo: paso.titulo.trim(),
        descripcion: paso.descripcion.trim(),
        duracion_min: paso.duracion_min ? Number(paso.duracion_min) : undefined,
        temperatura_c: paso.temperatura_c ? Number(paso.temperatura_c) : undefined,
        tecnica: paso.tecnica.trim() || undefined,
        punto_critico: paso.punto_critico,
      })),
    }

    const response = await fetch(receta ? `/api/biblioteca/recetas/${receta.id}` : '/api/biblioteca/recetas', {
      method: receta ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({ error: 'No se pudo guardar.' })) as { error?: string }
    setGuardando(false)
    if (!response.ok) {
      setError(data.error ?? 'No se pudo guardar.')
      return
    }

    await postProcesoGuardado(payload.en_carta)
    setExito(modo === 'carta' ? 'Elaboración guardada correctamente.' : 'Receta guardada correctamente.')

    if (onSaved) onSaved()
    if (onClose) {
      onClose()
      return
    }
    router.push(modo === 'carta' ? '/carta' : '/biblioteca')
    router.refresh()
  }

  async function archivar() {
    if (!receta) return
    if (!window.confirm(`¿Archivar ${receta.nombre}?`)) return
    setGuardando(true)
    setError('')
    const response = await fetch(`/api/biblioteca/recetas/${receta.id}`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({ error: 'No se pudo archivar.' })) as { error?: string }
    setGuardando(false)
    if (!response.ok) {
      setError(data.error ?? 'No se pudo archivar.')
      return
    }
    await postProcesoGuardado(receta.en_carta || modo === 'carta')
    if (onSaved) onSaved()
    if (onClose) {
      onClose()
      return
    }
    router.push(modo === 'carta' ? '/carta' : '/biblioteca')
    router.refresh()
  }

  const contenedor = embebido
    ? 'px-4 pt-6 pb-36 max-w-lg mx-auto space-y-6'
    : 'fixed inset-0 z-[70] bg-black/60 p-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:p-6 md:pb-6 flex items-end md:items-center justify-center'

  const panel = embebido
    ? 'space-y-6'
    : 'w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 shadow-xl space-y-6'

  return (
    <div className={contenedor} role={embebido ? undefined : 'dialog'} aria-modal={embebido ? undefined : true}>
      <div className={panel}>
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-acento">{modo === 'carta' ? 'Carta' : 'Recetas'}</p>
              <h1 className="text-xl font-display font-bold text-texto-primario">{titulo}</h1>
              <p className="text-xs text-texto-apagado mt-1">
                {modo === 'carta'
                  ? 'Gestiona platos, ingredientes de Inventario y Stock disponible, y su elaboración contextual.'
                  : 'Gestiona fichas técnicas de producción y, si aplica, su salida al Stock disponible.'}
              </p>
            </div>
            {!embebido && onClose ? <button type="button" onClick={onClose} className="btn-icono" aria-label="Cerrar"><X size={18} /></button> : null}
          </div>
        </section>

        <section className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Nombre del {modo === 'carta' ? 'plato' : 'receta'}</span>
            <input value={campos.nombre} onChange={(e) => setCampos((prev) => ({ ...prev, nombre: e.target.value }))} className="campo-input" placeholder={modo === 'carta' ? 'Ejemplo: Cancato de corvina' : 'Ejemplo: Leche asada'} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Categoría</span>
            <select value={campos.categoria_id} onChange={(e) => setCampos((prev) => ({ ...prev, categoria_id: e.target.value }))} className="campo-input">
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Descripción</span>
            <textarea value={campos.descripcion} onChange={(e) => setCampos((prev) => ({ ...prev, descripcion: e.target.value }))} rows={3} className="campo-input min-h-24 py-3" placeholder="Qué se prepara, cuándo se usa y observaciones clave." />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Rendimiento</span>
              <input value={campos.rendimiento_porciones} onChange={(e) => setCampos((prev) => ({ ...prev, rendimiento_porciones: e.target.value }))} type="number" min="1" step="1" className="campo-input" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Unidad de salida</span>
              <input value={campos.unidad_rendimiento} onChange={(e) => setCampos((prev) => ({ ...prev, unidad_rendimiento: e.target.value }))} className="campo-input" placeholder={modo === 'carta' ? 'plato' : 'porción'} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Tiempo (min)</span>
              <input value={campos.tiempo_preparacion} onChange={(e) => setCampos((prev) => ({ ...prev, tiempo_preparacion: e.target.value }))} type="number" min="0" step="1" className="campo-input" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Dificultad</span>
              <select value={campos.dificultad} onChange={(e) => setCampos((prev) => ({ ...prev, dificultad: e.target.value }))} className="campo-input">
                <option value="">Sin especificar</option>
                {DIFICULTADES.map((dificultad) => <option key={dificultad} value={dificultad}>{dificultad}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Precio de venta</span>
              <input value={campos.precio_venta} onChange={(e) => setCampos((prev) => ({ ...prev, precio_venta: e.target.value }))} type="number" min="0" step="0.01" className="campo-input" />
            </label>
            <div className="rounded-xl border border-fondo-borde bg-fondo-card px-4 py-3 text-xs text-texto-secundario">
              <p className="font-medium text-texto-primario">Estado operativo</p>
              <p className="mt-1">{modo === 'carta' ? 'Este registro aparecerá en Carta.' : 'Esta ficha se administra desde Recetas.'}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-fondo-borde bg-fondo-card px-4 py-3">
            {modo !== 'carta' ? (
              <label className="flex items-start gap-2 text-xs text-texto-secundario">
                <input type="checkbox" checked={campos.en_carta} onChange={(e) => setCampos((prev) => ({ ...prev, en_carta: e.target.checked }))} />
                <span><span className="font-medium text-texto-primario">Mostrar también en Carta</span><span className="block mt-1">Permite que la misma ficha aparezca en Carta sin ocultarla de Producción.</span></span>
              </label>
            ) : null}
            <label className="flex items-start gap-2 text-xs text-texto-secundario">
              <input type="checkbox" checked={campos.es_produccion} onChange={(e) => setCampos((prev) => ({ ...prev, es_produccion: e.target.checked }))} />
              <span><span className="font-medium text-texto-primario">Usar también en Producción</span><span className="block mt-1">Solo las fichas con esta marca aparecerán en Producción y descontarán ingredientes.</span></span>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="seccion-titulo">Ingredientes</h2>
            <button type="button" onClick={() => setIngredientes((prev) => [...prev, nuevaFilaIngrediente()])} className="text-xs text-acento flex items-center gap-1">
              <Plus size={14} /> Agregar ingrediente
            </button>
          </div>
          {ingredientes.map((ingrediente, index) => (
            <div key={ingrediente.key} className="rounded-xl border border-fondo-borde bg-fondo-elevado p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xs uppercase tracking-wide text-texto-apagado">Ingrediente {index + 1}</p>
                {ingredientes.length > 1 ? <button type="button" onClick={() => setIngredientes((prev) => prev.filter((item) => item.key !== ingrediente.key))} className="btn-icono"><X size={14} /></button> : null}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Producto</span>
                <select value={ingrediente.producto_id} onChange={(e) => setIngredientes((prev) => prev.map((item) => item.key === ingrediente.key ? { ...item, producto_id: e.target.value } : item))} className="campo-input">
                  <option value="">{productosQuery.isPending ? 'Cargando productos…' : 'Seleccionar producto'}</option>
                  {productos.map((producto: Producto) => (
                    <option key={producto.id} value={producto.id}>{producto.nombre} · {etiquetaTipoOperativo(producto.tipo_operativo)}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-texto-secundario">Cantidad</span>
                  <input value={ingrediente.cantidad} onChange={(e) => setIngredientes((prev) => prev.map((item) => item.key === ingrediente.key ? { ...item, cantidad: e.target.value } : item))} type="number" min="0" step="0.001" className="campo-input" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-texto-secundario">Unidad</span>
                  <select value={ingrediente.unidad_medida} onChange={(e) => setIngredientes((prev) => prev.map((item) => item.key === ingrediente.key ? { ...item, unidad_medida: e.target.value } : item))} className="campo-input">
                    {UNIDADES.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Notas</span>
                <input value={ingrediente.notas} onChange={(e) => setIngredientes((prev) => prev.map((item) => item.key === ingrediente.key ? { ...item, notas: e.target.value } : item))} className="campo-input" placeholder="Ejemplo: media porción, fileteado, cocida." />
              </label>
              <label className="flex items-center gap-2 text-xs text-texto-secundario">
                <input type="checkbox" checked={ingrediente.es_opcional} onChange={(e) => setIngredientes((prev) => prev.map((item) => item.key === ingrediente.key ? { ...item, es_opcional: e.target.checked } : item))} />
                Ingrediente opcional
              </label>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="seccion-titulo">Pasos</h2>
            <button type="button" onClick={() => setPasos((prev) => [...prev, nuevaFilaPaso()])} className="text-xs text-acento flex items-center gap-1">
              <Plus size={14} /> Agregar paso
            </button>
          </div>
          {pasos.map((paso, index) => (
            <div key={paso.key} className="rounded-xl border border-fondo-borde bg-fondo-elevado p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xs uppercase tracking-wide text-texto-apagado">Paso {index + 1}</p>
                {pasos.length > 1 ? <button type="button" onClick={() => setPasos((prev) => prev.filter((item) => item.key !== paso.key))} className="btn-icono"><X size={14} /></button> : null}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Título</span>
                <input value={paso.titulo} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, titulo: e.target.value } : item))} className="campo-input" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Descripción</span>
                <textarea value={paso.descripcion} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, descripcion: e.target.value } : item))} rows={3} className="campo-input min-h-24 py-3" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-texto-secundario">Duración (min)</span>
                  <input value={paso.duracion_min} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, duracion_min: e.target.value } : item))} type="number" min="0" step="1" className="campo-input" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-texto-secundario">Temperatura °C</span>
                  <input value={paso.temperatura_c} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, temperatura_c: e.target.value } : item))} type="number" step="1" className="campo-input" />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Técnica</span>
                <input value={paso.tecnica} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, tecnica: e.target.value } : item))} className="campo-input" />
              </label>
              <label className="flex items-center gap-2 text-xs text-texto-secundario">
                <input type="checkbox" checked={paso.punto_critico} onChange={(e) => setPasos((prev) => prev.map((item) => item.key === paso.key ? { ...item, punto_critico: e.target.checked } : item))} />
                Punto crítico
              </label>
            </div>
          ))}
        </section>

        {campos.es_produccion ? (
          <section className="space-y-3 rounded-xl border border-fondo-borde bg-fondo-card px-4 py-4">
            <div>
              <h2 className="seccion-titulo">Salida al Stock disponible</h2>
              <p className="text-xs text-texto-apagado mt-1">Al registrar producción se descontarán ingredientes y se sumará este producto elaborado si está configurado.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-texto-secundario">Producto elaborado de salida</span>
              <select value={campos.producto_salida_id} onChange={(e) => setCampos((prev) => ({ ...prev, producto_salida_id: e.target.value }))} className="campo-input">
                <option value="">{salidasQuery.isPending ? 'Cargando stock disponible…' : 'Sin salida configurada'}</option>
                {productosSalida.map((producto: Producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Cantidad de salida</span>
                <input value={campos.cantidad_salida} onChange={(e) => setCampos((prev) => ({ ...prev, cantidad_salida: e.target.value }))} type="number" min="0" step="0.001" className="campo-input" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-texto-secundario">Unidad de salida</span>
                <select value={campos.unidad_salida} onChange={(e) => setCampos((prev) => ({ ...prev, unidad_salida: e.target.value }))} className="campo-input">
                  {UNIDADES.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}
                </select>
              </label>
            </div>
          </section>
        ) : null}

        {error ? <div className="rounded-lg border border-peligro-borde bg-peligro-suave px-3 py-2.5 text-xs text-peligro-texto">{error}</div> : null}
        {exito ? <div className="rounded-lg border border-exito-borde bg-exito-suave px-3 py-2.5 text-xs text-exito-texto">{exito}</div> : null}

        <section className="flex flex-col-reverse gap-2 sm:flex-row">
          {receta ? (
            <button type="button" onClick={() => void archivar()} disabled={guardando} className="min-h-12 rounded-xl border border-peligro px-4 text-sm font-medium text-peligro flex items-center justify-center gap-2 disabled:opacity-50">
              <Trash2 size={16} /> {modo === 'carta' ? 'Archivar plato' : 'Archivar receta'}
            </button>
          ) : null}
          <button type="button" onClick={() => void guardar()} disabled={guardando} className="flex-1 min-h-12 rounded-xl bg-acento text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={16} /> {guardando ? 'Guardando…' : textoCTA}
          </button>
        </section>
      </div>
    </div>
  )
}
