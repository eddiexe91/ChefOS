import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

type Especialista = 'tecnico' | 'ejecutivo' | 'instructor'

const SISTEMAS: Record<Especialista, string> = {
  tecnico: 'Eres Chef Técnico: experto en cocina chilena, mariscos, inocuidad y química gastronómica. Responde con pasos concretos.',
  ejecutivo: 'Eres Chef Ejecutivo: priorizas rentabilidad, costos, compras, producción y decisiones operativas basadas en datos.',
  instructor: 'Eres Chef Instructor: enseñas procedimientos claros, corriges con respeto y verificas comprensión del equipo.',
}

function respuestaBasica(especialista: Especialista, mensaje: string, datos: { stock: Array<{ nombre: string; cantidad_gramos: number; stock_minimo_gramos: number }>; alertas: Array<{ severidad: string; mensaje: string }>; ventas: Array<{ total: number }>; mermas: Array<{ costo_merma: number }> }) {
  const bajos = datos.stock.filter((item) => Number(item.cantidad_gramos) <= Number(item.stock_minimo_gramos))
  const consulta = mensaje.toLowerCase()
  const encabezado = especialista === 'tecnico' ? 'Chef Técnico' : especialista === 'instructor' ? 'Chef Instructor' : 'Chef Ejecutivo'
  const lineas = [`${encabezado} · modo básico`, '']
  if (consulta.includes('stock') || consulta.includes('inventario') || consulta.includes('compr')) {
    lineas.push(bajos.length ? `Stock crítico: ${bajos.map((item) => item.nombre).join(', ')}.` : 'No hay productos bajo el mínimo configurado.')
    lineas.push('Acción: verifica existencias físicas y genera la compra antes del próximo servicio.')
  } else if (consulta.includes('merma') || consulta.includes('desperd')) {
    const costo = datos.mermas.reduce((total, item) => total + Number(item.costo_merma ?? 0), 0)
    lineas.push(`Mermas registradas en el contexto: ${datos.mermas.length}, con costo acumulado de $${costo.toLocaleString('es-CL')}.`)
    lineas.push('Acción: clasifica cada merma por causa y revisa primero las de mayor costo.')
  } else if (consulta.includes('venta') || consulta.includes('rentab') || consulta.includes('costo')) {
    const ventas = datos.ventas.reduce((total, item) => total + Number(item.total ?? 0), 0)
    lineas.push(`Ventas disponibles: ${datos.ventas.length} líneas, total $${ventas.toLocaleString('es-CL')}.`)
    lineas.push('Acción: compara los platos vendidos con su costo por porción y prioriza los de mayor margen.')
  } else if (consulta.includes('produc') || consulta.includes('turno')) {
    lineas.push(bajos.length ? `Prioridad del turno: proteger el servicio y reponer ${bajos[0].nombre}.` : 'Prioridad del turno: confirmar mise en place y cantidades previstas.')
    lineas.push('Acción: registra la producción y las mermas para mejorar el siguiente briefing.')
  } else {
    lineas.push(`Tienes ${datos.alertas.length} alerta${datos.alertas.length === 1 ? '' : 's'} pendiente${datos.alertas.length === 1 ? '' : 's'} y ${bajos.length} producto${bajos.length === 1 ? '' : 's'} bajo mínimo.`)
    lineas.push('Puedo ayudarte con stock, compras, ventas, costos, producción o mermas. Escribe una de esas palabras para un análisis específico.')
  }
  return lineas.join('\n')
}

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { especialista?: Especialista; mensaje?: string; conversacionId?: string }
  const especialista = body.especialista ?? 'ejecutivo'
  const mensaje = body.mensaje?.trim()
  if (!mensaje || !SISTEMAS[especialista]) return NextResponse.json({ error: 'Mensaje y especialista son obligatorios' }, { status: 400 })

  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id, nombre').eq('id', user.id).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const { data: conversacion } = body.conversacionId
    ? await supabase.from('conversaciones_ia').select('id, mensajes').eq('id', body.conversacionId).eq('usuario_id', user.id).single()
    : await supabase.from('conversaciones_ia').insert({ restaurante_id: perfil.restaurante_id, usuario_id: user.id, especialista, mensajes: [] }).select('id, mensajes').single()
  const historial = ((conversacion?.mensajes as Array<Record<string, string>> | null) ?? [])
    .filter((item) => item.rol === 'usuario' || item.rol === 'asistente')
    .slice(-10)
    .map((item) => ({ role: item.rol === 'usuario' ? 'user' : 'assistant', content: item.contenido }))

  const contexto = await Promise.all([
    supabase.from('productos').select('nombre, cantidad_gramos, stock_minimo_gramos').eq('restaurante_id', perfil.restaurante_id).eq('activo', true).limit(30),
    supabase.from('alertas_sistema').select('tipo, severidad, mensaje').eq('restaurante_id', perfil.restaurante_id).eq('leida', false).limit(10),
    supabase.from('ventas_items').select('total').eq('restaurante_id', perfil.restaurante_id).gte('fecha_venta', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).limit(500),
    supabase.from('mermas').select('costo_merma').eq('restaurante_id', perfil.restaurante_id).gte('creado_en', new Date(Date.now() - 30 * 86400000).toISOString()).limit(200),
  ])
  const datos = { stock: contexto[0].data ?? [], alertas: contexto[1].data ?? [], ventas: contexto[2].data ?? [], mermas: contexto[3].data ?? [] }
  const contextoTexto = JSON.stringify(datos)
  let respuesta = respuestaBasica(especialista, mensaje, datos)

  if (process.env.ANTHROPIC_API_KEY) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6', max_tokens: 700, system: `${SISTEMAS[especialista]}\nContexto real: ${contextoTexto}`, messages: [...historial, { role: 'user', content: mensaje }] }),
    })
    if (res.ok) {
      const data = await res.json() as { content?: Array<{ text?: string }> }
      respuesta = data.content?.map((item) => item.text ?? '').join('\n').trim() || respuesta
    }
  }

  if (conversacion) {
    const mensajes = [...((conversacion.mensajes as Array<Record<string, string>> | null) ?? []), { rol: 'usuario', contenido: mensaje, creado_en: new Date().toISOString() }, { rol: 'asistente', contenido: respuesta, creado_en: new Date().toISOString() }]
    await supabase.from('conversaciones_ia').update({ mensajes }).eq('id', conversacion.id)
  }
  return NextResponse.json({ respuesta, conversacionId: conversacion?.id ?? null, especialista })
}
