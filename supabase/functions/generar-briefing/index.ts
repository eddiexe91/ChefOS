import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calcularBriefingOperativo, type ProductoBriefing, type RecetaCarta, type RecetaProduccion } from '../_shared/briefingOperativo.ts'
import { observacionesVentas, type ContextoVentas } from '../_shared/contextoVentas.ts'

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('CHEFOS_CRON_SECRET')
  if (!cronSecret || request.headers.get('x-chefos-cron-secret') !== cronSecret) return Response.json({ error: 'No autorizado' }, { status: 401 })
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405 })
  const body = await request.json().catch(() => ({}))
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const fecha = body.fecha ?? new Date().toISOString().slice(0,10)
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0,10) !== fecha) return Response.json({ error:'Fecha inválida' },{status:400})
  const { data: restaurantes, error: errorRestaurantes } = await supabase.from('restaurantes').select('id,zona_horaria').eq('activo',true)
  if(errorRestaurantes)return Response.json({error:'No se pudieron consultar los restaurantes'},{status:500})
  if(body.verificar===true) {
    const r=restaurantes?.[0]
    const {error}=r?await supabase.rpc('contexto_ventas_briefing',{p_restaurante:r.id,p_fecha:fecha}):{error:null}
    return Response.json({ok:!error,version:'1.3.3',modo:'verificacion_sin_escrituras',restaurantes:restaurantes?.length??0},{status:error?500:200})
  }
  for(const restaurante of restaurantes??[]) {
    const zona=restaurante.zona_horaria??'America/Santiago'
    const fechaLocal=body.fecha??new Intl.DateTimeFormat('en-CA',{timeZone:zona}).format(new Date())
    const resultados=await Promise.all([
      supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos,stock_actual,stock_minimo,unidad_display,unidad_medida,activo,tipo_operativo').eq('restaurante_id',restaurante.id).eq('activo',true).limit(1000),
      supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id',restaurante.id).eq('leida',false).limit(20),
      supabase.from('recetas').select('id,nombre,rendimiento_porciones,unidad_rendimiento,es_produccion,producto_salida_id,ingredientes:recetas_ingredientes(cantidad,cantidad_gramos,unidad_medida,producto:productos(id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,unidad_medida,activo,tipo_operativo))').eq('restaurante_id',restaurante.id).eq('activa',true).eq('en_carta',true).limit(150),
      supabase.from('recetas').select('id,nombre,producto_salida_id,cantidad_salida_gramos,producto_salida:productos!recetas_producto_salida_id_fkey(id,nombre,unidad_display,unidad_medida)').eq('restaurante_id',restaurante.id).eq('activa',true).eq('es_produccion',true).limit(150),
      supabase.from('produccion_registros').select('receta_id').eq('anulado',false).eq('restaurante_id',restaurante.id).eq('fecha_produccion',fechaLocal),
    ])
    const [{data:stock},{data:alertas},{data:carta},{data:produccion},{data:registros}]=resultados
    const incompletas=resultados.some(r=>r.error)||stock?.length===1000||carta?.length===150||produccion?.length===150
    const operativo=calcularBriefingOperativo({stock:(stock??[]) as ProductoBriefing[],carta:(carta??[]) as RecetaCarta[],produccion:(produccion??[]) as RecetaProduccion[],registros:registros??[],alertas:alertas??[],fuentesIncompletas:incompletas})
    const {data:ventas,error:errorVentas}=await supabase.rpc('contexto_ventas_briefing',{p_restaurante:restaurante.id,p_fecha:fechaLocal}).abortSignal(AbortSignal.timeout(3500))
    const hora=Number(new Intl.DateTimeFormat('en',{timeZone:zona,hour:'numeric',hourCycle:'h23'}).format(new Date()))
    const {error}=await supabase.from('briefings').upsert({
      restaurante_id:restaurante.id,fecha:fechaLocal,turno:hora<14?'mañana':hora<19?'tarde':'noche',confianza_estimacion:null,
      ...operativo,alertas:alertas??[],contexto_usado:{
        generado_por:'cron/reglas-compartidas',verificado_en:new Date().toISOString(),fuentes_incompletas:incompletas,
        productos_activos:stock?.length??0,platos_en_carta:carta?.length??0,recetas_de_produccion:produccion?.length??0,
        sin_anthropic:true,ventas:errorVentas?null:ventas,
        observaciones_ventas:errorVentas||!ventas?['No se pudo verificar el historial de ventas. Las sugerencias actuales solo consideran datos operativos disponibles.']:observacionesVentas(ventas as ContextoVentas),
      },
    },{onConflict:'restaurante_id,fecha,turno'})
    if(error)return Response.json({error:'No se pudo guardar el briefing'},{status:500})
  }
  return Response.json({ok:true,version:'1.3.3',fecha,restaurantes:restaurantes?.length??0})
})
