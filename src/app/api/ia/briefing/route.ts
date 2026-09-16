import { NextResponse } from 'next/server'

import { crearClienteServidor } from '@/lib/supabase/servidor'

type ProductoBriefing = {
  id: string
  nombre: string
  cantidad_gramos: number | null
  stock_minimo_gramos: number | null
  unidad_display: string | null
  unidad_medida: string
  activo: boolean
  tipo_operativo: 'materia_prima' | 'insumo' | 'elaborado'
  stock_actual: number
  stock_minimo: number
}

type IngredienteCarta = {
  cantidad: number | null
  cantidad_gramos: number | null
  unidad_medida: string
  producto: ProductoBriefing | ProductoBriefing[] | null
}

type RecetaCarta = {
  id: string
  nombre: string
  rendimiento_porciones: number | null
  unidad_rendimiento: string | null
  es_produccion: boolean
  producto_salida_id: string | null
  ingredientes: IngredienteCarta[] | null
}

type RecetaProduccion = {
  id: string
  nombre: string
  producto_salida_id: string | null
  producto_salida: Pick<ProductoBriefing, 'id' | 'nombre' | 'unidad_display' | 'unidad_medida'> | Pick<ProductoBriefing, 'id' | 'nombre' | 'unidad_display' | 'unidad_medida'>[] | null
}

