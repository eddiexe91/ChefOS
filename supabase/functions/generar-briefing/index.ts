import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Suggestion = { producto?: string; nombre?: string; cantidad?: number; unidad?: string; urgencia?: string; prioridad?: string; razon?: string }

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
  const body = await request.json().catch(() => ({}))
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const fecha = body.fecha ?? new Date().toISOString().slice(0, 10)
  const { data: restaurantes } = await supabase.from('restaurantes').select('id').eq('activo', true)
  for (const restaurante of restaurantes ?? []) {
    const [{ data: stock }, { data: alertas }, { data: ventas }, { data: produccion }] = await Promise.all([
      supabase.from('productos').select('nombre,cantidad_gramos,stock_minimo_gramos').eq('restaurante_id', restaurante.id).eq('activo', true).limit(100),
      supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', restaurante.id).eq('leida', false).limit(20),
      supabase.from('ventas_items').select('nombre_original,cantidad_vendida,total').eq('restaurante_id', restaurante.id).gte('fecha_venta', new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)).limit(500),
      supabase.from('produccion_registros').select('cantidad_producida,unidad,fecha_produccion').eq('restaurante_id', restaurante.id).gte('fecha_produccion', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).limit(300),
    ])
    const compras = (stock ?? []).filter((item) => Number(item.cantidad_gramos) <= Number(item.stock_minimo_gramos)).map((item) => ({ producto: item.nombre, cantidad_sugerida: item.stock_minimo_gramos, unidad: 'g', urgencia: 'alta', razon: 'stock bajo' }))
    const riesgos = (alertas ?? []).map((item) => ({ tipo: item.tipo, descripcion: item.mensaje, severidad: item.severidad, accion_sugerida: 'Revisar antes del servicio' }))
    const contexto = { stock_bajo: compras, alertas: riesgos, ventas_28_dias: ventas ?? [], produccion_7_dias: produccion ?? [] }
    const ia = await consultarClaude(contexto)
    await supabase.from('briefings').upsert({ restaurante_id: restaurante.id, fecha, turno: 'mañana', confianza_estimacion: ia ? 'alta' : 'media', produccion_sugerida: ia?.produccion_sugerida ?? [], compras_sugeridas: ia?.compras_sugeridas ?? compras, riesgos: ia?.riesgos ?? riesgos, alertas: alertas ?? [], contexto_usado: { generado_por: ia ? 'claude' : 'reglas', ...contexto } }, { onConflict: 'restaurante_id,fecha,turno' })
  }
  return Response.json({ ok: true, fecha, restaurantes: restaurantes?.length ?? 0 })
})
