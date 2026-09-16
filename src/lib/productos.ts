import type { Producto, TipoOperativoProducto } from '@/types'

export const TIPOS_INVENTARIO: TipoOperativoProducto[] = ['materia_prima', 'insumo']
export const TIPOS_STOCK_DISPONIBLE: TipoOperativoProducto[] = ['elaborado']
export const TIPOS_OPERATIVOS_PRODUCTO = ['materia_prima', 'insumo', 'elaborado'] as const

function esTipoOperativoProducto(valor: unknown): valor is TipoOperativoProducto {
  return typeof valor === 'string' && (TIPOS_OPERATIVOS_PRODUCTO as readonly string[]).includes(valor)
}

export function obtenerTipoOperativoProducto(producto: Pick<Producto, 'tipo_operativo' | 'metadata'> | Partial<Pick<Producto, 'tipo_operativo' | 'metadata'>>): TipoOperativoProducto | null {
  if (esTipoOperativoProducto(producto.tipo_operativo)) return producto.tipo_operativo

  const metadata = typeof producto.metadata === 'object' && producto.metadata !== null
    ? producto.metadata as Record<string, unknown>
    : {}

  if (esTipoOperativoProducto(metadata.tipo_operativo)) return metadata.tipo_operativo
  if (metadata.es_elaborado === true) return 'elaborado'

  return null
}

export function filtrarProductosPorTipoOperativo<T extends Pick<Producto, 'tipo_operativo' | 'metadata'>>(
  productos: T[],
  tiposOperativos?: TipoOperativoProducto[],
  incluirSinClasificar = false,
) {
  if (!tiposOperativos?.length) return productos
  return productos.filter((producto) => {
    const tipoOperativo = obtenerTipoOperativoProducto(producto)
    if (!tipoOperativo) return incluirSinClasificar
    return tiposOperativos.includes(tipoOperativo)
  })
}

export function esErrorColumnaTipoOperativo(error: { message?: string | null; details?: string | null; hint?: string | null } | null | undefined) {
  const texto = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()
  return texto.includes('tipo_operativo') && (
    texto.includes('schema cache')
    || texto.includes('does not exist')
    || texto.includes('could not find')
  )
}

export function esProductoInventario(producto: Producto): boolean {
  const tipoOperativo = obtenerTipoOperativoProducto(producto)
  return tipoOperativo ? TIPOS_INVENTARIO.includes(tipoOperativo) : true
}

export function esProductoElaborado(producto: Producto): boolean {
  return obtenerTipoOperativoProducto(producto) === 'elaborado'
}

export function etiquetaTipoOperativo(tipo: TipoOperativoProducto): string {
  if (tipo === 'materia_prima') return 'Materia prima'
  if (tipo === 'insumo') return 'Insumo'
  return 'Elaborado'
}

export function describeTipoOperativo(tipo: TipoOperativoProducto): string {
  if (tipo === 'materia_prima') return 'Producto sin elaborar para inventario base.'
  if (tipo === 'insumo') return 'Insumo operativo o de apoyo para producción.'
  return 'Producto elaborado, porcionado o listo para vender/usar.'
}
