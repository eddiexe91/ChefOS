// ═══════════════════════════════════════════════════════════════
// CHEFOS — Tipos del Dominio
// ═══════════════════════════════════════════════════════════════

export type RolUsuario =
  | 'dueño'
  | 'administrador'
  | 'chef_ejecutivo'
  | 'chef_cocina'
  | 'cocinero'

export type PlanRestaurante = 'basico' | 'profesional' | 'enterprise'
export type TurnoServicio   = 'mañana' | 'tarde' | 'noche'
export type DificultadReceta = 'basica' | 'intermedia' | 'avanzada'
export type EstadoCompra = 'borrador' | 'confirmada' | 'recibida' | 'anulada'
export type EstadoImportacion = 'pendiente' | 'procesando' | 'revision' | 'completado' | 'error'
export type MotivaMerma =
  | 'sobreproduccion'
  | 'error_coccion'
  | 'vencimiento'
  | 'manipulacion'
  | 'accidente'
  | 'otro'

export type TipoAlerta =
  | 'stock_critico'
  | 'proximo_vencimiento'
  | 'variacion_precio'
  | 'produccion_sugerida'
  | 'compra_urgente'
  | 'merma_excesiva'
  | 'otro'

export type SeveridadAlerta = 'critica' | 'alta' | 'media' | 'baja'

export type TipoMovimientoInventario =
  | 'entrada'
  | 'salida'
  | 'ajuste'
  | 'merma'
  | 'produccion'
  | 'transferencia'

// ─────────────────────────────────────────────────────────────
// SISTEMA UNIVERSAL DE GRAMOS
// ─────────────────────────────────────────────────────────────

export type TipoUnidad = 'masa' | 'volumen' | 'unidad'

export type UnidadEntrada =
  | 'g' | 'kg' | 'mg' | 'oz' | 'lb'
  | 'lt' | 'ml' | 'cl'
  | 'unidad' | 'docena' | 'caja' | 'bandeja' | 'porcion'

export interface UnidadMedida {
  id: string
  codigo: UnidadEntrada
  nombre: string
  tipo: TipoUnidad
  factor_a_gramos: number | null
  es_base: boolean
  activa: boolean
}

export interface DensidadProducto {
  id: string
  restaurante_id: string | null
  nombre_referencia: string
  densidad_g_por_ml: number | null
  peso_unitario_gramos: number | null
  fuente: 'estandar_culinario' | 'medicion_propia' | 'proveedor'
  activa: boolean
  creado_en: string
}

export interface ResultadoConversion {
  gramos: number | null
  unidad_origen: UnidadEntrada
  cantidad_origen: number
  densidad_usada?: number
  peso_unitario_usado?: number
  advertencia?: string
}

export function convertirAGramos(
  cantidad: number,
  unidad: UnidadEntrada,
  densidadGPorMl?: number,
  pesoUnitarioGramos?: number
): ResultadoConversion {
  const base = { unidad_origen: unidad, cantidad_origen: cantidad }
  const u = unidad.toLowerCase()

  if (u === 'g')  return { ...base, gramos: Math.round(cantidad * 1000) / 1000 }
  if (u === 'kg') return { ...base, gramos: Math.round(cantidad * 1000000) / 1000 }
  if (u === 'mg') return { ...base, gramos: Math.round(cantidad * 0.001 * 1000) / 1000 }
  if (u === 'oz') return { ...base, gramos: Math.round(cantidad * 28.3495 * 1000) / 1000 }
  if (u === 'lb') return { ...base, gramos: Math.round(cantidad * 453.592 * 1000) / 1000 }

  if (u === 'lt' || u === 'l' || u === 'litro') {
    const d = densidadGPorMl ?? 1.0
    return {
      ...base,
      gramos: Math.round(cantidad * 1000 * d * 1000) / 1000,
      densidad_usada: d,
      advertencia: densidadGPorMl ? undefined : 'Se asumió densidad de agua (1 g/ml)',
    }
  }
  if (u === 'ml' || u === 'mililitro') {
    const d = densidadGPorMl ?? 1.0
    return {
      ...base,
      gramos: Math.round(cantidad * d * 1000) / 1000,
      densidad_usada: d,
      advertencia: densidadGPorMl ? undefined : 'Se asumió densidad de agua (1 g/ml)',
    }
  }
  if (u === 'cl' || u === 'centilitro') {
    const d = densidadGPorMl ?? 1.0
    return { ...base, gramos: Math.round(cantidad * 10 * d * 1000) / 1000, densidad_usada: d }
  }

  if (u === 'unidad' || u === 'und' || u === 'u') {
    if (!pesoUnitarioGramos) return { ...base, gramos: null, advertencia: 'Se requiere el peso unitario en gramos' }
    return { ...base, gramos: Math.round(cantidad * pesoUnitarioGramos * 1000) / 1000, peso_unitario_usado: pesoUnitarioGramos }
  }
  if (u === 'docena') {
    if (!pesoUnitarioGramos) return { ...base, gramos: null, advertencia: 'Se requiere el peso unitario en gramos' }
    return { ...base, gramos: Math.round(cantidad * 12 * pesoUnitarioGramos * 1000) / 1000, peso_unitario_usado: pesoUnitarioGramos }
  }

  return { ...base, gramos: null, advertencia: `Unidad desconocida: ${unidad}` }
}

