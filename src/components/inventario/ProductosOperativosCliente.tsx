'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Boxes, Edit3, Filter, PackagePlus, Scale, Search, X } from 'lucide-react'

import EditarProductoCliente from '@/components/inventario/EditarProductoCliente'
import AjusteInventarioSheet from '@/components/inventario/AjusteInventarioSheet'
import NuevoProductoCliente from '@/components/inventario/NuevoProductoCliente'
import { useProductos } from '@/hooks/useDominio'
import { etiquetaTipoOperativo, obtenerTipoOperativoProducto } from '@/lib/productos'
import type { Producto, TipoOperativoProducto } from '@/types'

function esCritico(producto: Producto) {
  if (producto.cantidad_gramos !== undefined && producto.stock_minimo_gramos !== undefined) {
    return producto.cantidad_gramos <= producto.stock_minimo_gramos
  }
  return producto.stock_actual <= producto.stock_minimo
}

function ProductoCard({
  producto,
  onEditar,
  onAjustar,
}: {
  producto: Producto
  onEditar: () => void
  onAjustar: () => void
}) {
  const critico = esCritico(producto)
  const tipoOperativo = obtenerTipoOperativoProducto(producto)

  return (
    <article className="rounded-xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-texto-primario truncate">{producto.nombre}</h3>
            <span className={tipoOperativo === 'elaborado' ? 'badge-acento' : 'badge-info'}>
              {tipoOperativo ? etiquetaTipoOperativo(tipoOperativo) : 'Sin clasificar'}
            </span>
          </div>
          <p className="text-2xs text-texto-apagado mt-1">
            {producto.categoria?.nombre ?? 'Sin categoría'} · {producto.unidad_display ?? producto.unidad_medida}
          </p>
        </div>
        <div className="text-right">
          <p className={critico ? 'text-sm font-medium text-peligro' : 'text-sm font-medium text-exito-texto'}>
            {producto.stock_actual} {producto.unidad_display ?? producto.unidad_medida}
          </p>
          <p className="text-2xs text-texto-apagado mt-1">mín {producto.stock_minimo}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-texto-secundario">
        <div className="rounded-lg bg-fondo-card px-3 py-2">
          <p className="text-texto-apagado">Costo unitario</p>
          <p className="mt-1 font-medium text-texto-primario">${Number(producto.costo_unitario_actual ?? 0).toLocaleString('es-CL')}</p>
        </div>
        <div className="rounded-lg bg-fondo-card px-3 py-2">
          <p className="text-texto-apagado">Peso por unidad</p>
          <p className="mt-1 font-medium text-texto-primario">{producto.peso_unitario_gramos ?? 0} g</p>
        </div>
      </div>

      {critico ? <p className="text-2xs text-peligro">Stock crítico: revisa compra, producción o ajuste.</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onEditar} className="min-h-11 rounded-xl border border-fondo-borde text-sm text-texto-primario flex items-center justify-center gap-2">
          <Edit3 size={15} /> Editar
        </button>
        <button type="button" onClick={onAjustar} className="min-h-11 rounded-xl border border-acento text-sm text-acento flex items-center justify-center gap-2">
          <Scale size={15} /> Ajustar
        </button>
      </div>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="rounded-xl border border-fondo-borde bg-fondo-elevado p-4 space-y-3">
          <div className="h-4 w-1/2 rounded bg-fondo-hover animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-fondo-hover animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 rounded bg-fondo-hover animate-pulse" />
            <div className="h-14 rounded bg-fondo-hover animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProductosOperativosCliente({
  titulo,
  descripcion,
  tiposOperativos,
  tipoDefault,
}: {
  titulo: string
  descripcion: string
  tiposOperativos: TipoOperativoProducto[]
  tipoDefault: TipoOperativoProducto
}) {
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null)
  const [productoAjuste, setProductoAjuste] = useState<Producto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [soloCritico, setSoloCritico] = useState(false)

  const productosQuery = useProductos({ tipos_operativos: tiposOperativos, activo: true })
  const productos = useMemo(() => productosQuery.data ?? [], [productosQuery.data])

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const producto of productos) {
      if (producto.categoria?.id && producto.categoria.nombre) {
        mapa.set(producto.categoria.id, producto.categoria.nombre)
      }
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [productos])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos.filter((producto) => {
      if (termino && !producto.nombre.toLowerCase().includes(termino)) return false
      if (categoriaActiva !== 'todas' && producto.categoria?.id !== categoriaActiva) return false
      if (soloCritico && !esCritico(producto)) return false
      return true
    })
  }, [busqueda, categoriaActiva, productos, soloCritico])

  const totalCriticos = useMemo(() => productos.filter(esCritico).length, [productos])
  const hayFiltros = busqueda.trim() !== '' || categoriaActiva !== 'todas' || soloCritico

  return (
    <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/inventario" className={`rounded-full px-3 py-1.5 text-2xs border ${tipoDefault === 'materia_prima' ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>Inventario</Link>
          <Link href="/stock" className={`rounded-full px-3 py-1.5 text-2xs border ${tipoDefault === 'elaborado' ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado'}`}>Stock disponible</Link>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-acento">{tipoDefault === 'elaborado' ? 'Stock disponible' : 'Inventario'}</p>
            <h1 className="text-xl font-display font-bold text-texto-primario">{titulo}</h1>
            <p className="text-xs text-texto-apagado mt-1">{descripcion}</p>
          </div>
          <button type="button" onClick={() => setMostrarNuevo(true)} className="flex items-center gap-2 rounded-xl bg-acento px-3 py-2.5 text-xs font-medium text-white shadow-sm">
            <PackagePlus size={15} /> {tipoDefault === 'elaborado' ? 'Nuevo stock' : 'Nuevo producto'}
          </button>
        </div>
        {productosQuery.isSuccess ? (
          <p className="text-xs text-texto-apagado">{hayFiltros ? `${filtrados.length} de ${productos.length}` : `${productos.length} registro${productos.length !== 1 ? 's' : ''}`}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-apagado" />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={`Buscar en ${titulo.toLowerCase()}...`} className="w-full rounded-xl border border-fondo-borde bg-fondo-elevado pl-9 pr-9 py-2.5 text-sm text-texto-primario placeholder:text-texto-apagado" />
          {busqueda ? <button type="button" onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-apagado"><X size={14} /></button> : null}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button type="button" onClick={() => setSoloCritico((prev) => !prev)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-2xs ${soloCritico ? 'bg-peligro text-white border-peligro' : 'border-fondo-borde text-texto-apagado bg-fondo-elevado'}`}>
            <Filter size={11} /> Crítico {totalCriticos > 0 ? `(${totalCriticos})` : ''}
          </button>
          {categorias.map((categoria) => (
            <button key={categoria.id} type="button" onClick={() => setCategoriaActiva((prev) => prev === categoria.id ? 'todas' : categoria.id)} className={`rounded-full border px-3 py-1.5 text-2xs ${categoriaActiva === categoria.id ? 'bg-acento text-white border-acento' : 'border-fondo-borde text-texto-apagado bg-fondo-elevado'}`}>
              {categoria.nombre}
            </button>
          ))}
        </div>
        {hayFiltros ? (
          <button type="button" onClick={() => { setBusqueda(''); setCategoriaActiva('todas'); setSoloCritico(false) }} className="text-2xs text-acento flex items-center gap-1.5">
            <X size={11} /> Limpiar filtros
          </button>
        ) : null}
      </section>

      {productosQuery.isPending ? <Skeleton /> : null}

      {productosQuery.isError ? (
        <section className="rounded-xl border border-info-borde bg-info-suave px-4 py-4 text-xs text-info-texto">
          No se pudieron cargar los productos operativos.
        </section>
      ) : null}

      {productosQuery.isSuccess && filtrados.length === 0 ? (
        <section className="rounded-xl border border-fondo-borde bg-fondo-elevado px-4 py-8 text-center">
          <Boxes size={18} className="mx-auto text-texto-apagado" />
          <p className="text-sm font-medium text-texto-primario mt-3">Sin registros por mostrar</p>
          <p className="text-xs text-texto-apagado mt-1">
            {tipoDefault === 'elaborado'
              ? 'Agrega productos elaborados, porcionados o listos para vender.'
              : 'Agrega materias primas e insumos para comenzar a operar.'}
          </p>
        </section>
      ) : null}

      {filtrados.length > 0 ? (
        <section className="space-y-3">
          {filtrados.map((producto) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              onEditar={() => setProductoEditar(producto)}
              onAjustar={() => setProductoAjuste(producto)}
            />
          ))}
        </section>
      ) : null}

      {mostrarNuevo ? (
        <NuevoProductoCliente
          onClose={() => setMostrarNuevo(false)}
          tiposDisponibles={tiposOperativos}
          tipoDefault={tipoDefault}
        />
      ) : null}

      {productoEditar ? (
        <EditarProductoCliente
          producto={productoEditar}
          onClose={() => setProductoEditar(null)}
          tiposDisponibles={tiposOperativos}
        />
      ) : null}

      {productoAjuste ? (
        <AjusteInventarioSheet
          producto={productoAjuste}
          onClose={() => setProductoAjuste(null)}
        />
      ) : null}
    </div>
  )
}
