import type { Producto, TipoOperativoProducto } from '@/types'

export const TIPOS_INVENTARIO: TipoOperativoProducto[] = ['materia_prima', 'insumo']
export const TIPOS_STOCK_DISPONIBLE: TipoOperativoProducto[] = ['elaborado']

export function esProductoInventario(producto: Producto): boolean {
  return TIPOS_INVENTARIO.includes(producto.tipo_operativo)
}

export function esProductoElaborado(producto: Producto): boolean {
  return producto.tipo_operativo === 'elaborado'
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