export function gramosAUnidadDisplay(
  gramos: number,
  unidadDisplay: UnidadEntrada,
  densidadGPorMl?: number,
  pesoUnitarioGramos?: number
): number {
  const u = unidadDisplay.toLowerCase()
  if (u === 'g')  return Math.round(gramos * 100) / 100
  if (u === 'kg') return Math.round((gramos / 1000) * 1000) / 1000
  if (u === 'lt' || u === 'l')
    return densidadGPorMl ? Math.round((gramos / densidadGPorMl / 1000) * 1000) / 1000 : gramos / 1000
  if (u === 'ml')
    return densidadGPorMl ? Math.round((gramos / densidadGPorMl) * 100) / 100 : gramos
  if (u === 'unidad')
    return pesoUnitarioGramos ? Math.round((gramos / pesoUnitarioGramos) * 100) / 100 : gramos
  return gramos
}

// ─────────────────────────────────────────────────────────────
// ENTIDADES
// ─────────────────────────────────────────────────────────────

export interface ConfigRestaurante {
  timezone?: string
  moneda?: string
  logo_url?: string
  color_marca?: string
  limite_usuarios?: number
  limite_ia_diario?: number
}

export interface Restaurante {
  id: string
  nombre: string
  slug: string
  plan: PlanRestaurante
  config: ConfigRestaurante
  activo: boolean
  creado_en: string
}

export interface Usuario {
  id: string
  restaurante_id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  avatar_url: string | null
  preferencias: {
    tema?: 'oscuro' | 'claro'
    notificaciones?: boolean
    turno_defecto?: TurnoServicio
  }
  ultimo_acceso: string | null
}

export interface CategoriaProducto {
  id: string
  restaurante_id: string
  nombre: string
  tipo: 'proteina' | 'verdura' | 'lacteo' | 'condimento' | 'bebida' | 'limpieza' | 'insumo' | 'otro'
  activa: boolean
}

export interface CategoriaReceta {
  id: string
  restaurante_id: string
  nombre: string
  orden: number
  activa: boolean
}

export interface Proveedor {
  id: string
  restaurante_id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  ruc_nit: string | null
  condiciones_pago: string | null
  dias_entrega: number | null
  activo: boolean
  notas: string | null
}

export interface Producto {
  id: string
  restaurante_id: string
  nombre: string
  nombre_normalizado?: string
  codigo_interno?: string
  categoria_id?: string
  unidad_medida: string
  unidad_compra?: string
  unidad_display?: string
  costo_unitario_actual: number
  costo_por_gramo?: number
  stock_actual: number
  stock_minimo: number
  cantidad_gramos?: number
  stock_minimo_gramos?: number
  densidad_g_por_ml?: number
  peso_unitario_gramos?: number
  vida_util_dias?: number
  proveedor_principal_id?: string
  activo: boolean
  metadata: Record<string, unknown>
  creado_en: string
  actualizado_en: string
  categoria?: CategoriaProducto
  proveedor_principal?: Proveedor
}