function productoDeIngrediente(ingrediente: IngredienteCarta): ProductoBriefing | null {
  return Array.isArray(ingrediente.producto) ? ingrediente.producto[0] ?? null : ingrediente.producto
}

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
    supabase.from('produccion_lotes').select('id,turno,estado').eq('restaurante_id', perfil.restaurante_id).eq('fecha', fecha).eq('estado', 'en_progreso'),
    supabase.from('recetas').select('id,nombre,rendimiento_porciones,unidad_rendimiento,es_produccion,producto_salida_id,ingredientes:recetas_ingredientes(cantidad,cantidad_gramos,unidad_medida,producto:productos(id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,unidad_medida,activo,tipo_operativo))').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('en_carta', true).limit(150),
    supabase.from('recetas').select('id,nombre,producto_salida_id,producto_salida:productos!recetas_producto_salida_id_fkey(id,nombre,unidad_display,unidad_medida)').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('es_produccion', true).limit(150),
    supabase.from('produccion_registros').select('receta_id').eq('restaurante_id', perfil.restaurante_id).eq('fecha_produccion', fecha),
  ])
  const [{ data: stock }, { data: alertas }, { data: lotes }, { data: carta }, { data: produccion }, { data: registros }] = resultados
  const fuentesIncompletas = resultados.some((r) => r.error)
  for (const resultado of resultados) if (resultado.error) console.error('[briefing] fuente:', resultado.error.code, resultado.error.message)

  const productos = (stock ?? []) as ProductoBriefing[]
  const recetasCarta = (carta ?? []) as RecetaCarta[]
  const recetasProduccion = (produccion ?? []) as RecetaProduccion[]

  const compras = new Map<string, { producto: string; cantidad_sugerida: number; unidad: string; urgencia: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const producciones = new Map<string, { nombre: string; cantidad: number; unidad: string; prioridad: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const riesgos = new Map<string, { tipo: string; descripcion: string; severidad: 'critica' | 'alta' | 'media' | 'baja'; accion_sugerida: string }>()
  const produccionPorSalida = new Map<string, RecetaProduccion>()

  for (const receta of recetasProduccion) {
    if (receta.producto_salida_id) produccionPorSalida.set(receta.producto_salida_id, receta)
    if (!receta.producto_salida_id && !(registros ?? []).some(r => r.receta_id === receta.id)) {
      producciones.set(receta.id, { nombre: `Revisar producción de ${receta.nombre}`, cantidad: 1, unidad: 'lote', prioridad: 'alta', razon: 'Receta de producción sin registro hoy. Confirma la cantidad necesaria para el turno.' })
    }
  }

  for (const producto of productos) {
    const stockActual = Number(producto.stock_actual ?? 0)
    const minimo = Number(producto.stock_minimo ?? 0)
    if (stockActual > minimo) continue
    if (producto.tipo_operativo === 'elaborado') {
      const recetaSalida = produccionPorSalida.get(producto.id)
      if (recetaSalida) {
        producciones.set(recetaSalida.id, {
          nombre: `Preparar ${recetaSalida.nombre}`,
          cantidad: 1,
          unidad: 'lote',
          prioridad: stockActual <= 0 ? 'critica' : 'alta',
          razon: `Stock bajo de ${producto.nombre}.`,
        })
      }
    } else {
      compras.set(producto.id, {
        producto: producto.nombre,
        cantidad_sugerida: Math.max(minimo - stockActual, minimo || 1),
        unidad: producto.unidad_display ?? producto.unidad_medida ?? 'g',
        urgencia: stockActual <= 0 ? 'critica' : 'alta',
        razon: 'Stock bajo en Inventario.',
      })
    }
    if (producto.tipo_operativo === 'elaborado' && !produccionPorSalida.has(producto.id)) riesgos.set(`reponer-${producto.id}`, {
      tipo: 'produccion', descripcion: `Reponer ${producto.nombre} en Stock disponible.`, severidad: 'alta', accion_sugerida: 'Asocia una receta de producción o actualiza las existencias.',
    })
  }

  for (const receta of recetasCarta) {
    const rendimientoBase = Math.max(Number(receta.rendimiento_porciones ?? 1), 1)
    const faltantes = (receta.ingredientes ?? []).flatMap((ingrediente) => {
      const producto = productoDeIngrediente(ingrediente)
      if (!producto || producto.activo === false) return []
      const requerido = Number(ingrediente.cantidad_gramos ?? 0) / rendimientoBase
      const disponible = Number(producto.cantidad_gramos ?? 0)
      if (requerido <= 0 || disponible >= requerido) return []
      return [{ producto, requerido, disponible, faltante: Math.max(requerido - disponible, 0), unidad: ingrediente.unidad_medida }]
    })

    if (faltantes.length === 0) continue

    riesgos.set(`carta-${receta.id}`, {
      tipo: 'carta',
      descripcion: `${receta.nombre} tiene faltantes: ${faltantes.map((item) => item.producto.nombre).join(', ')}.`,
      severidad: faltantes.some((item) => item.disponible <= 0) ? 'critica' : 'alta',
      accion_sugerida: 'Reponer inventario o producir elaborados antes del servicio.',
    })

    for (const faltante of faltantes) {
      if (faltante.producto.tipo_operativo === 'elaborado') {
        const recetaSalida = produccionPorSalida.get(faltante.producto.id)
        if (recetaSalida) {
          producciones.set(recetaSalida.id, {
            nombre: `Preparar ${recetaSalida.nombre}`,
            cantidad: 1,
            unidad: 'lote',
            prioridad: faltante.disponible <= 0 ? 'critica' : 'alta',
            razon: `${receta.nombre} necesita ${faltante.producto.nombre}.`,
          })
        } else {
          riesgos.set(`elaborado-${receta.id}-${faltante.producto.id}`, {
            tipo: 'stock_elaborado',
            descripcion: `${receta.nombre} requiere ${faltante.producto.nombre} y no hay producción asociada para reponerlo.`,
            severidad: 'alta',
            accion_sugerida: 'Crea o ajusta una receta de producción para este elaborado.',
          })
        }
      } else {
        compras.set(faltante.producto.id, {
          producto: faltante.producto.nombre,
          cantidad_sugerida: Math.max(faltante.faltante, Number(faltante.producto.stock_minimo_gramos ?? 0) || 1),
          unidad: 'g',
          urgencia: faltante.disponible <= 0 ? 'critica' : 'alta',
          razon: `${receta.nombre} requiere este ingrediente para salir a carta.`,
        })
      }
    }
  }

  for (const alerta of alertas ?? []) {
    riesgos.set(`alerta-${alerta.tipo}-${alerta.mensaje}`, {
      tipo: alerta.tipo,
      descripcion: alerta.mensaje,
      severidad: alerta.severidad,
      accion_sugerida: 'Revisar antes del servicio.',
    })
  }

  if (fuentesIncompletas) riesgos.set('conexion', { tipo: 'gestion', descripcion: 'No se pudieron verificar todos los datos del turno.', severidad: 'alta', accion_sugerida: 'Revisa la conexión y actualiza el briefing antes del servicio.' })
  if (!productos.some((p) => p.tipo_operativo !== 'elaborado')) riesgos.set('inventario', { tipo: 'configuracion', descripcion: 'Carga primero las materias primas de tu cocina.', severidad: 'alta', accion_sugerida: 'Completa Inventario para calcular compras y producción.' })
  if (!productos.some((p) => p.tipo_operativo === 'elaborado')) riesgos.set('stock', { tipo: 'configuracion', descripcion: 'Registra las preparaciones listas para servir.', severidad: 'media', accion_sugerida: 'Actualiza Stock disponible.' })
  if (!recetasCarta.length) riesgos.set('carta', { tipo: 'configuracion', descripcion: 'Añade los platos que ofrece tu restaurante.', severidad: 'media', accion_sugerida: 'Completa Carta para relacionar platos con existencias.' })

  const loteSugerencias = (lotes ?? []).map((lote) => ({
    nombre: `Lote ${lote.turno}`,
    cantidad: 1,
    unidad: 'lote',
    prioridad: 'media' as const,
    razon: 'Lote abierto del turno actual.',
  }))

  const briefing = {
    restaurante_id: perfil.restaurante_id,
    fecha,
    turno: Number(new Intl.DateTimeFormat('en', { timeZone: zona, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) < 14 ? 'mañana' : Number(new Intl.DateTimeFormat('en', { timeZone: zona, hour: 'numeric', hourCycle: 'h23' }).format(new Date())) < 19 ? 'tarde' : 'noche',
    confianza_estimacion: 'media',
    produccion_sugerida: [...producciones.values(), ...loteSugerencias],
    compras_sugeridas: Array.from(compras.values()),
    riesgos: Array.from(riesgos.values()),
    alertas: alertas ?? [],
    actividad_reciente: [],
    contexto_usado: {
      generado_por: 'api/ia/briefing',
      productos_activos: productos.length,
      platos_en_carta: recetasCarta.length,
      recetas_de_produccion: recetasProduccion.length,
      inventario_activo: productos.filter((producto) => producto.tipo_operativo !== 'elaborado').length,
      stock_disponible_activo: productos.filter((producto) => producto.tipo_operativo === 'elaborado').length,
      analisis_carta: true,
      sin_anthropic: true,
    },
  }

  const { data, error } = await supabase.from('briefings').upsert(briefing, { onConflict: 'restaurante_id,fecha,turno' }).select().single()
  // El análisis es útil incluso cuando el rol solo permite leer el historial.
  if (error) console.error('[briefing] historial:', error.code, error.message)
  return NextResponse.json({ data: data ?? { ...briefing, id: 'actual', comensales_esperados: null }, guardado: !error }, { headers: { 'Cache-Control': 'no-store' } })
}
