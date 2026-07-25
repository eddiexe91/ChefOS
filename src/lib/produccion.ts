/**
 * src/lib/produccion.ts
 *
 * Utilidades de dominio puro para el módulo de producción.
 *
 * Responsabilidad: funciones puras y tipos derivados del dominio.
 * Sin strings de presentación, sin clases Tailwind, sin lógica de UI.
 * Testeable en aislamiento.
 */

import type { ProduccionRegistro } from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────

export interface RegistroPreparado {
  id:          string
  nombre:      string
  cantidad:    number
  unidad:      string
  costo:       number | undefined
  porciones:   number | null
  responsable: string | null
}

// ─────────────────────────────────────────────────────────────
// parsearFechaLocal
// ─────────────────────────────────────────────────────────────

/**
 * Convierte una cadena DATE de Supabase ('YYYY-MM-DD') en un objeto Date
 * interpretado en la zona horaria local del cliente.
 *
 * MOTIVO: las columnas DATE de Supabase se devuelven como strings 'YYYY-MM-DD'.
 * Si se pasan directamente a `new Date('YYYY-MM-DD')`, el motor JS las interpreta
 * como medianoche UTC, lo que en zonas horarias negativas (ej: UTC-3, UTC-5)
 * provoca que la fecha aparezca como el día anterior.
 *
 * Concatenar 'T00:00:00' (sin sufijo Z) fuerza la interpretación en
 * hora local, eliminando el desfase.
 *
 * @param fecha - String en formato 'YYYY-MM-DD' proveniente de Supabase.
 * @returns Date interpretado a medianoche en la zona horaria local.
 */
export function parsearFechaLocal(fecha: string): Date {
  return new Date(fecha + 'T00:00:00')
}

// ─────────────────────────────────────────────────────────────
// prepararRegistros
// ─────────────────────────────────────────────────────────────

/**
 * Transforma ProduccionRegistro[] en datos derivados listos para la UI.
 *
 * Responsabilidades:
 * - Seleccionar el nombre correcto (receta > producto > fallback)
 * - Seleccionar el costo correcto (costo_real > costo_produccion)
 * - Normalizar campos opcionales a null cuando no existen
 *
 * NO genera strings de presentación.
 * La pluralización y el formato visual son responsabilidad del componente.
 */
export function prepararRegistros(
  registros: ProduccionRegistro[]
): RegistroPreparado[] {
  return registros.map((registro) => ({
    id:          registro.id,
    nombre:      registro.receta?.nombre ?? registro.producto?.nombre ?? 'Sin nombre',
    cantidad:    registro.cantidad_producida,
    unidad:      registro.unidad,
    costo:       registro.costo_real ?? registro.costo_produccion,
    porciones:   registro.porciones_reales ?? null,
    responsable: registro.responsable?.nombre ?? null,
  }))
}
