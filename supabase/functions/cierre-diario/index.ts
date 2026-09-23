import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function recomendacionClaude(contexto: unknown) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return []
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6', max_tokens: 700,
      system: 'Eres el jefe de operaciones de ChefOS. Devuelve únicamente un JSON array de máximo 5 recomendaciones concretas en español. Cada elemento debe tener titulo, detalle y prioridad (alta, media o baja).',
      messages: [{ role: 'user', content: `Genera el cierre operativo a partir de estos datos: ${JSON.stringify(contexto)}` }],
    }),
  })
  if (!response.ok) return []
  const data = await response.json() as { content?: Array<{ text?: string }> }
  try {
    const text = data.content?.map((item) => item.text ?? '').join('\n').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() ?? '[]'
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.slice(0, 5) : []
  } catch { return [] }
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('CHEFOS_CRON_SECRET')
  if (!cronSecret || request.headers.get('x-chefos-cron-secret') !== cronSecret) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405 })
  const body = await request.json().catch(() => ({}))
  const fecha = body.fecha ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: restaurantes, error: errorRestaurantes } = await supabase.from('restaurantes').select('id').eq('activo', true)
  if (errorRestaurantes) return Response.json({ error: 'No se pudieron consultar los restaurantes' }, { status: 500 })
  if (body.verificar === true) {
    const r = restaurantes?.[0]
    const { error } = r ? await supabase.rpc('total_ventas_periodo', { p_restaurante: r.id, p_desde: fecha, p_hasta: fecha }) : { error: null }
    return Response.json({ ok: !error, version: '1.3.0', modo: 'verificacion_sin_escrituras', restaurantes: restaurantes?.length ?? 0 }, { status: error ? 500 : 200 })
  }
  const siguiente = new Date(`${fecha}T00:00:00.000Z`); siguiente.setUTCDate(siguiente.getUTCDate() + 1)
  for (const restaurante of restaurantes ?? []) {
    const [{ data: ventas }, { data: mermas }, { data: produccion }] = await Promise.all([
      supabase.rpc('total_ventas_periodo', { p_restaurante: restaurante.id, p_desde: fecha, p_hasta: fecha }),
      supabase.from('mermas').select('costo_merma').eq('restaurante_id', restaurante.id).gte('creado_en', `${fecha}T00:00:00.000Z`).lt('creado_en', siguiente.toISOString()),
      supabase.from('produccion_registros').select('cantidad_producida,costo_real').eq('restaurante_id', restaurante.id).eq('fecha_produccion', fecha),
    ])
    const contexto = { ventas: ventas ?? [], mermas: mermas ?? [], produccion: produccion ?? [] }
    const recomendaciones = await recomendacionClaude(contexto)
    if (ventas === null) return Response.json({ error: 'No se pudieron verificar las ventas' }, { status: 500 })
    const { error } = await supabase.from('cierres_diarios').upsert({ restaurante_id: restaurante.id, fecha, total_ventas: Number(ventas), total_mermas: (mermas ?? []).reduce((s, x) => s + Number(x.costo_merma ?? 0), 0), costo_mermas: (mermas ?? []).reduce((s, x) => s + Number(x.costo_merma ?? 0), 0), items_producidos: (produccion ?? []).reduce((s, x) => s + Number(x.cantidad_producida ?? 0), 0), costo_produccion: (produccion ?? []).reduce((s, x) => s + Number(x.costo_real ?? 0), 0), recomendaciones }, { onConflict: 'restaurante_id,fecha' })
    if (error) return Response.json({ error: 'No se pudo guardar el cierre' }, { status: 500 })
  }
  return Response.json({ ok: true, fecha })
})
