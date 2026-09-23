import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Suggestion = { producto?: string; nombre?: string; cantidad?: number; cantidad_sugerida?: number; unidad?: string; urgencia?: string; prioridad?: string; razon?: string }
type CartaProducto = { id: string; nombre: string; cantidad_gramos: number | null; unidad_display: string | null; activo: boolean }
type CartaIngrediente = { cantidad_gramos: number | null; producto: CartaProducto | CartaProducto[] | null }
type CartaReceta = { id: string; nombre: string; rendimiento_porciones: number | null; es_produccion: boolean; ingredientes: CartaIngrediente[] | null }

function productoDeIngrediente(ingrediente: CartaIngrediente): CartaProducto | null {
  return Array.isArray(ingrediente.producto) ? ingrediente.producto[0] ?? null : ingrediente.producto
}

function jsonFromClaude(text: string): { produccion_sugerida: Suggestion[]; compras_sugeridas: Suggestion[]; riesgos: Suggestion[] } | null {
  try {
    const limpio = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const valor = JSON.parse(limpio) as Record<string, unknown>
    return {
      produccion_sugerida: Array.isArray(valor.produccion_sugerida) ? valor.produccion_sugerida as Suggestion[] : [],
      compras_sugeridas: Array.isArray(valor.compras_sugeridas) ? valor.compras_sugeridas as Suggestion[] : [],
      riesgos: Array.isArray(valor.riesgos) ? valor.riesgos as Suggestion[] : [],
    }
  } catch { return null }
}

async function consultarClaude(contexto: unknown) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return null
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: 'Eres Chef IA, jefe de operaciones gastronómicas en Chile. Responde únicamente JSON válido con las claves produccion_sugerida, compras_sugeridas y riesgos. Cada sugerencia debe ser concreta y accionable. No inventes datos que no estén en el contexto.',
      messages: [{ role: 'user', content: `Analiza este contexto operativo y prepara el briefing del turno:\n${JSON.stringify(contexto)}` }],
    }),
  })
  if (!response.ok) return null
  const data = await response.json() as { content?: Array<{ text?: string }> }
  return jsonFromClaude(data.content?.map((item) => item.text ?? '').join('\n') ?? '')
}

