import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  const body = await request.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const especialista = body.especialista ?? 'ejecutivo'
  const prompt = body.mensaje ?? ''
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    const modo = especialista === 'tecnico' ? 'revisar inocuidad, mise en place y procedimiento' : especialista === 'instructor' ? 'explicar el procedimiento paso a paso y comprobar comprensión' : 'priorizar stock, costos y decisiones del turno'
    return Response.json({ respuesta: `Chef IA básico: para ${modo}. Recibí: “${prompt}”. Consulta inventario, ventas, mermas o producción desde la aplicación para obtener una recomendación contextual.`, especialista, modo: 'basico' })
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6', max_tokens: 700, system: `Eres ChefOS ${especialista}. Responde en español y con acciones concretas.`, messages: [{ role: 'user', content: prompt }] }) })
  const data = await response.json()
  if (!response.ok) return Response.json({ error: data }, { status: response.status })
  return Response.json({ respuesta: data.content?.map((item: { text?: string }) => item.text ?? '').join('\n') ?? '', especialista, supabase: Boolean(supabase) })
})
