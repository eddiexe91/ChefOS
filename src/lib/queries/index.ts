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
 * ESTADO ACTUAL (Fase 3.1):
 * Los fetchers contienen exclusivamente placeholders.
 * Las implementaciones reales se completan en Fase 3.2,
 * una vez validados los nombres de tablas en Supabase.
 *
 * TODO (Fase 3.2):
 * - Reemplazar ClienteSupabase por el tipo real del cliente Supabase.
 * - Implementar el cuerpo real de cada fetcher.
 * - Importar obtenerClienteNavegador desde src/lib/supabase/navegador.ts
 */

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
 * Tipo temporal del cliente Supabase.
 *
 * TODO (Fase 3.2):
 * Reemplazar por el tipo real del cliente Supabase
 * cuando los fetchers reales sean implementados.
 */
type ClienteSupabase = unknown

/**
 * Métricas del dashboard.
 *
 * Agrupa los tipos conocidos de Briefing y CierreDiario.
 *
 * TODO (Fase 3.2):
 * El campo `resumen` debe ser reemplazado por una interfaz
 * concreta una vez validadas las vistas o queries de agregación
 * en Supabase (totales, tendencias, conteos por período).
 * No es posible tiparlo en Fase 3.1 sin asumir nombres
 * de tablas o estructuras de datos no confirmadas.
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
 * Patrón de fábrica jerárquica uniforme en tres niveles:
 *
 * Nivel 1 — Dominio:    bibliotecaKeys.all
 *                       → ['biblioteca']
 *
 * Nivel 2 — Entidad:    bibliotecaKeys.recetas()
 *                       → ['biblioteca', 'recetas']
 *
 * Nivel 3 — Filtro/ID:  bibliotecaKeys.receta('uuid')
 *                       → ['biblioteca', 'recetas', { id }]
 *                       bibliotecaKeys.recetasFiltradas({ activa: true })
 *                       → ['biblioteca', 'recetas', { filtros }]
 *
 * Compatible con React Query v5:
 * - useQuery
 * - useSuspenseQuery
 * - prefetchQuery
 * - invalidateQueries
 * - setQueryData
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
// SECCIÓN 3 — Contratos de fetchers
// ═══════════════════════════════════════════════════════════════

/**
 * Todos los fetchers de esta sección son contratos arquitectónicos.
 *
 * Estado actual: placeholder obligatorio.
 * Ningún fetcher realiza llamadas reales a Supabase en esta fase.
 * Ningún fetcher asume nombres de tablas ni estructuras de datos.
 *
 * Los parámetros están prefijados con _ para satisfacer
 * TypeScript strict sin warnings de ESLint por variables no utilizadas.
 *
 * TODO (Fase 3.2): implementar cuerpo real de cada fetcher.
 */

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

export async function fetchMetricasDashboard(
  _client: ClienteSupabase
): Promise<MetricasDashboard> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Biblioteca
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
// Inventario
// ─────────────────────────────────────────────────────────────

export async function fetchProductos(
  _client: ClienteSupabase,
  _filtros?: FiltrosProducto
): Promise<Producto[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

export async function fetchProductoPorId(
  _client: ClienteSupabase,
  _id: string
): Promise<Producto> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Producción
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
// Mermas
// ─────────────────────────────────────────────────────────────

export async function fetchMermas(
  _client: ClienteSupabase,
  _filtros?: FiltrosMerma
): Promise<Merma[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Alertas
// ─────────────────────────────────────────────────────────────

export async function fetchAlertasActivas(
  _client: ClienteSupabase
): Promise<AlertaSistema[]> {
  throw new Error('TODO: implementar en Fase 3.2')
}

// ─────────────────────────────────────────────────────────────
// Compras
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
// Configuración
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
