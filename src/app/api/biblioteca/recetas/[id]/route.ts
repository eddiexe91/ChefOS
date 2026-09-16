import { NextResponse } from 'next/server'

import { esErrorColumnaTipoOperativo, obtenerTipoOperativoProducto } from '@/lib/productos'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type DificultadReceta, type UnidadEntrada } from '@/types'

const ROLES = ['dueño', 'chef_ejecutivo', 'chef_cocina']
const UNIDADES_VALIDAS: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]
const DIFICULTADES_VALIDAS: readonly DificultadReceta[] = ['basica', 'intermedia', 'avanzada']

interface IngredienteBody {
  producto_id: string
  cantidad: number
  unidad_medida: UnidadEntrada
  es_opcional: boolean
  orden: number
  notas: string | null
}

interface PasoBody {
  numero: number
  titulo: string
  descripcion: string
  duracion_min: number | null
  temperatura_c: number | null
  tecnica: string | null
  punto_critico: boolean
  foto_url: string | null
}

interface RecetaBody {
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  rendimiento_porciones: number
  unidad_rendimiento: string
  precio_venta: number | null
  tiempo_preparacion: number | null
  dificultad: DificultadReceta | null
  en_carta: boolean
  es_produccion: boolean
  producto_salida_id: string | null
  cantidad_salida: number | null
  unidad_salida: string | null
  origen_editor: 'carta' | 'receta'
  ingredientes: IngredienteBody[]
  pasos: PasoBody[]
}

const errorJSON = (error: string, status: number) => NextResponse.json({ data: null, error }, { status })

async function obtenerContexto() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: errorJSON('No autenticado.', 401) }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !ROLES.includes(perfil.rol)) return { supabase, error: errorJSON('No tienes permisos para editar recetas.', 403) }
  return { supabase, user, perfil }
}

