// Compatibilidad de despliegue: mantener la operación previa hasta que se aplique
// 014. Nunca sumar líneas históricas como si fueran totales oficiales de tickets.
import type { SupabaseClient } from '@supabase/supabase-js'

export async function totalVentasPeriodo(db: SupabaseClient, restaurante: string, desde: string, hasta: string) {
  const resultado = await db.rpc('total_ventas_periodo', { p_restaurante: restaurante, p_desde: desde, p_hasta: hasta })
  if (!resultado.error || !['PGRST202', '42883'].includes(resultado.error.code)) return resultado
  const esquema = await db.from('ventas_tickets').select('id').limit(0)
  // Si ya existe historia, exigir su RPC oficial. No ocultar un despliegue parcial.
  if (!esquema.error || !['PGRST205', '42P01'].includes(esquema.error.code)) return resultado
  let total = 0
  for (let inicio = 0; ; inicio += 1000) {
    const lote = await db.from('ventas_items').select('id,total').eq('restaurante_id', restaurante).gte('fecha_venta', desde).lte('fecha_venta', hasta).order('id').range(inicio, inicio + 999)
    if (lote.error) return { data: null, error: lote.error }
    total += (lote.data ?? []).reduce((s, v) => s + Number(v.total ?? 0), 0)
    if ((lote.data ?? []).length < 1000) return { data: total, error: null }
  }
}
