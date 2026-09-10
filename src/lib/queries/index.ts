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
 * ESTADO (Fase 3.2 — Iteración 8 — COMPLETA):
 * - fetchProductos y fetchProductoPorId: implementados (Iteración 1).
 * - fetchRecetas y fetchRecetaPorId: implementados (Iteración 2).
 * - fetchLotesProduccion, fetchLoteProduccionPorId,
 *   fetchRegistrosProduccion: implementados (Iteración 3).
 * - fetchMermas: implementado (Iteración 4).
 * - fetchAlertasActivas: implementado (Iteración 5).
 * - fetchCompras y fetchCompraPorId: implementados (Iteración 6).
 * - fetchRestaurante, fetchUsuarios, fetchUsuarioPorId: implementados (Iteración 7).
 * - fetchMetricasDashboard: implementado (Iteración 8).
 *
 * NOTA ARQUITECTÓNICA:
 * El dashboard reúne briefing, cierre diario y totales operativos del día.
 * Las consultas están acotadas por RLS al restaurante de la sesión.
 */

import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

import type {
  Receta,
  Producto,
  MovimientoInventario,
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
 * ESTADO ACTUAL:
 * - briefing: implementado — tabla `briefings` disponible en Supabase.
 * - cierre: registro de `cierres_diarios` si el cron ya lo generó.
 * - resumen: totales operativos calculados desde las tablas del día.
 */
export interface ResumenDashboard {
  totalVentas: number
  totalMermas: number
  costoMermas: number
  itemsProducidos: number
  costoProduccion: number
  productosBajoMinimo: number
}

export interface MetricasDashboard {
  briefing: Briefing | null
  cierre: CierreDiario | null
  resumen: ResumenDashboard
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
// Dashboard — IMPLEMENTADO (Fase 3.2 — Iteración 8)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna las métricas del dashboard para el día actual.
 *
 * IMPLEMENTACIÓN ACTUAL:
 * Consulta exclusivamente la tabla `briefings` filtrando por la fecha
 * de hoy. Retorna el briefing más reciente del día (último turno generado).
 *
 * Se usa .maybeSingle() porque puede no existir briefing para el día actual
 * — la IA lo genera bajo demanda, no automáticamente al inicio del día.
 * A diferencia de .single(), .maybeSingle() retorna null sin error cuando
 * no hay filas, lo que es el comportamiento correcto aquí.
 *
 * RLS: SELECT permitido a todos los roles — "todos" en tabla briefings.
 *
 * Índice utilizado:
 * idx_briefings_fecha ON briefings(restaurante_id, fecha DESC, turno)
 * Marcado en DATABASE_SPEC como "query más crítica del sistema".
 *
 * @returns MetricasDashboard con briefing del día o null si no existe.
 */
export async function fetchMetricasDashboard(
  client: ClienteSupabase
): Promise<MetricasDashboard> {
  const hoy = new Date().toISOString().split('T')[0]

  const [briefingResult, cierreResult, ventasResult, mermasResult, produccionResult, stockResult] = await Promise.all([
    client.from('briefings').select('*').eq('fecha', hoy).order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    client.from('cierres_diarios').select('*').eq('fecha', hoy).maybeSingle(),
    client.from('ventas_items').select('total').eq('fecha_venta', hoy),
    client.from('mermas').select('cantidad, costo_merma').gte('creado_en', `${hoy}T00:00:00.000Z`).lt('creado_en', `${hoy}T23:59:59.999Z`),
    client.from('produccion_registros').select('cantidad_producida, costo_real, costo_produccion').eq('fecha_produccion', hoy),
    client.from('productos').select('cantidad_gramos, stock_minimo_gramos').eq('activo', true),
  ])

  if (briefingResult.error || cierreResult.error || ventasResult.error || mermasResult.error || produccionResult.error || stockResult.error) {
    throw new Error(
      `[ChefOS/dashboard] Error al cargar los datos del día: ${(briefingResult.error ?? cierreResult.error ?? ventasResult.error ?? mermasResult.error ?? produccionResult.error ?? stockResult.error)?.message ?? 'desconocido'}`
    )
  }

  const resumen: ResumenDashboard = {
    totalVentas: (ventasResult.data ?? []).reduce((suma, item) => suma + Number(item.total ?? 0), 0),
    totalMermas: (mermasResult.data ?? []).reduce((suma, item) => suma + Number(item.cantidad ?? 0), 0),
    costoMermas: (mermasResult.data ?? []).reduce((suma, item) => suma + Number(item.costo_merma ?? 0), 0),
    itemsProducidos: (produccionResult.data ?? []).reduce((suma, item) => suma + Number(item.cantidad_producida ?? 0), 0),
    costoProduccion: (produccionResult.data ?? []).reduce((suma, item) => suma + Number(item.costo_real ?? item.costo_produccion ?? 0), 0),
    productosBajoMinimo: (stockResult.data ?? []).filter((item) => Number(item.cantidad_gramos ?? 0) <= Number(item.stock_minimo_gramos ?? 0)).length,
  }

  return {
    briefing: briefingResult.data as Briefing | null,
    cierre: cierreResult.data as CierreDiario | null,
    resumen,
  }
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
 * TODO (fase futura):
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
 *
 * Filtros aplicados:
 * - activo = true (obligatorio — activa índices partial idx_productos_stock
 *   e idx_productos_nombre_trgm definidos en DATABASE_SPEC)
 * - categoria_id (opcional)
 * - stock_bajo: cantidad_gramos <= stock_minimo_gramos (filtrado en cliente)
 *
 * Relaciones cargadas:
 * - categoria: categorias_producto — necesaria para display en lista.
 *   FK: productos.categoria_id → categorias_producto.id
 *
 * Ordenación: nombre ASC (alfabética).
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
 * Relaciones cargadas:
 * - categoria: categorias_producto — completa.
 * - proveedor_principal: proveedores — completo.
 *
 * @throws Error si el producto no existe o no pertenece al restaurante.
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

/**
 * Retorna el historial de movimientos de inventario de un producto.
 *
 * Relaciones cargadas: producto, registrado_por_usuario.
 * Filtro obligatorio: producto_id.
 * Ordenación: creado_en DESC.
 */
export async function fetchMovimientos(
  client: ClienteSupabase,
  producto_id: string
): Promise<MovimientoInventario[]> {
  const { data, error } = await client
    .from('inventario_movimientos')
    .select(`
      *,
      producto:productos(id, nombre, unidad_medida, costo_unitario_actual, activo),
      registrado_por_usuario:usuarios(id, nombre)
    `)
    .eq('producto_id', producto_id)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(
      `[ChefOS/inventario] Error al cargar movimientos del producto "${producto_id}": ${error.message}`
    )
  }

  return (data ?? []) as MovimientoInventario[]
}

// ─────────────────────────────────────────────────────────────
// Producción — IMPLEMENTADO (Fase 3.2 — Iteración 3)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna los lotes de producción del restaurante autenticado.
 *
 * No existe columna `activo` en produccion_lotes — no hay filtro de activo.
 *
 * Relaciones cargadas:
 * - responsable: usuarios(id, nombre) — Pick<Usuario, 'id'|'nombre'>
 *
 * Filtros opcionales: fecha_desde, fecha_hasta.
 * Ordenación: fecha DESC.
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
 * @throws Error si el lote no existe.
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
 * Relaciones cargadas: receta, producto, responsable.
 * Filtros opcionales: lote_id, fecha_desde, fecha_hasta.
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
 * RLS SELECT restringido a chefs+. Un cocinero puede registrar (INSERT)
 * pero no leer (SELECT) — RLS retornará array vacío sin error.
 *
 * Relaciones cargadas: producto, responsable.
 * Filtros opcionales: producto_id, fecha_desde, fecha_hasta (sobre creado_en).
 * Ordenación: creado_en DESC.
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
// Alertas — IMPLEMENTADO (Fase 3.2 — Iteración 5)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna todas las alertas no leídas del restaurante autenticado.
 *
 * Filtro obligatorio: leida = false
 * Activa el índice: idx_alertas_no_leidas WHERE leida=false
 * Ordenación: creado_en DESC.
 */
export async function fetchAlertasActivas(
  client: ClienteSupabase
): Promise<AlertaSistema[]> {
  const { data, error } = await client
    .from('alertas_sistema')
    .select('*')
    .eq('leida', false)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(
      `[ChefOS/alertas] Error al cargar alertas activas: ${error.message}`
    )
  }

  return (data ?? []) as AlertaSistema[]
}

// ─────────────────────────────────────────────────────────────
// Compras — IMPLEMENTADO (Fase 3.2 — Iteración 6)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna las compras del restaurante autenticado.
 *
 * RLS SELECT permitido a chefs+.
 * Items NO cargados en listado — solo en fetchCompraPorId.
 * registrado_por es UUID string — no se expande a Usuario.
 *
 * Relaciones cargadas: proveedor (completo).
 * Filtros opcionales: proveedor_id, estado, fecha_desde, fecha_hasta.
 * Ordenación: fecha_compra DESC.
 */
export async function fetchCompras(
  client: ClienteSupabase,
  filtros?: FiltrosCompra
): Promise<Compra[]> {
  let query = client
    .from('compras')
    .select(`
      *,
      proveedor:proveedores(id, restaurante_id, nombre, contacto, telefono, email, ruc_nit, condiciones_pago, dias_entrega, activo, notas)
    `)
    .order('fecha_compra', { ascending: false })

  if (filtros?.proveedor_id) {
    query = query.eq('proveedor_id', filtros.proveedor_id)
  }

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros?.fecha_desde) {
    query = query.gte('fecha_compra', filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_compra', filtros.fecha_hasta)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[ChefOS/compras] Error al cargar compras: ${error.message}`
    )
  }

  return (data ?? []) as Compra[]
}