function leerNumero(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

async function cargarProductosReceta(supabase: ReturnType<typeof crearClienteServidor>, productoIds: string[]) {
  const resultado = await supabase
    .from('productos')
    .select('id, restaurante_id, nombre, activo, tipo_operativo, metadata, densidad_g_por_ml, peso_unitario_gramos')
    .in('id', productoIds)

  if (resultado.error && esErrorColumnaTipoOperativo(resultado.error)) {
    const fallback = await supabase
      .from('productos')
      .select('id, restaurante_id, nombre, activo, metadata, densidad_g_por_ml, peso_unitario_gramos')
      .in('id', productoIds)

    if (fallback.error) return fallback

    return {
      data: (fallback.data ?? []).map((producto) => ({
        ...producto,
        tipo_operativo: obtenerTipoOperativoProducto(producto),
      })),
      error: null,
    }
  }

  if (resultado.error) return resultado

  return {
    data: (resultado.data ?? []).map((producto) => ({
      ...producto,
      tipo_operativo: obtenerTipoOperativoProducto(producto),
    })),
    error: null,
  }
}

function parsearBody(body: Record<string, unknown>): RecetaBody {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const rendimiento = typeof body.rendimiento_porciones === 'number' && Number.isInteger(body.rendimiento_porciones) && body.rendimiento_porciones > 0
    ? body.rendimiento_porciones
    : null
  const unidadRendimiento = typeof body.unidad_rendimiento === 'string' ? body.unidad_rendimiento.trim() : ''
  if (!nombre || rendimiento === null || !unidadRendimiento) throw new Error('Nombre, rendimiento y unidad válidos son obligatorios.')
  if (typeof body.en_carta !== 'boolean' || typeof body.es_produccion !== 'boolean') throw new Error('Los indicadores de carta y producción son obligatorios.')
  if (body.dificultad !== undefined && body.dificultad !== null && (typeof body.dificultad !== 'string' || !DIFICULTADES_VALIDAS.includes(body.dificultad as DificultadReceta))) {
    throw new Error('La dificultad no es válida.')
  }
  if (!Array.isArray(body.ingredientes) || body.ingredientes.length === 0) throw new Error('Debes incluir al menos un ingrediente.')

  const ingredientes: IngredienteBody[] = body.ingredientes.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new Error('Ingrediente inválido.')
    const ingrediente = item as Record<string, unknown>
    const productoId = typeof ingrediente.producto_id === 'string' ? ingrediente.producto_id.trim() : ''
    const cantidad = leerNumero(ingrediente.cantidad)
    const unidad = typeof ingrediente.unidad_medida === 'string' ? ingrediente.unidad_medida : ''
    if (!productoId || cantidad === null || cantidad <= 0 || !UNIDADES_VALIDAS.includes(unidad as UnidadEntrada)) {
      throw new Error('Revisa los ingredientes antes de guardar.')
    }
    return {
      producto_id: productoId,
      cantidad,
      unidad_medida: unidad as UnidadEntrada,
      es_opcional: ingrediente.es_opcional === true,
      orden: typeof ingrediente.orden === 'number' && Number.isInteger(ingrediente.orden) ? ingrediente.orden : index,
      notas: typeof ingrediente.notas === 'string' && ingrediente.notas.trim() !== '' ? ingrediente.notas.trim() : null,
    }
  })

  const pasosRaw = Array.isArray(body.pasos) ? body.pasos : []
  const pasos: PasoBody[] = pasosRaw.length > 0 ? pasosRaw.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new Error('Paso inválido.')
    const paso = item as Record<string, unknown>
    const titulo = typeof paso.titulo === 'string' ? paso.titulo.trim() : ''
    const descripcion = typeof paso.descripcion === 'string' ? paso.descripcion.trim() : ''
    if (!titulo || !descripcion) throw new Error('Cada paso requiere título y descripción.')
    return {
      numero: typeof paso.numero === 'number' && Number.isInteger(paso.numero) && paso.numero > 0 ? paso.numero : index + 1,
      titulo,
      descripcion,
      duracion_min: typeof paso.duracion_min === 'number' && Number.isInteger(paso.duracion_min) ? paso.duracion_min : null,
      temperatura_c: typeof paso.temperatura_c === 'number' && Number.isFinite(paso.temperatura_c) ? paso.temperatura_c : null,
      tecnica: typeof paso.tecnica === 'string' && paso.tecnica.trim() !== '' ? paso.tecnica.trim() : null,
      punto_critico: paso.punto_critico === true,
      foto_url: typeof paso.foto_url === 'string' && paso.foto_url.trim() !== '' ? paso.foto_url.trim() : null,
    }
  }) : [{
    numero: 1,
    titulo: body.en_carta === true ? 'Elaboración del plato' : 'Preparación base',
    descripcion: 'Completa los pasos de elaboración en una próxima edición.',
    duracion_min: null,
    temperatura_c: null,
    tecnica: null,
    punto_critico: false,
    foto_url: null,
  }]

  if (new Set(pasos.map((paso) => paso.numero)).size !== pasos.length) {
    throw new Error('Los números de los pasos no pueden repetirse.')
  }

  const productoSalidaId = typeof body.producto_salida_id === 'string' && body.producto_salida_id.trim() !== '' ? body.producto_salida_id.trim() : null
  const cantidadSalida = body.cantidad_salida == null || body.cantidad_salida === '' ? null : leerNumero(body.cantidad_salida)
  const unidadSalida = typeof body.unidad_salida === 'string' && body.unidad_salida.trim() !== '' ? body.unidad_salida.trim() : null
  if ((productoSalidaId || cantidadSalida !== null || unidadSalida) && (!productoSalidaId || cantidadSalida === null || !unidadSalida)) {
    throw new Error('Configura el producto de salida completo o déjalo vacío.')
  }
  if (unidadSalida && !UNIDADES_VALIDAS.includes(unidadSalida as UnidadEntrada)) throw new Error('La unidad de salida no es válida.')

  return {
    nombre,
    descripcion: typeof body.descripcion === 'string' && body.descripcion.trim() !== '' ? body.descripcion.trim() : null,
    categoria_id: typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '' ? body.categoria_id.trim() : null,
    rendimiento_porciones: rendimiento,
    unidad_rendimiento: unidadRendimiento,
    precio_venta: leerNumero(body.precio_venta),
    tiempo_preparacion: typeof body.tiempo_preparacion === 'number' && Number.isInteger(body.tiempo_preparacion) ? body.tiempo_preparacion : null,
    dificultad: typeof body.dificultad === 'string' ? body.dificultad as DificultadReceta : null,
    en_carta: body.en_carta,
    es_produccion: body.es_produccion,
    producto_salida_id: productoSalidaId,
    cantidad_salida: cantidadSalida,
    unidad_salida: unidadSalida,
    origen_editor: body.origen_editor === 'carta' ? 'carta' : 'receta',
    ingredientes,
    pasos,
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await obtenerContexto()
  if ('error' in ctx) return ctx.error

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return errorJSON('Body inválido.', 400)

  let datos: RecetaBody
  try {
    datos = parsearBody(body as Record<string, unknown>)
  } catch (error) {
    return errorJSON(error instanceof Error ? error.message : 'Datos inválidos.', 400)
  }

  const { data: existente } = await ctx.supabase
    .from('recetas')
    .select('id, version_actual, nombre, en_carta')
    .eq('id', params.id)
    .eq('restaurante_id', ctx.perfil.restaurante_id)
    .single()
  if (!existente) return errorJSON('Receta no encontrada.', 404)

  const productoIds = [...new Set([
    ...datos.ingredientes.map((ingrediente) => ingrediente.producto_id),
    ...(datos.producto_salida_id ? [datos.producto_salida_id] : []),
  ])]
  const { data: productos, error: productosError } = await cargarProductosReceta(ctx.supabase, productoIds)
  if (productosError) return errorJSON('No se pudieron verificar los productos de la receta.', 500)
  if (!productos || productos.length !== productoIds.length) return errorJSON('Uno o más productos no fueron encontrados.', 404)
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))
  for (const producto of productos) {
    if (producto.restaurante_id !== ctx.perfil.restaurante_id || producto.activo === false) return errorJSON('Uno o más productos no pertenecen al restaurante.', 403)
  }
  if (datos.producto_salida_id && productosPorId.get(datos.producto_salida_id)?.tipo_operativo !== 'elaborado') {
    return errorJSON('El producto de salida debe pertenecer a Stock disponible.', 400)
  }

  let ingredientesConGramos: Array<IngredienteBody & { cantidad_gramos: number }>
  try {
    ingredientesConGramos = datos.ingredientes.map((ingrediente) => {
      const producto = productosPorId.get(ingrediente.producto_id)
      const conversion = convertirAGramos(
        ingrediente.cantidad,
        ingrediente.unidad_medida,
        producto?.densidad_g_por_ml ?? undefined,
        producto?.peso_unitario_gramos ?? undefined
      )
      if (conversion.gramos === null) {
        throw new Error(`No se pudo convertir ${producto?.nombre ?? ingrediente.producto_id} a gramos.`)
      }
      return { ...ingrediente, cantidad_gramos: conversion.gramos }
    })
  } catch (error) {
    return errorJSON(error instanceof Error ? error.message : 'No se pudieron convertir los ingredientes.', 400)
  }

  if (datos.categoria_id) {
    const { data: categoria } = await ctx.supabase
      .from('categorias_receta')
      .select('id')
      .eq('id', datos.categoria_id)
      .eq('restaurante_id', ctx.perfil.restaurante_id)
      .single()
    if (!categoria) return errorJSON('La categoría indicada no fue encontrada.', 404)
  }

  try {
    const { error: updateError } = await ctx.supabase
      .from('recetas')
      .update({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoria_id: datos.categoria_id,
        rendimiento_porciones: datos.rendimiento_porciones,
        unidad_rendimiento: datos.unidad_rendimiento,
        precio_venta: datos.precio_venta,
        tiempo_preparacion: datos.tiempo_preparacion,
        dificultad: datos.dificultad,
        en_carta: datos.en_carta,
        es_produccion: datos.es_produccion,
        producto_salida_id: datos.producto_salida_id,
        cantidad_salida: datos.cantidad_salida,
        unidad_salida: datos.unidad_salida,
        cambios_descripcion_temp: `Edición ${new Date().toISOString()}`,
        actualizado_en: new Date().toISOString(),
        version_actual: Number(existente.version_actual ?? 1) + 1,
      })
      .eq('id', params.id)
      .eq('restaurante_id', ctx.perfil.restaurante_id)
    if (updateError) return errorJSON('No se pudo actualizar la receta.', 500)

    await ctx.supabase.from('recetas_ingredientes').delete().eq('receta_id', params.id)
    await ctx.supabase.from('recetas_pasos').delete().eq('receta_id', params.id)
    await ctx.supabase.from('recetas_productos_afectados').delete().eq('receta_id', params.id)

    const { error: ingredientesError } = await ctx.supabase.from('recetas_ingredientes').insert(
      ingredientesConGramos.map((ingrediente) => ({
        receta_id: params.id,
        producto_id: ingrediente.producto_id,
        cantidad: ingrediente.cantidad,
        unidad_medida: ingrediente.unidad_medida,
        cantidad_gramos: ingrediente.cantidad_gramos,
        es_opcional: ingrediente.es_opcional,
        orden: ingrediente.orden,
        notas: ingrediente.notas,
      }))
    )
    if (ingredientesError) return errorJSON('No se pudieron actualizar los ingredientes.', 500)

    const { error: pasosError } = await ctx.supabase.from('recetas_pasos').insert(
      datos.pasos.map((paso) => ({
        receta_id: params.id,
        restaurante_id: ctx.perfil.restaurante_id,
        numero: paso.numero,
        titulo: paso.titulo,
        descripcion: paso.descripcion,
        duracion_min: paso.duracion_min,
        temperatura_c: paso.temperatura_c,
        tecnica: paso.tecnica,
        punto_critico: paso.punto_critico,
        foto_url: paso.foto_url,
      }))
    )
    if (pasosError) return errorJSON('No se pudieron actualizar los pasos.', 500)

    const agregados = new Map<string, number>()
    for (const ingrediente of ingredientesConGramos) {
      agregados.set(ingrediente.producto_id, (agregados.get(ingrediente.producto_id) ?? 0) + ingrediente.cantidad_gramos)
    }
    const { error: afectadosError } = await ctx.supabase.from('recetas_productos_afectados').insert(
      Array.from(agregados.entries()).map(([productoId, gramos]) => ({
        receta_id: params.id,
        producto_id: productoId,
        restaurante_id: ctx.perfil.restaurante_id,
        cantidad_gramos: gramos,
      }))
    )
    if (afectadosError) return errorJSON('No se pudieron recalcular los productos afectados.', 500)

    await ctx.supabase.rpc('recalcular_costo_receta', { p_receta_id: params.id })

    const { data } = await ctx.supabase.from('recetas').select('*').eq('id', params.id).single()
    await ctx.supabase.from('actividad_operativa').insert({
      restaurante_id: ctx.perfil.restaurante_id,
      usuario_id: ctx.user.id,
      accion: datos.origen_editor === 'carta' ? 'editar_carta' : 'editar_receta',
      entidad_tipo: datos.origen_editor === 'carta' ? 'carta' : 'receta',
      entidad_id: params.id,
      descripcion: `${ctx.user.email ?? 'Usuario'} editó ${datos.origen_editor === 'carta' ? 'el plato' : 'la receta'} ${datos.nombre}`,
      datos: {
        receta_id: params.id,
        nombre_anterior: existente.nombre,
        en_carta: datos.en_carta,
        es_produccion: datos.es_produccion,
        producto_salida_id: datos.producto_salida_id,
      },
    })
    return NextResponse.json({ data, error: null })
  } catch (error) {
    return errorJSON(error instanceof Error ? error.message : 'No se pudo guardar la receta.', 400)
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await obtenerContexto()
  if ('error' in ctx) return ctx.error

  const { data: receta } = await ctx.supabase
    .from('recetas')
    .select('id, nombre, en_carta')
    .eq('id', params.id)
    .eq('restaurante_id', ctx.perfil.restaurante_id)
    .single()
  if (!receta) return errorJSON('Receta no encontrada.', 404)

  const { error } = await ctx.supabase
    .from('recetas')
    .update({ activa: false, actualizado_en: new Date().toISOString() })
    .eq('id', params.id)
    .eq('restaurante_id', ctx.perfil.restaurante_id)
  if (error) return errorJSON('No se pudo archivar la receta.', 500)

  await ctx.supabase.from('actividad_operativa').insert({
    restaurante_id: ctx.perfil.restaurante_id,
    usuario_id: ctx.user.id,
    accion: receta.en_carta ? 'archivar_carta' : 'archivar_receta',
    entidad_tipo: receta.en_carta ? 'carta' : 'receta',
    entidad_id: params.id,
    descripcion: `${ctx.user.email ?? 'Usuario'} archivó ${receta.en_carta ? 'el plato' : 'la receta'} ${receta.nombre}`,
    datos: { receta_id: params.id, nombre: receta.nombre },
  })

  return NextResponse.json({ ok: true })
}
