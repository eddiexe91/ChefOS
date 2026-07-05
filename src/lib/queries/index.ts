/**
 * src/lib/queries/index.ts
 *
 * Infraestructura centralizada de queries de ChefOS.
 *
 * Responsabilidades únicas de este archivo:
 * - Definir Query Keys jerárquicos para todos los dominios.
 * - Definir contratos de fetchers exportados.
 *
 * IMPORTANTE — CLIENT ONLY:
 * Los fetchers están diseñados para ejecutarse exclusivamente en el cliente.
 * Nunca importar desde Server Components, Route Handlers ni Server Actions.
 *
 * ESTADO (Fase 3.2 — Iteración 1):
 * fetchProductos y fetchProductoPorId implementados con queries reales.
 * Los demás fetchers siguen siendo placeholders hasta iteraciones siguientes.
 *
 * TODO (Fase 3.2 — iteraciones siguientes):
 * - Implementar fetchers restantes por orden de dependencia.
 * - Regenerar database.types.ts con Supabase CLI cuando esté disponible.
 */

import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

import type {
  Receta,
  Producto,
  AlertaSistema,
  Merma,
  Compra,
  ProduccionLote,
  ProduccionRegistro,
  Usuario,
  Restaurante,
  Briefing,
  CierreDiario,
} from '@/types/index'

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 1 — Tipos auxiliares y contratos internos
// ═══════════════════════════════════════════════════════════════

/**
 * Tipo real del cliente Supabase.
 * Derivado de obtenerClienteNavegador() — única fuente autorizada en ChefOS.
 *
 * createBrowserClient<Database> retorna SupabaseClient<Database>.
 * Mientras database.types.ts sea un placeholder (Database = any),
 * el cliente acepta cualquier nombre de tabla sin verificación estática.
 * Se volverá completamente tipado al regenerar database.types.ts con CLI.
 */
type ClienteSupabase = ReturnType<typeof obtenerClienteNavegador>

/**
 * Métricas del dashboard.
 *
 * Agrupa los tipos conocidos de Briefing y CierreDiario.
 *
 * TODO (Fase 3.2):
 * El campo `resumen` debe ser reemplazado por una interfaz
 * concreta una vez validadas las vistas o queries de agregación en Supabase.
 */
export interface MetricasDashboard {
  briefing: Briefing | null
  cierre: CierreDiario | null
  /**
   * TODO (Fase 3.2):
   * Reemplazar por interfaz de agregaciones reales:
   * totales de ventas, producción, mermas, alertas activas, etc.
   */
  resumen: unknown
}

/**
 * Filtros comunes de paginación reutilizables entre dominios.
 */
export interface FiltrosPaginacion {
  pagina?: number
  por_pagina?: number
}

/**
 * Filtros para fetchers de recetas.
 * Alineados con la interfaz Receta de src/types/index.ts
 */
export interface FiltrosReceta extends FiltrosPaginacion {
  categoria_id?: string
  activa?: boolean
  en_carta?: boolean
  es_produccion?: boolean
}

/**
 * Filtros para fetchers de productos.
 * Alineados con la interfaz Producto de src/types/index.ts
 */
export interface FiltrosProducto extends FiltrosPaginacion {
  categoria_id?: string
  activo?: boolean
  stock_bajo?: boolean
}

export interface FiltrosMerma extends FiltrosPaginacion {
  producto_id?: string
  fecha_desde?: string
  fecha_hasta?: string
}

export interface FiltrosCompra extends FiltrosPaginacion {
  proveedor_id?: string
  estado?: Compra['estado']
  fecha_desde?: string
  fecha_hasta?: string
}

export interface FiltrosProduccion extends FiltrosPaginacion {
  lote_id?: string
  fecha_desde?: string
  fecha_hasta?: string
}

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 2 — Query Keys jerárquicos
// ═══════════════════════════════════════════════════════════════

/**
 * Patrón de fábrica jerárquica uniforme en tres niveles.
 * Compatible con React Query v5: useQuery, invalidateQueries, setQueryData.
 */

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metricas: () =>
    [...dashboardKeys.all, 'metricas'] as const,
  briefing: (fecha: string) =>
    [...dashboardKeys.all, 'briefing', { fecha }] as const,
  cierreDiario: (fecha: string) =>
    [...dashboardKeys.all, 'cierreDiario', { fecha }] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Biblioteca culinaria
