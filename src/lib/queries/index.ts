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
 * ESTADO (Fase 3.2 — Iteración 4):
 * - fetchProductos y fetchProductoPorId: implementados (Iteración 1).
 * - fetchRecetas y fetchRecetaPorId: implementados (Iteración 2).
 * - fetchLotesProduccion, fetchLoteProduccionPorId,
 *   fetchRegistrosProduccion: implementados (Iteración 3).
 * - fetchMermas: implementado (Iteración 4).
 * - Demás fetchers: placeholders hasta iteraciones siguientes.
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
  /**
   * Key para el lote activo del turno actual.
   * Invalidado por AppProvider cuando llega un INSERT en produccion_registros.
   */
  loteActivo: () =>
    [...produccionKeys.all, 'loteActivo'] as const,
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
// Biblioteca — IMPLEMENTADO (Fase 3.2 — Iteración 2)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna todas las recetas activas del restaurante autenticado.
 *
 * RLS filtra automáticamente por restaurante y por activa=true
 * ("activas mismo restaurante" — DATABASE_SPEC sección RLS).
 * El filtro .eq('activa', true) se incluye igualmente para activar
 * el índice partial idx_recetas_nombre_trgm WHERE activa=true.
 *
 * Relaciones cargadas:
 * - categoria: categorias_receta — necesaria para display en lista.
 *   FK: recetas.categoria_id → categorias_receta.id
 *
 * Ingredientes NO cargados en listado general — costoso y no necesario.
 * Se cargan únicamente en fetchRecetaPorId.
 *
 * Filtros opcionales:
 * - categoria_id: filtra por categoría de receta.
 * - en_carta: filtra recetas de carta.
 * - es_produccion: filtra mise en place.
 *
 * Ordenación: nombre ASC (alfabética).
 *
 * TODO (Fase 3.2 — iteración futura):
 * - Implementar paginación cuando el volumen lo requiera.
 * - Añadir filtro por costo_desactualizado para badge de alerta.
 */
export async function fetchRecetas(
  client: ClienteSupabase,
  filtros?: FiltrosReceta
): Promise<Receta[]> {
  let query = client
    .from('recetas')
    .select(`
      *,
      categoria:categorias_receta(id, restaurante_id, nombre, orden, activa)
    `)
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (filtros?.categoria_id) {
    query = query.eq('categoria_id', filtros.categoria_id)
  }

  if (filtros?.en_carta !== undefined) {
    query = query.eq('en_carta', filtros.en_carta)
  }

  if (filtros?.es_produccion !== undefined) {
    query = query.eq('es_produccion', filtros.es_produccion)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/biblioteca] Error al cargar recetas: ${error.message}`
    )
  }

  return (data ?? []) as Receta[]
}

/**
 * Retorna una receta activa por ID con todas sus relaciones.
 *
 * RLS garantiza que solo se accede a recetas del restaurante autenticado.
 *
 * Relaciones cargadas:
 * - categoria: categorias_receta — completa.
 *   FK: recetas.categoria_id → categorias_receta.id
 * - ingredientes: recetas_ingredientes con producto anidado.
 *   FK: recetas_ingredientes.receta_id → recetas.id
 *   FK: recetas_ingredientes.producto_id → productos.id
 *
 * Ordenación de ingredientes: por campo `orden` ASC en cliente.
 * referencedTable no está disponible en supabase-js v2.
 *
 * @throws Error si la receta no existe, está inactiva o no pertenece
 *         al restaurante autenticado.
 */
export async function fetchRecetaPorId(
  client: ClienteSupabase,
  id: string
): Promise<Receta> {
  const { data, error } = await client
    .from('recetas')
    .select(`
      *,
      categoria:categorias_receta(id, restaurante_id, nombre, orden, activa),
      ingredientes:recetas_ingredientes(
        id,
        receta_id,
        producto_id,
        cantidad,
        unidad_medida,
        cantidad_gramos,
        es_opcional,
        orden,
        notas,
        producto:productos(
          id,
          nombre,
          unidad_medida,
          unidad_display,
          costo_unitario_actual,
          costo_por_gramo,
          stock_actual,
          stock_minimo,
          activo
        )
      )
    `)
    .eq('id', id)
    .eq('activa', true)
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/biblioteca] Error al cargar receta "${id}": ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/biblioteca] Receta "${id}" no encontrada o no disponible.`
    )
  }

  const receta = data as Receta

  // Ordenar ingredientes por campo `orden` ASC en cliente.
  if (receta.ingredientes) {
    receta.ingredientes = [...receta.ingredientes].sort(
      (a, b) => a.orden - b.orden
    )
  }

  return receta
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
 * Proveedor omitido en listado general — solo en fetchProductoPorId.
 *
 * Ordenación: nombre ASC (alfabética).
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
// Producción — IMPLEMENTADO (Fase 3.2 — Iteración 3)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna los lotes de producción del restaurante autenticado.
 *
 * RLS filtra automáticamente por restaurante via mi_restaurante_id().
 *
 * No existe columna `activo` en produccion_lotes — no hay filtro de activo.
 * El estado del lote ('en_progreso' / 'completado' / 'cancelado') es el
 * mecanismo de ciclo de vida, no un campo activo/inactivo.
 *
 * Relaciones cargadas:
 * - responsable: usuarios(id, nombre) — Pick<Usuario, 'id'|'nombre'>
 *   FK: produccion_lotes.responsable_id → usuarios.id
 *
 * Filtros opcionales (de FiltrosProduccion):
 * - fecha_desde: filtra lotes desde esa fecha.
 * - fecha_hasta: filtra lotes hasta esa fecha.
 *
 * Ordenación: fecha DESC (lotes más recientes primero).
 */
