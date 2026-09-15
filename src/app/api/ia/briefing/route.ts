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

function productoSalidaDeReceta(receta: RecetaProduccion): Pick<ProductoBriefing, 'id' | 'nombre' | 'unidad_display' | 'unidad_medida'> | null {
  return Array.isArray(receta.producto_salida) ? receta.producto_salida[0] ?? null : receta.producto_salida
}

export async function POST() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })

  const fecha = new Date().toISOString().slice(0, 10)
  const [{ data: stock }, { data: alertas }, { data: lotes }, { data: carta }, { data: produccion }] = await Promise.all([
    supabase.from('productos').select('id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,unidad_medida,activo,tipo_operativo').eq('restaurante_id', perfil.restaurante_id).eq('activo', true).limit(300),
    supabase.from('alertas_sistema').select('tipo,severidad,mensaje').eq('restaurante_id', perfil.restaurante_id).eq('leida', false).limit(20),
    supabase.from('produccion_lotes').select('id,turno,estado').eq('restaurante_id', perfil.restaurante_id).eq('fecha', fecha).eq('estado', 'en_progreso'),
    supabase.from('recetas').select('id,nombre,rendimiento_porciones,unidad_rendimiento,es_produccion,producto_salida_id,ingredientes:recetas_ingredientes(cantidad,cantidad_gramos,unidad_medida,producto:productos(id,nombre,cantidad_gramos,stock_minimo_gramos,unidad_display,unidad_medida,activo,tipo_operativo))').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('en_carta', true).limit(150),
    supabase.from('recetas').select('id,nombre,producto_salida_id,producto_salida:productos(id,nombre,unidad_display,unidad_medida)').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).eq('es_produccion', true).limit(150),
  ])

  const productos = (stock ?? []) as ProductoBriefing[]
  const recetasCarta = (carta ?? []) as RecetaCarta[]
  const recetasProduccion = (produccion ?? []) as RecetaProduccion[]

  const compras = new Map<string, { producto: string; cantidad_sugerida: number; unidad: string; urgencia: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const producciones = new Map<string, { nombre: string; cantidad: number; unidad: string; prioridad: 'critica' | 'alta' | 'media' | 'baja'; razon: string }>()
  const riesgos = new Map<string, { tipo: string; descripcion: string; severidad: 'critica' | 'alta' | 'media' | 'baja'; accion_sugerida: string }>()
  const produccionPorSalida = new Map<string, RecetaProduccion>()

  for (const receta of recetasProduccion) {
    if (receta.producto_salida_id) produccionPorSalida.set(receta.producto_salida_id, receta)
  }

  for (const producto of productos) {
    const stockActual = Number(producto.cantidad_gramos ?? 0)
    const minimo = Number(producto.stock_minimo_gramos ?? 0)
    if (stockActual > minimo) continue
    if (producto.tipo_operativo === 'elaborado') {
      const recetaSalida = produccionPorSalida.get(producto.id)
      if (recetaSalida) {
        producciones.set(recetaSalida.id, {
          nombre: `Preparar ${recetaSalida.nombre}`,
          cantidad: 1,
          unidad: productoSalidaDeReceta(recetaSalida)?.unidad_display ?? productoSalidaDeReceta(recetaSalida)?.unidad_medida ?? 'lote',
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
            unidad: productoSalidaDeReceta(recetaSalida)?.unidad_display ?? productoSalidaDeReceta(recetaSalida)?.unidad_medida ?? 'lote',
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
          unidad: faltante.producto.unidad_display ?? faltante.producto.unidad_medida ?? 'g',
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
    turno: new Date().getHours() < 14 ? 'mañana' : new Date().getHours() < 19 ? 'tarde' : 'noche',
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
  if (error) return NextResponse.json({ error: 'No se pudo guardar el briefing.' }, { status: 500 })
  return NextResponse.json({ data })
}