// ─────────────────────────────────────────────────────────────

export const bibliotecaKeys = {
  all: ['biblioteca'] as const,
  recetas: () =>
    [...bibliotecaKeys.all, 'recetas'] as const,
  recetasFiltradas: (filtros: FiltrosReceta) =>
    [...bibliotecaKeys.recetas(), { filtros }] as const,
  receta: (id: string) =>
    [...bibliotecaKeys.recetas(), { id }] as const,
  categorias: () =>
    [...bibliotecaKeys.all, 'categorias'] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Inventario
// ─────────────────────────────────────────────────────────────

export const inventarioKeys = {
  all: ['inventario'] as const,
  productos: () =>
    [...inventarioKeys.all, 'productos'] as const,
  productosFiltrados: (filtros: FiltrosProducto) =>
    [...inventarioKeys.productos(), { filtros }] as const,
  producto: (id: string) =>
    [...inventarioKeys.productos(), { id }] as const,
  movimientos: (producto_id: string) =>
    [...inventarioKeys.all, 'movimientos', { producto_id }] as const,
  snapshots: (fecha: string) =>
    [...inventarioKeys.all, 'snapshots', { fecha }] as const,
  categorias: () =>
    [...inventarioKeys.all, 'categorias'] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Producción
// ─────────────────────────────────────────────────────────────

export const produccionKeys = {
  all: ['produccion'] as const,
  lotes: () =>
    [...produccionKeys.all, 'lotes'] as const,
  lotesFiltrados: (filtros?: FiltrosProduccion) =>
    [...produccionKeys.lotes(), { filtros }] as const,
  lote: (id: string) =>
    [...produccionKeys.lotes(), { id }] as const,
  registros: (filtros?: FiltrosProduccion) =>
    [...produccionKeys.all, 'registros', { filtros }] as const,
  registro: (id: string) =>
    [...produccionKeys.all, 'registros', { id }] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Mermas
// ─────────────────────────────────────────────────────────────

export const mermasKeys = {
  all: ['mermas'] as const,
  lista: (filtros?: FiltrosMerma) =>
    [...mermasKeys.all, 'lista', { filtros }] as const,
  merma: (id: string) =>
    [...mermasKeys.all, 'lista', { id }] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Alertas
// ─────────────────────────────────────────────────────────────

export const alertasKeys = {
  all: ['alertas'] as const,
  lista: () =>
    [...alertasKeys.all, 'lista'] as const,
  activas: () =>
    [...alertasKeys.lista(), 'activas'] as const,
  alerta: (id: string) =>
    [...alertasKeys.lista(), { id }] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Compras
// ─────────────────────────────────────────────────────────────

export const comprasKeys = {
  all: ['compras'] as const,
  lista: (filtros?: FiltrosCompra) =>
    [...comprasKeys.all, 'lista', { filtros }] as const,
  compra: (id: string) =>
    [...comprasKeys.all, 'lista', { id }] as const,
  proveedores: () =>
    [...comprasKeys.all, 'proveedores'] as const,
  proveedor: (id: string) =>
    [...comprasKeys.all, 'proveedores', { id }] as const,
} as const

// ─────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────

export const configuracionKeys = {
  all: ['configuracion'] as const,
  restaurante: () =>
    [...configuracionKeys.all, 'restaurante'] as const,
  usuarios: () =>
    [...configuracionKeys.all, 'usuarios'] as const,
  usuario: (id: string) =>
    [...configuracionKeys.all, 'usuarios', { id }] as const,
} as const

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 3 — Fetchers
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Dashboard — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchMetricasDashboard(
  _client: ClienteSupabase
): Promise<MetricasDashboard> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Biblioteca — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchRecetas(
  _client: ClienteSupabase,
  _filtros?: FiltrosReceta
): Promise<Receta[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchRecetaPorId(
  _client: ClienteSupabase,
  _id: string
): Promise<Receta> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Inventario — IMPLEMENTADO (Fase 3.2 — Iteración 1)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna todos los productos activos del restaurante autenticado.
 *
 * RLS filtra automáticamente por restaurante via mi_restaurante_id().
 * No se necesita .eq('restaurante_id', ...) explícito.
 *
 * Relaciones cargadas:
 * - categoria: categorias_producto — necesaria para display en lista.
 *   FK: productos.categoria_id → categorias_producto.id
 *
 * Filtros aplicados:
 * - activo = true (obligatorio — activa índices partial idx_productos_stock
 *   e idx_productos_nombre_trgm definidos en DATABASE_SPEC)
 * - categoria_id (opcional)
 * - stock_bajo: cantidad_gramos <= stock_minimo_gramos (filtrado en cliente)
 *
 * Proveedor omitido en listado general — solo se carga en fetchProductoPorId.
 *
 * Ordenación: nombre ASC (alfabética)
 *
 * TODO (Fase 3.2 — iteración futura):
 * - Implementar paginación cuando el volumen lo requiera.
 */
export async function fetchProductos(
  client: ClienteSupabase,
  filtros?: FiltrosProducto
): Promise<Producto[]> {
  let query = client
    .from('productos')
    .select(`
      *,
      categoria:categorias_producto(id, nombre, tipo, activa, restaurante_id)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (filtros?.categoria_id) {
    query = query.eq('categoria_id', filtros.categoria_id)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/inventario] Error al cargar productos: ${error.message}`
    )
  }

  const productos = (data ?? []) as Producto[]

  if (filtros?.stock_bajo) {
    return productos.filter((p) =>
      p.cantidad_gramos !== undefined && p.stock_minimo_gramos !== undefined
        ? p.cantidad_gramos <= p.stock_minimo_gramos
        : p.stock_actual <= p.stock_minimo
    )
  }

  return productos
}

/**
 * Retorna un producto activo por ID con todas sus relaciones.
 *
 * RLS garantiza que solo se accede a productos del restaurante autenticado.
 *
 * Relaciones cargadas:
 * - categoria: categorias_producto — completa.
 *   FK: productos.categoria_id → categorias_producto.id
 * - proveedor_principal: proveedores — completo.
 *   FK: productos.proveedor_principal_id → proveedores.id
 *
 * Comportamiento ante ausencia de datos:
 * - error Supabase (incluido PGRST116 de .single()) → lanza Error con mensaje.
 * - data null (RLS oculta la fila) → lanza Error descriptivo.
 *
 * @throws Error si el producto no existe, está inactivo o no pertenece
 *         al restaurante autenticado.
 */
export async function fetchProductoPorId(
  client: ClienteSupabase,
  id: string
): Promise<Producto> {
  const { data, error } = await client
    .from('productos')
    .select(`
      *,
      categoria:categorias_producto(id, nombre, tipo, activa, restaurante_id),
      proveedor_principal:proveedores(id, nombre, contacto, telefono, email, activo, restaurante_id, ruc_nit, condiciones_pago, dias_entrega, notas)
    `)
    .eq('id', id)
    .eq('activo', true)
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/inventario] Error al cargar producto "${id}": ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/inventario] Producto "${id}" no encontrado o no disponible.`
    )
  }

  return data as Producto
}

// ─────────────────────────────────────────────────────────────
// Producción — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchLotesProduccion(
  _client: ClienteSupabase,
  _filtros?: FiltrosProduccion
): Promise<ProduccionLote[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchLoteProduccionPorId(
  _client: ClienteSupabase,
  _id: string
): Promise<ProduccionLote> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchRegistrosProduccion(
  _client: ClienteSupabase,
  _filtros?: FiltrosProduccion
): Promise<ProduccionRegistro[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Mermas — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchMermas(
  _client: ClienteSupabase,
  _filtros?: FiltrosMerma
): Promise<Merma[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Alertas — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchAlertasActivas(
  _client: ClienteSupabase
): Promise<AlertaSistema[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Compras — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchCompras(
  _client: ClienteSupabase,
  _filtros?: FiltrosCompra
): Promise<Compra[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchCompraPorId(
  _client: ClienteSupabase,
  _id: string
): Promise<Compra> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Configuración — placeholder
// ─────────────────────────────────────────────────────────────

export async function fetchRestaurante(
  _client: ClienteSupabase
): Promise<Restaurante> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchUsuarios(
  _client: ClienteSupabase
): Promise<Usuario[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchUsuarioPorId(
  _client: ClienteSupabase,
  _id: string
): Promise<Usuario> {
  throw new Error('TODO: implementar en Fase 3.2')
  }