export async function fetchLotesProduccion(
  client: ClienteSupabase,
  filtros?: FiltrosProduccion
): Promise<ProduccionLote[]> {
  let query = client
    .from('produccion_lotes')
    .select(`
      *,
      responsable:usuarios(id, nombre)
    `)
    .order('fecha', { ascending: false })

  if (filtros?.fecha_desde) {
    query = query.gte('fecha', filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha', filtros.fecha_hasta)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/produccion] Error al cargar lotes: ${error.message}`
    )
  }

  return (data ?? []) as ProduccionLote[]
}

/**
 * Retorna un lote de producción por ID.
 *
 * RLS garantiza que solo se accede a lotes del restaurante autenticado.
 *
 * Relaciones cargadas:
 * - responsable: usuarios(id, nombre) — Pick<Usuario, 'id'|'nombre'>
 *   FK: produccion_lotes.responsable_id → usuarios.id
 *
 * @throws Error si el lote no existe o no pertenece al restaurante autenticado.
 */
export async function fetchLoteProduccionPorId(
  client: ClienteSupabase,
  id: string
): Promise<ProduccionLote> {
  const { data, error } = await client
    .from('produccion_lotes')
    .select(`
      *,
      responsable:usuarios(id, nombre)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/produccion] Error al cargar lote "${id}": ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/produccion] Lote "${id}" no encontrado o no disponible.`
    )
  }

  return data as ProduccionLote
}

/**
 * Retorna los registros de producción del restaurante autenticado.
 *
 * RLS sobre produccion_registros permite SELECT a todos los roles.
 *
 * Relaciones cargadas:
 * - receta: recetas(id, nombre)
 *   FK: produccion_registros.receta_id → recetas.id
 * - producto: productos(id, nombre, unidad_medida)
 *   FK: produccion_registros.producto_id → productos.id
 * - responsable: usuarios(id, nombre) — Pick<Usuario, 'id'|'nombre'>
 *   FK: produccion_registros.responsable_id → usuarios.id
 *
 * Filtros opcionales (de FiltrosProduccion):
 * - lote_id: filtra registros de un lote específico.
 * - fecha_desde / fecha_hasta: rango de fecha_produccion.
 *
 * Ordenación: fecha_produccion DESC.
 */
export async function fetchRegistrosProduccion(
  client: ClienteSupabase,
  filtros?: FiltrosProduccion
): Promise<ProduccionRegistro[]> {
  let query = client
    .from('produccion_registros')
    .select(`
      *,
      receta:recetas(id, nombre),
      producto:productos(id, nombre, unidad_medida),
      responsable:usuarios(id, nombre)
    `)
    .order('fecha_produccion', { ascending: false })

  if (filtros?.lote_id) {
    query = query.eq('lote_id', filtros.lote_id)
  }

  if (filtros?.fecha_desde) {
    query = query.gte('fecha_produccion', filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_produccion', filtros.fecha_hasta)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/produccion] Error al cargar registros de producción: ${error.message}`
    )
  }

  return (data ?? []) as ProduccionRegistro[]
}

// ─────────────────────────────────────────────────────────────
// Mermas — IMPLEMENTADO (Fase 3.2 — Iteración 4)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna las mermas del restaurante autenticado.
 *
 * RLS filtra automáticamente por restaurante via mi_restaurante_id().
 * SELECT restringido a chefs+ (chef_cocina, chef_ejecutivo, administrador, dueño).
 * Un cocinero puede registrar mermas (INSERT) pero no leerlas (SELECT).
 * En ese caso, RLS retornará array vacío sin error.
 *
 * No existe columna `activo` en mermas — no hay filtro de activo.
 * El trigger `trigger_costo_merma` calcula `costo_merma` en BEFORE INSERT;
 * el campo ya viene calculado en SELECT.
 *
 * Relaciones cargadas:
 * - producto: productos(id, nombre, unidad_medida, costo_unitario_actual, activo)
 *   FK: mermas.producto_id → productos.id
 * - responsable: usuarios(id, nombre) — Pick<Usuario, 'id'|'nombre'>
 *   FK: mermas.responsable_id → usuarios.id
 *
 * Filtros opcionales (de FiltrosMerma):
 * - producto_id: filtra mermas de un producto específico.
 * - fecha_desde: filtra mermas registradas desde esa fecha (creado_en).
 * - fecha_hasta: filtra mermas registradas hasta esa fecha (creado_en).
 *
 * Ordenación: creado_en DESC (mermas más recientes primero).
 *
 * TODO (Fase 3.2 — iteración futura):
 * - Añadir canal Realtime en AppProvider cuando se implemente el módulo UI.
 * - Implementar paginación cuando el volumen lo requiera.
 */
export async function fetchMermas(
  client: ClienteSupabase,
  filtros?: FiltrosMerma
): Promise<Merma[]> {
  let query = client
    .from('mermas')
    .select(`
      *,
      producto:productos(id, nombre, unidad_medida, costo_unitario_actual, activo),
      responsable:usuarios(id, nombre)
    `)
    .order('creado_en', { ascending: false })

  if (filtros?.producto_id) {
    query = query.eq('producto_id', filtros.producto_id)
  }

  if (filtros?.fecha_desde) {
    query = query.gte('creado_en', filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('creado_en', filtros.fecha_hasta)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/mermas] Error al cargar mermas: ${error.message}`
    )
  }

  return (data ?? []) as Merma[]
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
