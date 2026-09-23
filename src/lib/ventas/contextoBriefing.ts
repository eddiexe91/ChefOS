export interface ContextoVentas {
  version: string; desde: string; hasta: string; fecha_objetivo: string; ultima_venta: string | null
  dias_comparables: number; confianza: string; limitaciones: string[]
  dias_4_semanas?: number; dias_4_semanas_previas?: number
  productos: { pos_id: string; nombre: string; receta_id: string | null; producto_id: string | null; mapeo: string | null; unidades_promedio: number | null; unidades_4_semanas: number; unidades_4_semanas_previas: number }[]
}
export function observacionesVentas(c: ContextoVentas): string[] {
  if (!c.ultima_venta) return ['Falta historial de ventas confirmado para estimar demanda.']
  const dias = (Date.parse(c.fecha_objetivo) - Date.parse(c.ultima_venta)) / 86400000
  if (dias > 7) return [`Actualiza las ventas: el último registro es del ${c.ultima_venta}. No usar ese histórico como previsión actual.`]
  if (c.dias_comparables < 4) return [`Hay ${c.dias_comparables} días comparables con ventas: todavía no hay base suficiente para sugerir cantidades.`]
  return c.productos.filter(p => p.unidades_promedio != null && p.unidades_promedio > 0).slice(0, 3).map(p => {
    let tendencia = ''
    if ((c.dias_4_semanas ?? 0) >= 14 && (c.dias_4_semanas_previas ?? 0) >= 14 && p.unidades_4_semanas_previas > 0) {
      const cambio = ((p.unidades_4_semanas / c.dias_4_semanas!) / (p.unidades_4_semanas_previas / c.dias_4_semanas_previas!) - 1) * 100
      if (Math.abs(cambio) >= 20) tendencia = ` Tendencia observada: el promedio por día registrado ${cambio > 0 ? 'subió' : 'bajó'} ${Math.abs(Math.round(cambio))}% en las últimas cuatro semanas frente a las cuatro anteriores; revisa si cambió la demanda o la cobertura del registro.`
    }
    return `${p.nombre}: promedio observado de ${p.unidades_promedio} unidades para este día de la semana, en ${c.dias_comparables} días con tickets (${c.desde} a ${c.hasta}).${tendencia} ${p.mapeo === 'confirmado' ? 'Contrasta con lo disponible antes de decidir producción.' : 'Confirma su equivalencia con Carta/Recetas antes de planificar.'} No es una cantidad de producción confirmada.`
  })
}