export interface MovimientoInventario {
  id: string
  restaurante_id: string
  producto_id: string
  tipo: TipoMovimientoInventario
  cantidad: number
  cantidad_antes: number
  cantidad_despues: number
  cantidad_gramos?: number
  cantidad_antes_gramos?: number
  cantidad_despues_gramos?: number
  costo_unitario?: number
  costo_por_gramo?: number
  motivo?: string
  referencia_id?: string
  referencia_tipo?: string
  registrado_por?: string
  creado_en: string
  producto?: Producto
  registrado_por_usuario?: Pick<Usuario, 'id' | 'nombre'>
}

export interface Receta {
  id: string
  restaurante_id: string
  nombre: string
  descripcion?: string
  categoria_id?: string
  imagen_url?: string
  video_url?: string
  rendimiento_porciones: number
  unidad_rendimiento: string
  costo_total?: number
  costo_porcion?: number
  costo_por_gramo?: number
  precio_venta?: number
  margen_porcentaje?: number
  costo_desactualizado: boolean
  costo_actualizado_en?: string
  tiempo_preparacion?: number
  dificultad?: DificultadReceta
  version_actual: number
  activa: boolean
  en_carta: boolean
  es_produccion: boolean
  creado_por?: string
  creado_en: string
  actualizado_en: string
  categoria?: CategoriaReceta
  ingredientes?: RecetaIngrediente[]
}

export interface RecetaIngrediente {
  id: string
  receta_id: string
  producto_id: string
  cantidad: number
  unidad_medida: UnidadEntrada
  cantidad_gramos: number
  es_opcional: boolean
  orden: number
  notas?: string
  producto?: Producto
}

export interface RecetaPaso {
  id: string
  receta_id: string
  restaurante_id: string
  numero: number
  titulo: string
  descripcion: string
  duracion_min?: number
  temperatura_c?: number
  tecnica?: string
  punto_critico: boolean
  foto_url?: string
  activo: boolean
}

export interface RecetaFoto {
  id: string
  receta_id: string
  restaurante_id: string
  url: string
  tipo: 'referencia' | 'proceso' | 'emplatado' | 'ingredientes' | 'presentacion'
  descripcion?: string
  es_principal: boolean
  orden: number
  subida_por?: string
  creado_en: string
}

export interface RecetaVersion {
  id: string
  receta_id: string
  restaurante_id: string
  version_numero: number
  procedimiento: string
  ingredientes_snap: RecetaIngrediente[]
  costo_total_snap?: number
  cambios_descripcion?: string
  modificado_por?: string
  creado_en: string
}

export interface RecetaProductoAfectado {
  receta_id: string
  producto_id: string
  restaurante_id: string
  cantidad_gramos: number
}

export interface ProduccionLote {
  id: string
  restaurante_id: string
  fecha: string
  turno: TurnoServicio
  estado: 'en_progreso' | 'completado' | 'cancelado'
  responsable_id?: string
  costo_total_lote?: number
  items_producidos: number
  notas?: string
  completado_en?: string
  creado_en: string
  responsable?: Pick<Usuario, 'id' | 'nombre'>
}

export interface ProduccionRegistro {
  id: string
  restaurante_id: string
  receta_id?: string
  producto_id?: string
  lote_id?: string
  cantidad_producida: number
  unidad: string
  cantidad_gramos?: number
  fecha_produccion: string
  turno: TurnoServicio
  responsable_id?: string
  porciones_reales?: number
  costo_produccion?: number
  costo_real?: number
  inventario_descontado: boolean
  ingredientes_consumidos?: Array<{
    producto_id: string
    nombre: string
    cantidad_gramos: number
    costo_linea: number
  }>
  notas?: string
  creado_en: string
  producto?: Producto
  receta?: Receta
  responsable?: Pick<Usuario, 'id' | 'nombre'>
}

