import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })
  const fecha = new Date().toISOString().slice(0, 10)
  const [{ data: stock }, { data: alertas }, { data: produccion }] = await Promise.all([
    supabase.from('productos').select('nombre,cantidad_gramos,stock_minimo_gramos').eq('restaurante_id', perfil.restaurante_id).eq('activo', true).limit(100),
    supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', perfil.restaurante_id).eq('leida', false).limit(20),
    supabase.from('produccion_lotes').select('id,turno,estado').eq('restaurante_id', perfil.restaurante_id).eq('fecha', fecha).eq('estado', 'en_progreso'),
  ])
  const bajos = (stock ?? []).filter((item) => Number(item.cantidad_gramos) <= Number(item.stock_minimo_gramos))
  const briefing = { restaurante_id: perfil.restaurante_id, fecha, turno: new Date().getHours() < 14 ? 'mañana' : new Date().getHours() < 19 ? 'tarde' : 'noche', confianza_estimacion: 'media', produccion_sugerida: (produccion ?? []).map((item) => ({ nombre: `Lote ${item.turno}`, cantidad: 1, unidad: 'lote', prioridad: 'media', razon: 'lote abierto del turno' })), compras_sugeridas: bajos.map((item) => ({ producto: item.nombre, cantidad_sugerida: item.stock_minimo_gramos, unidad: 'g', urgencia: 'alta', razon: 'stock bajo' })), riesgos: (alertas ?? []).map((item) => ({ tipo: item.tipo, descripcion: item.mensaje, severidad: item.severidad, accion_sugerida: 'Revisar antes del servicio' })), alertas: alertas ?? [], actividad_reciente: [], contexto_usado: { generado_por: 'api/ia/briefing', stock_bajo: bajos.length } }
  const { data, error } = await supabase.from('briefings').upsert(briefing, { onConflict: 'restaurante_id,fecha,turno' }).select().single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar el briefing.' }, { status: 500 })
  return NextResponse.json({ data })
}