/**
 * Retorna una compra por ID con todas sus relaciones.
 *
 * Relaciones cargadas: proveedor completo + items con producto anidado.
 *
 * @throws Error si la compra no existe o no pertenece al restaurante.
 */
export async function fetchCompraPorId(
  client: ClienteSupabase,
  id: string
): Promise<Compra> {
  const { data, error } = await client
    .from('compras')
    .select(`
      *,
      proveedor:proveedores(id, restaurante_id, nombre, contacto, telefono, email, ruc_nit, condiciones_pago, dias_entrega, activo, notas),
      items:compras_items(
        id,
        compra_id,
        producto_id,
        cantidad,
        unidad_medida,
        cantidad_gramos,
        precio_unitario,
        precio_total,
        notas,
        producto:productos(
          id,
          nombre,
          unidad_medida,
          unidad_display,
          costo_unitario_actual,
          activo
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/compras] Error al cargar compra "${id}": ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/compras] Compra "${id}" no encontrada o no disponible.`
    )
  }

  return data as Compra
}

// ─────────────────────────────────────────────────────────────
// Configuración — IMPLEMENTADO (Fase 3.2 — Iteración 7)
// ─────────────────────────────────────────────────────────────

/**
 * Retorna el restaurante del usuario autenticado.
 *
 * RLS retorna exactamente el restaurante propio.
 * Sin filtros explícitos — .single() consume el único resultado.
 * Sin joins — Restaurante es interfaz plana.
 *
 * @throws Error si el usuario no está asociado a ningún restaurante.
 */
