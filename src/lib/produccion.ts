/**
 * src/lib/produccion.ts
 *
 * Utilidades de dominio para el módulo de producción.
 *
 * Funciones puras — sin dependencias de React ni de Supabase.
 * Testeables en aislamiento.
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