export interface Merma {
  id: string
  restaurante_id: string
  producto_id: string
  cantidad: number
  unidad_medida: string
  cantidad_gramos?: number
  motivo: MotivaMerma
  responsable_id?: string
  costo_merma?: number
  notas?: string
  creado_en: string
  producto?: Producto
  responsable?: Pick<Usuario, 'id' | 'nombre'>
}

export interface Compra {
  id: string
  restaurante_id: string
  proveedor_id?: string
  fecha_compra: string
  numero_factura?: string
  total_compra: number
  estado: EstadoCompra
  imagen_factura_url?: string
  registrado_por?: string
  notas?: string
  proveedor?: Proveedor
  items?: CompraItem[]
}

export interface CompraItem {
  id: string
  compra_id: string
  producto_id: string
  cantidad: number
  unidad_medida: string
  cantidad_gramos?: number
  precio_unitario: number
  precio_total: number
  notas?: string
  producto?: Producto
}

export interface VentaImportacion {
  id: string
  restaurante_id: string
  fecha_inicio: string
  fecha_fin: string
  origen_sistema?: string
  archivo_url?: string
  estado_procesamiento: EstadoImportacion
  total_registros: number
  registros_normalizados: number
  registros_pendientes: number
  descuento_inventario_aplicado: boolean
  descuento_aplicado_en?: string
  descuento_aplicado_por?: string
  procesado_por?: string
  notas?: string
  creado_en: string
}

export interface VentaItem {
  id: string
  restaurante_id: string
  importacion_id?: string
  nombre_original: string
  nombre_normalizado?: string
  confianza_match?: number
  requiere_revision: boolean
  producto_id?: string
  receta_id?: string
  cantidad_vendida: number
  precio_unitario: number
  total: number
  fecha_venta: string
  dia_semana?: number
  hora_venta?: string
  comensales?: number
  inventario_descontado: boolean
  creado_en: string
  producto?: Producto
  receta?: Receta
}

export type ClasificacionDesviacion =
  | 'normal' | 'leve' | 'moderada' | 'critica' | 'sin_datos'

export interface AnalisisConsumo {
  id: string
  restaurante_id: string
  producto_id: string
  fecha_inicio: string
  fecha_fin: string
  periodo: 'dia' | 'semana' | 'mes'
  consumo_teorico_g: number
  consumo_real_g: number
  desviacion_g: number
  desviacion_pct: number | null
  costo_desviacion: number | null
  clasificacion: ClasificacionDesviacion
  causa_probable: string | null
  calculado_en: string
  revisado: boolean
  revisado_por: string | null
  notas: string | null
  producto?: Producto
}

export interface InventarioSnapshot {
  id: string
  restaurante_id: string
  producto_id: string
  fecha: string
  tipo_snapshot: 'apertura' | 'cierre' | 'manual'
  cantidad_gramos: number
  registrado_por: string | null
  notas: string | null
  creado_en: string
}

export interface AlertaSistema {
  id: string
  restaurante_id: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  mensaje: string
  datos: Record<string, unknown>
  leida: boolean
  leida_por: string | null
  leida_en: string | null
  referencia_id: string | null
  referencia_tipo: string | null
  creado_en: string
}

export interface Briefing {
  id: string
  restaurante_id: string
  fecha: string
  turno: TurnoServicio
  comensales_esperados: number | null
  confianza_estimacion: 'alta' | 'media' | 'baja' | null
  produccion_sugerida: Array<{
    nombre: string
    cantidad: number
    unidad: string
    prioridad: 'critica' | 'alta' | 'media' | 'baja'
    razon: string
  }>
  compras_sugeridas: Array<{
    producto: string
    cantidad_sugerida: number
    unidad: string
    urgencia: 'critica' | 'alta' | 'media' | 'baja'
    razon: string
  }>
  riesgos: Array<{
    tipo: string
    descripcion: string
    severidad: SeveridadAlerta
    accion_sugerida: string
  }>
  alertas: Array<{ tipo: string; mensaje: string }>
}

export interface CierreDiario {
  id: string
  restaurante_id: string
  fecha: string
  total_ventas: number
  total_mermas: number
  costo_mermas: number
  items_producidos: number
  costo_produccion: number
  briefing_id: string | null
  creado_en: string
}

