/**
 * src/lib/produccionUI.ts
 *
 * Constantes de presentación para el módulo de producción.
 *
 * Responsabilidad: etiquetas legibles por humanos y clases Tailwind
 * asociadas a los valores del dominio de producción.
 *
 * Separado de src/lib/produccion.ts para mantener el dominio puro
 * libre de strings de presentación y clases CSS.
 *
 * Los Record están tipados con los tipos reales del dominio (TurnoServicio,
 * EstadoLote) para garantizar cobertura exhaustiva: si el dominio añade
 * un nuevo valor, TypeScript exige que se añada su etiqueta aquí.
 */

import type { ProduccionLote, TurnoServicio } from '@/types/index'

// EstadoLote derivado directamente del dominio — no exportado.
// Uso local para tipado exhaustivo de los Record.
type EstadoLote = ProduccionLote['estado']

// ─────────────────────────────────────────────────────────────
// Etiquetas y estilos de turno
// ─────────────────────────────────────────────────────────────

export const ETIQUETAS_TURNO: Record<TurnoServicio, string> = {
  mañana: 'Mañana',
  tarde:  'Tarde',
  noche:  'Noche',
}

// ─────────────────────────────────────────────────────────────
// Etiquetas y estilos de estado de lote
// ─────────────────────────────────────────────────────────────

export const ETIQUETAS_ESTADO: Record<EstadoLote, string> = {
  en_progreso: 'En progreso',
  completado:  'Completado',
  cancelado:   'Cancelado',
}

export const CLASES_ESTADO: Record<EstadoLote, string> = {
  en_progreso: 'bg-advertencia-suave text-advertencia-texto',
  completado:  'bg-exito-suave text-exito-texto',
  cancelado:   'bg-fondo-hover text-texto-apagado',
}