export async function fetchRestaurante(
  client: ClienteSupabase
): Promise<Restaurante> {
  const { data, error } = await client
    .from('restaurantes')
    .select('*')
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/configuracion] Error al cargar restaurante: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/configuracion] Restaurante no encontrado para el usuario autenticado.`
    )
  }

  return data as Restaurante
}

/**
 * Retorna todos los usuarios del restaurante autenticado.
 *
 * RLS filtra automáticamente por restaurante.
 * Sin filtro de activo — retorna todos (activos e inactivos).
 * Sin joins — Usuario es interfaz plana.
 * Ordenación: nombre ASC.
 */
export async function fetchUsuarios(
  client: ClienteSupabase
): Promise<Usuario[]> {
  const { data, error } = await client
    .from('usuarios')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    throw new Error(
      `[ChefOS/configuracion] Error al cargar usuarios: ${error.message}`
    )
  }

  return (data ?? []) as Usuario[]
}

/**
 * Retorna un usuario por ID dentro del restaurante autenticado.
 *
 * RLS garantiza que solo se accede a usuarios del mismo restaurante.
 * Sin filtro de activo — permite cargar usuarios inactivos por ID.
 * Sin joins — Usuario es interfaz plana.
 *
 * @throws Error si el usuario no existe o no pertenece al restaurante.
 */
export async function fetchUsuarioPorId(
  client: ClienteSupabase,
  id: string
): Promise<Usuario> {
  const { data, error } = await client
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(
      `[ChefOS/configuracion] Error al cargar usuario "${id}": ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      `[ChefOS/configuracion] Usuario "${id}" no encontrado o no disponible.`
    )
  }

  return data as Usuario
}
