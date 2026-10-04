import { NextResponse } from 'next/server'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { observacionesVentas, type ContextoVentas } from '@/lib/ventas/contextoBriefing'
import { calcularBriefingOperativo, type ProductoBriefing, type RecetaCarta, type RecetaProduccion } from '../../../../../supabase/functions/_shared/briefingOperativo'
export const maxDuration = 30

export async function POST() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })

  const { data: restaurante } = await supabase.from('restaurantes').select('zona_horaria,onboarding_completado').eq('id', perfil.restaurante_id).single()
  const zona = restaurante?.zona_horaria ?? 'America/Santiago'
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(new Date())
  const resultados = await Promise.all([
    supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos,stock_actual,stock_minimo,unidad_display,unidad_medida,activo,tipo_operativo').eq('restaurante_id', perfil.restaurante_id).eq('activo', true).limit(1000),
    supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', perfil.restaurante_id).eq('leida', false).limit(20),
    supabase.from('recetas').select('id,nombre,rendimiento_porciones,unidad_rendimiento,es_produccion,producto_salida_id,ingredientes:recetas_ingredientes(cantidad,cantidad_gramos,unidad_medida,producto:productos(id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,unidad_medida,activo,tipo_operativo))').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('en_carta', true).limit(150),
    supabase.from('recetas').select('id,nombre,producto_salida_id,cantidad_salida_gramos,producto_salida:productos!recetas_producto_salida_id_fkey(id,nombre,unidad_display,unidad_medida)').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('es_produccion', true).limit(150),
    supabase.from('produccion_registros').select('receta_id').eq('anulado', false).eq('restaurante_id', perfil.restaurante_id).eq('fecha_produccion', fecha),
  ])
  const [{ data: stock }, { data: alertas }, { data: carta }, { data: produccion }, { data: registros }] = resultados
  const fuentesIncompletas = resultados.some((r) => r.error) || stock?.length === 1000 || carta?.length === 150 || produccion?.length === 150
  for (const resultado of resultados) if (resultado.error) console.error('[briefing] fuente:', resultado.error.code, resultado.error.message)

  const productos = (stock ?? []) as ProductoBriefing[]
  const recetasCarta = (carta ?? []) as RecetaCarta[]
  const recetasProduccion = (produccion ?? []) as RecetaProduccion[]
  const operativo = calcularBriefingOperativo({ stock: productos, carta: recetasCarta, produccion: recetasProduccion, registros: registros ?? [], alertas: alertas ?? [], fuentesIncompletas })

  // An unavailable sales context must not block today's stock/production decisions.
  const { data: contextoVentas, error: errorVentas } = await supabase.rpc('contexto_ventas_briefing', { p_restaurante: perfil.restaurante_id, p_fecha: fecha })
    .abortSignal(AbortSignal.timeout(3500))
  const observaciones = errorVentas || !contextoVentas ? ['No se pudo verificar el historial de ventas. Las sugerencias actuales solo consideran datos operativos disponibles.'] : observacionesVentas(contextoVentas as ContextoVentas)
  const briefing = {
    restaurante_id: perfil.restaurante_id,
    fecha,
    turno: Number(new Intl.DateTimeFormat('en', { timeZone: zona, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) < 14 ? 'mañana' : Number(new Intl.DateTimeFormat('en', { timeZone: zona, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) < 19 ? 'tarde' : 'noche',
    confianza_estimacion: null, // Sin calibración, no inventar un nivel de precisión.
    produccion_sugerida: operativo.produccion_sugerida,
    compras_sugeridas: operativo.compras_sugeridas,
    riesgos: operativo.riesgos,
    alertas: alertas ?? [],
    actividad_reciente: [],
    contexto_usado: {
      generado_por: 'api/ia/briefing',
      verificado_en: new Date().toISOString(),
      fuentes_incompletas: fuentesIncompletas,
      productos_activos: productos.length,
      platos_en_carta: recetasCarta.length,
      recetas_de_produccion: recetasProduccion.length,
      inventario_activo: productos.filter((producto) => producto.tipo_operativo !== 'elaborado').length,
      stock_disponible_activo: productos.filter((producto) => producto.tipo_operativo === 'elaborado').length,
      analisis_carta: true,
      sin_anthropic: true,
      ventas: errorVentas ? null : contextoVentas,
      observaciones_ventas: observaciones,
    },
  }

  const { data, error } = await supabase.from('briefings').upsert(briefing, { onConflict: 'restaurante_id,fecha,turno' }).select().single()
  // El análisis es útil incluso cuando el rol solo permite leer el historial.
  if (error) console.error('[briefing] historial:', error.code, error.message)
  return NextResponse.json({ data: data ?? { ...briefing, id: 'actual', comensales_esperados: null }, guardado: !error }, { headers: { 'Cache-Control': 'no-store' } })
}