// ─────────────────────────────────────────────────────────────
// FORMULARIOS
// ─────────────────────────────────────────────────────────────

export interface FormNuevaReceta {
  nombre: string
  descripcion?: string
  categoria_id?: string
  rendimiento_porciones: number
  unidad_rendimiento: string
  precio_venta?: number
  tiempo_preparacion?: number
  dificultad?: DificultadReceta
  en_carta: boolean
  es_produccion: boolean
}

export interface FormNuevaMerma {
  producto_id: string
  cantidad: number
  unidad_medida: string
  motivo: MotivaMerma
  responsable_id?: string
  notas?: string
}

export interface FormAjusteInventario {
  producto_id: string
  cantidad_fisica: number
  unidad_medida: UnidadEntrada
  motivo?: string
}

export interface FormNuevaCompra {
  proveedor_id?: string
  fecha_compra: string
  numero_factura?: string
  notas?: string
  items: Array<{
    producto_id: string
    cantidad: number
    unidad_medida: string
    precio_unitario: number
  }>
}

// ─────────────────────────────────────────────────────────────
// PERMISOS
// ─────────────────────────────────────────────────────────────

export type Permiso =
  | 'ver_dashboard'
  | 'ver_recetas'
  | 'ver_costo_recetas'
  | 'crear_recetas'
  | 'editar_recetas'
  | 'eliminar_recetas'
  | 'registrar_produccion'
  | 'registrar_mermas'
  | 'ver_historial_mermas'
  | 'ver_inventario'
  | 'ajustar_inventario'
  | 'ver_compras'
  | 'registrar_compras'
  | 'ver_ventas'
  | 'importar_ventas'
  | 'ver_alertas'
  | 'usar_ia'
  | 'configurar_restaurante'
  | 'gestionar_usuarios'
  | 'ver_analisis'

export const PERMISOS_POR_ROL: Record<RolUsuario, Permiso[]> = {
  dueño: [
    'ver_dashboard', 'ver_recetas', 'ver_costo_recetas',
    'crear_recetas', 'editar_recetas', 'eliminar_recetas',
    'registrar_produccion', 'registrar_mermas', 'ver_historial_mermas',
    'ver_inventario', 'ajustar_inventario',
    'ver_compras', 'registrar_compras',
    'ver_ventas', 'importar_ventas',
    'ver_alertas', 'usar_ia',
    'configurar_restaurante', 'gestionar_usuarios', 'ver_analisis',
  ],
  administrador: [
    'ver_dashboard', 'ver_recetas', 'ver_costo_recetas',
    'registrar_produccion', 'registrar_mermas', 'ver_historial_mermas',
    'ver_inventario', 'ajustar_inventario',
    'ver_compras', 'registrar_compras',
    'ver_ventas', 'importar_ventas',
    'ver_alertas', 'usar_ia', 'gestionar_usuarios', 'ver_analisis',
  ],
  chef_ejecutivo: [
    'ver_dashboard', 'ver_recetas', 'ver_costo_recetas',
    'crear_recetas', 'editar_recetas',
    'registrar_produccion', 'registrar_mermas', 'ver_historial_mermas',
    'ver_inventario', 'ajustar_inventario',
    'ver_compras', 'registrar_compras',
    'ver_alertas', 'usar_ia', 'ver_analisis',
  ],
  chef_cocina: [
    'ver_dashboard', 'ver_recetas', 'ver_costo_recetas',
    'crear_recetas', 'editar_recetas',
    'registrar_produccion', 'registrar_mermas', 'ver_historial_mermas',
    'ver_inventario', 'ajustar_inventario',
    'ver_alertas', 'usar_ia',
  ],
  cocinero: [
    'ver_dashboard', 'ver_recetas',
    'registrar_produccion', 'registrar_mermas',
    'ver_inventario',
    'ver_alertas', 'usar_ia',
  ],
}

export function tienePermiso(rol: RolUsuario, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol]?.includes(permiso) ?? false
  }
  
