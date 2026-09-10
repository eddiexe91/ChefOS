/**
 * src/hooks/useDominio.ts
 *
 * Hooks de dominio de ChefOS.
 *
 * Responsabilidad única:
 * Conectar los Query Keys y fetchers de src/lib/queries/index.ts
 * con React Query v5, exponiendo una API limpia para los componentes.
 *
 * IMPORTANTE — CLIENT ONLY:
 * Este archivo utiliza obtenerClienteNavegador() y useQuery.
 * Nunca importar desde Server Components, Route Handlers ni Server Actions.
 *
 * ESTADO ACTUAL (Fase 3.1):
 * Los fetchers son placeholders que lanzan un error.
 * Los hooks están correctamente conectados a la API definitiva
 * para evitar refactorizaciones en Fase 3.2.
 *
 * Importaciones autorizadas exclusivamente desde:
 * - @tanstack/react-query
 * - @/lib/queries
 * - @/lib/supabase/navegador
 */

import { useQuery } from '@tanstack/react-query'

import {
  dashboardKeys,
  bibliotecaKeys,
  inventarioKeys,
  produccionKeys,
  mermasKeys,
  alertasKeys,
  comprasKeys,
  configuracionKeys,
  fetchMetricasDashboard,
  fetchRecetas,
  fetchRecetaPorId,
  fetchProductos,
  fetchProductoPorId,
  fetchMovimientos,
  fetchLotesProduccion,
  fetchLoteProduccionPorId,
  fetchRegistrosProduccion,
  fetchMermas,
  fetchAlertasActivas,
  fetchCompras,
  fetchCompraPorId,
  fetchRestaurante,
  fetchUsuarios,
  fetchUsuarioPorId,
  type FiltrosReceta,
  type FiltrosProducto,
  type FiltrosProduccion,
  type FiltrosMerma,
  type FiltrosCompra,
} from '@/lib/queries'

import { obtenerClienteNavegador } from '@/lib/supabase/navegador'

// ═══════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════

export function useMetricasDashboard() {
  return useQuery({
    queryKey: dashboardKeys.metricas(),
    queryFn: () => fetchMetricasDashboard(obtenerClienteNavegador()),
  })
}

// ═══════════════════════════════════════════════════════════════
// Biblioteca culinaria
// ═══════════════════════════════════════════════════════════════

export function useRecetas(filtros?: FiltrosReceta) {
  return useQuery({
    queryKey: filtros
      ? bibliotecaKeys.recetasFiltradas(filtros)
      : bibliotecaKeys.recetas(),
    queryFn: () => fetchRecetas(obtenerClienteNavegador(), filtros),
  })
}

export function useReceta(id: string) {
  return useQuery({
    queryKey: bibliotecaKeys.receta(id),
    queryFn: () => fetchRecetaPorId(obtenerClienteNavegador(), id),
    enabled: Boolean(id),
  })
}

// ═══════════════════════════════════════════════════════════════
// Inventario
// ═══════════════════════════════════════════════════════════════

export function useProductos(filtros?: FiltrosProducto) {
  return useQuery({
    queryKey: filtros
      ? inventarioKeys.productosFiltrados(filtros)
      : inventarioKeys.productos(),
    queryFn: () => fetchProductos(obtenerClienteNavegador(), filtros),
  })
}

export function useProducto(id: string) {
  return useQuery({
    queryKey: inventarioKeys.producto(id),
    queryFn: () => fetchProductoPorId(obtenerClienteNavegador(), id),
    enabled: Boolean(id),
  })
}

export function useMovimientosInventario(producto_id: string) {
  return useQuery({
    queryKey: inventarioKeys.movimientos(producto_id),
    queryFn: () => fetchMovimientos(obtenerClienteNavegador(), producto_id),
    enabled: Boolean(producto_id),
  })
}

// ═══════════════════════════════════════════════════════════════
// Producción
// ═══════════════════════════════════════════════════════════════

export function useLotesProduccion(filtros?: FiltrosProduccion) {
  return useQuery({
    queryKey: filtros
      ? produccionKeys.lotesFiltrados(filtros)
      : produccionKeys.lotes(),
    queryFn: () => fetchLotesProduccion(obtenerClienteNavegador(), filtros),
  })
}

export function useLoteProduccion(id: string) {
  return useQuery({
    queryKey: produccionKeys.lote(id),
    queryFn: () => fetchLoteProduccionPorId(obtenerClienteNavegador(), id),
    enabled: Boolean(id),
  })
}

export function useRegistrosProduccion(filtros?: FiltrosProduccion) {
  return useQuery({
    queryKey: produccionKeys.registros(filtros),
    queryFn: () => fetchRegistrosProduccion(obtenerClienteNavegador(), filtros),
  })
}

// ═══════════════════════════════════════════════════════════════
// Mermas
// ═══════════════════════════════════════════════════════════════

export function useMermas(filtros?: FiltrosMerma) {
  return useQuery({
    queryKey: mermasKeys.lista(filtros),
    queryFn: () => fetchMermas(obtenerClienteNavegador(), filtros),
  })
}

// ═══════════════════════════════════════════════════════════════
// Alertas
// ═══════════════════════════════════════════════════════════════

export function useAlertasActivas() {
  return useQuery({
    queryKey: alertasKeys.activas(),
    queryFn: () => fetchAlertasActivas(obtenerClienteNavegador()),
  })
}

// ═══════════════════════════════════════════════════════════════
// Compras
// ═══════════════════════════════════════════════════════════════

export function useCompras(filtros?: FiltrosCompra) {
  return useQuery({
    queryKey: comprasKeys.lista(filtros),
    queryFn: () => fetchCompras(obtenerClienteNavegador(), filtros),
  })
}

export function useCompra(id: string) {
  return useQuery({
    queryKey: comprasKeys.compra(id),
    queryFn: () => fetchCompraPorId(obtenerClienteNavegador(), id),
    enabled: Boolean(id),
  })
}

// ═══════════════════════════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════════════════════════

export function useRestaurante() {
  return useQuery({
    queryKey: configuracionKeys.restaurante(),
    queryFn: () => fetchRestaurante(obtenerClienteNavegador()),
  })
}

export function useUsuarios() {
  return useQuery({
    queryKey: configuracionKeys.usuarios(),
    queryFn: () => fetchUsuarios(obtenerClienteNavegador()),
  })
}

export function useUsuario(id: string) {
  return useQuery({
    queryKey: configuracionKeys.usuario(id),
    queryFn: () => fetchUsuarioPorId(obtenerClienteNavegador(), id),
    enabled: Boolean(id),
  })
}
