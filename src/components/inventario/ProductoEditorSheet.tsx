'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'

import { useCategoriasProducto } from '@/hooks/useDominio'
import { inventarioKeys } from '@/lib/queries'
import { describeTipoOperativo, etiquetaTipoOperativo } from '@/lib/productos'
import type { CategoriaProducto, Producto, TipoOperativoProducto, UnidadEntrada } from '@/types'

const UNIDADES: readonly UnidadEntrada[] = ['g', 'kg', 'ml', 'lt', 'unidad', 'docena', 'caja', 'bandeja', 'porcion']
const TIPOS_OPERATIVOS: readonly TipoOperativoProducto[] = ['materia_prima', 'insumo', 'elaborado']

interface Props {
  modo: 'crear' | 'editar'
  onClose: () => void
  producto?: Producto
  tiposDisponibles?: TipoOperativoProducto[]
  tipoDefault?: TipoOperativoProducto
}

function requierePeso(unidad: string) { return unidad === 'porcion' }
function requiereUnidadesPorEmpaque(unidad: string) { return unidad === 'caja' || unidad === 'bandeja' }

export default function ProductoEditorSheet({
  modo,
  onClose,
  producto,
  tiposDisponibles = TIPOS_OPERATIVOS.slice() as TipoOperativoProducto[],
  tipoDefault = 'materia_prima',
}: Props) {
  const queryClient = useQueryClient()
  const categorias = useCategoriasProducto()
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [tipoOperativo, setTipoOperativo] = useState<TipoOperativoProducto>(producto?.tipo_operativo ?? tipoDefault)
  const [unidad, setUnidad] = useState(producto?.unidad_medida ?? 'kg')
  const [stock, setStock] = useState(producto ? String(producto.stock_actual) : '')
  const [minimo, setMinimo] = useState(producto ? String(producto.stock_minimo) : '')
  const [costo, setCosto] = useState(producto ? String(producto.costo_unitario_actual) : '')
  const [peso, setPeso] = useState(producto?.peso_unitario_gramos ? String(producto.peso_unitario_gramos) : '')
  const metadataProducto = producto?.metadata as Record<string, unknown> | undefined
  const [unidadesPorEmpaque, setUnidadesPorEmpaque] = useState(metadataProducto?.unidades_por_empaque ? String(metadataProducto.unidades_por_empaque) : '')
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const titulo = modo === 'crear'
    ? (tipoDefault === 'elaborado' ? 'Nuevo stock disponible' : 'Nuevo producto')
    : (producto?.tipo_operativo === 'elaborado' ? 'Editar stock disponible' : 'Editar producto')

  const descripcionTipo = useMemo(() => describeTipoOperativo(tipoOperativo), [tipoOperativo])

  const payload = {
    nombre,
    tipo_operativo: tipoOperativo,
    unidad_medida: unidad,
    stock,
    stock_minimo: minimo,
    costo_unitario: costo,
    peso_unitario_gramos: peso || undefined,
    unidades_por_empaque: unidadesPorEmpaque || undefined,
    categoria_id: categoriaId || undefined,
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    const response = await fetch(
      modo === 'crear' ? '/api/inventario/productos' : `/api/inventario/productos/${producto?.id}`,
      {
        method: modo === 'crear' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const data = await response.json().catch(() => ({ error: 'No se pudo guardar.' })) as { error?: string }
    setGuardando(false)
    if (!response.ok) {
      setError(data.error ?? 'No se pudo guardar.')
      return
    }
    await queryClient.invalidateQueries({ queryKey: inventarioKeys.all })
    await queryClient.invalidateQueries({ queryKey: ['actividad-operativa'] })
    onClose()
  }

  async function archivar() {
    if (!producto) return
    if (!window.confirm(`¿Archivar ${producto.nombre}?`)) return
    setGuardando(true)
    setError('')
    const response = await fetch(`/api/inventario/productos/${producto.id}`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({ error: 'No se pudo archivar.' })) as { error?: string }
    setGuardando(false)
    if (!response.ok) {
      setError(data.error ?? 'No se pudo archivar.')
      return
    }
    await queryClient.invalidateQueries({ queryKey: inventarioKeys.all })
    await queryClient.invalidateQueries({ queryKey: ['actividad-operativa'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 p-3 pb-[calc(88px+env(safe-area-inset-bottom))] md:p-6 md:pb-6 flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <form onSubmit={guardar} className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-2xl border border-fondo-borde bg-fondo-elevado p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-acento">{tipoDefault === 'elaborado' || tipoOperativo === 'elaborado' ? 'Stock disponible' : 'Inventario'}</p>
            <h2 className="text-lg font-display font-bold text-texto-primario">{titulo}</h2>
            <p className="text-xs text-texto-apagado mt-1">{modo === 'crear' ? 'Completa los datos operativos del producto.' : 'Actualiza cantidades, categoría y clasificación operativa.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="btn-icono"><X size={18} /></button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-texto-secundario">Nombre del producto</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className="campo-input" placeholder="Ejemplo: Pesto de albahaca" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-texto-secundario">Clasificación operativa</span>
          <select value={tipoOperativo} onChange={(e) => setTipoOperativo(e.target.value as TipoOperativoProducto)} className="campo-input">
            {tiposDisponibles.map((tipo) => (
              <option key={tipo} value={tipo}>{etiquetaTipoOperativo(tipo)}</option>
            ))}
          </select>
          <span className="block text-2xs text-texto-apagado">{descripcionTipo}</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-texto-secundario">Categoría</span>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="campo-input">
            <option value="">Sin categoría</option>
            {(categorias.data ?? []).map((categoria: CategoriaProducto) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Unidad de medida</span>
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="campo-input">
              {UNIDADES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Stock actual</span>
            <input value={stock} onChange={(e) => setStock(e.target.value)} required type="number" min="0" step="0.001" className="campo-input disabled:opacity-70" placeholder="0" disabled={modo === 'editar'} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Stock mínimo</span>
            <input value={minimo} onChange={(e) => setMinimo(e.target.value)} required type="number" min="0" step="0.001" className="campo-input" placeholder="0" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Costo unitario</span>
            <input value={costo} onChange={(e) => setCosto(e.target.value)} type="number" min="0" step="0.01" className="campo-input" placeholder="0" />
          </label>
        </div>

        <div className="rounded-xl border border-fondo-borde bg-fondo-card px-4 py-3 text-xs text-texto-secundario">
          <p><span className="font-medium text-texto-primario">Valor actual:</span> {stock || '0'} {unidad}</p>
          <p className="mt-1"><span className="font-medium text-texto-primario">Mínimo esperado:</span> {minimo || '0'} {unidad}</p>
          {modo === 'editar' ? <p className="mt-1 text-acento">Para cambiar la cantidad actual usa el botón Ajustar y así quedará trazabilidad en movimientos.</p> : null}
        </div>

        {requierePeso(unidad) && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Peso por porción (gramos, opcional)</span>
            <input value={peso} onChange={(e) => setPeso(e.target.value)} type="number" min="0.001" step="0.001" className="campo-input" placeholder="Ejemplo: 180" />
          </label>
        )}

        {requiereUnidadesPorEmpaque(unidad) && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-texto-secundario">Unidades por {unidad} (opcional)</span>
            <input value={unidadesPorEmpaque} onChange={(e) => setUnidadesPorEmpaque(e.target.value)} type="number" min="1" step="1" className="campo-input" placeholder="Ejemplo: 30" />
          </label>
        )}

        {error && <p className="text-xs text-peligro-texto" role="alert">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {modo === 'editar' && producto ? (
            <button type="button" onClick={archivar} disabled={guardando} className="min-h-12 rounded-xl border border-peligro px-4 text-sm font-medium text-peligro flex items-center justify-center gap-2 disabled:opacity-50">
              <Trash2 size={16} /> Archivar
            </button>
          ) : null}
          <button disabled={guardando} className="flex-1 min-h-12 rounded-xl bg-acento text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {modo === 'crear' ? <Plus size={18} /> : <Pencil size={16} />}
            {guardando ? 'Guardando…' : modo === 'crear' ? (tipoDefault === 'elaborado' ? 'Crear stock disponible' : 'Crear producto') : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