Deno.serve(async (request) => {
  // Solo el programador privado puede ejecutar operaciones sobre todos los locales.
  const cronSecret = Deno.env.get('CHEFOS_CRON_SECRET')
  if (!cronSecret || request.headers.get('x-chefos-cron-secret') !== cronSecret) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405 })
  const body = await request.json().catch(() => ({}))
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const fecha = body.fecha ?? new Date().toISOString().slice(0, 10)
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  const { data: restaurantes, error: errorRestaurantes } = await supabase.from('restaurantes').select('id').eq('activo', true)
  if (errorRestaurantes) return Response.json({ error: 'No se pudieron consultar los restaurantes' }, { status: 500 })
  if (body.verificar === true) {
    const r = restaurantes?.[0]
    const { error } = r ? await supabase.rpc('contexto_ventas_briefing', { p_restaurante: r.id, p_fecha: fecha }) : { error: null }
    return Response.json({ ok: !error, version: '1.3.0', modo: 'verificacion_sin_escrituras', restaurantes: restaurantes?.length ?? 0 }, { status: error ? 500 : 200 })
  }
  for (const restaurante of restaurantes ?? []) {
    const [{ data: stock }, { data: alertas }, { data: ventas }, { data: produccion }, { data: carta }] = await Promise.all([
      supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,activo').eq('restaurante_id', restaurante.id).eq('activo', true).limit(100),
      supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', restaurante.id).eq('leida', false).limit(20),
      supabase.rpc('contexto_ventas_briefing', { p_restaurante: restaurante.id, p_fecha: fecha }),
      supabase.from('produccion_registros').select('cantidad_producida,unidad,fecha_produccion').eq('restaurante_id', restaurante.id).gte('fecha_produccion', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).limit(300),
      supabase.from('recetas').select('id,nombre,rendimiento_porciones,es_produccion,ingredientes:recetas_ingredientes(cantidad_gramos,producto:productos(id,nombre,cantidad_gramos,unidad_display,activo))').eq('restaurante_id', restaurante.id).eq('activa', true).eq('en_carta', true).limit(100),
    ])
    const comprasPorProducto = new Map<string, Suggestion>()
    for (const item of stock ?? []) {
      if (Number(item.cantidad_gramos) <= Number(item.stock_minimo_gramos)) {
        comprasPorProducto.set(item.id, { producto: item.nombre, cantidad_sugerida: item.stock_minimo_gramos, unidad: item.unidad_display ?? 'g', urgencia: 'alta', razon: 'stock bajo' })
      }
    }
    const recetasProduccion = ((carta ?? []) as CartaReceta[]).filter((receta) => receta.es_produccion)
    const produccionCarta = recetasProduccion.map((receta) => {
      const ingredientes = (receta.ingredientes ?? []).filter((item) => productoDeIngrediente(item)?.activo !== false && productoDeIngrediente(item))
      const faltantes = ingredientes.filter((item) => Number(productoDeIngrediente(item)?.cantidad_gramos ?? 0) < Number(item.cantidad_gramos ?? 0) / Math.max(Number(receta.rendimiento_porciones ?? 1), 1))
      const faltantesTexto = faltantes.map((item) => productoDeIngrediente(item)?.nombre).filter(Boolean).join(', ')
      const disponiblesTexto = ingredientes.filter((item) => !faltantes.includes(item)).map((item) => productoDeIngrediente(item)?.nombre).filter(Boolean).join(', ')
      for (const item of faltantes) {
        const producto = productoDeIngrediente(item)!
        const requerido = Number(item.cantidad_gramos ?? 0) / Math.max(Number(receta.rendimiento_porciones ?? 1), 1)
        comprasPorProducto.set(producto.id, { producto: producto.nombre, cantidad_sugerida: Math.max(Number(comprasPorProducto.get(producto.id)?.cantidad_sugerida ?? 0), Math.max(requerido - Number(producto.cantidad_gramos ?? 0), 0)), unidad: producto.unidad_display ?? 'g', urgencia: 'critica', razon: `Falta para preparar ${receta.nombre}` })
      }
      return { nombre: `Preparar ${receta.nombre}`, cantidad: 1, unidad: 'plato', prioridad: faltantes.length > 0 ? 'alta' : 'media', razon: faltantes.length > 0 ? `Revisar ${faltantesTexto}` : `Tienes ${disponiblesTexto || 'los ingredientes'} suficientes para este plato` }
    })
    const compras = Array.from(comprasPorProducto.values())
    const riesgos = (alertas ?? []).map((item) => ({ tipo: item.tipo, descripcion: item.mensaje, severidad: item.severidad, accion_sugerida: 'Revisar antes del servicio' }))
    const contexto = { stock_bajo: compras, platos_en_carta: (carta ?? []).length, recetas_de_produccion: recetasProduccion.length, analisis_carta: produccionCarta, alertas: riesgos, ventas: ventas ?? null, produccion_7_dias: produccion ?? [] }
    const ia = await consultarClaude(contexto)
    const { error } = await supabase.from('briefings').upsert({ restaurante_id: restaurante.id, fecha, turno: 'mañana', confianza_estimacion: null, produccion_sugerida: ia?.produccion_sugerida ?? produccionCarta, compras_sugeridas: ia?.compras_sugeridas ?? compras, riesgos: ia?.riesgos ?? riesgos, alertas: alertas ?? [], contexto_usado: { generado_por: ia ? 'claude' : 'reglas', ...contexto } }, { onConflict: 'restaurante_id,fecha,turno' })
    if (error) return Response.json({ error: 'No se pudo guardar el briefing' }, { status: 500 })
  }
  return Response.json({ ok: true, fecha, restaurantes: restaurantes?.length ?? 0 })
})
