/**
 * src/app/api/biblioteca/recetas/route.ts
 *
 * API Route — Crear una receta completa (receta + ingredientes + pasos).
 *
 * POST /api/biblioteca/recetas
 *
 * Flujo:
 * 1. Autenticar usuario via sesión Supabase.
 * 2. Obtener perfil del usuario (id, restaurante_id, activo).
 * 3. Validar el body de la request (incluye rechazo de numero de paso
 *    duplicado, ya que recetas_pasos tiene UNIQUE (receta_id, numero)).
 * 4. Verificar que todos los productos de los ingredientes existan y
 *    pertenezcan al restaurante.
 * 5. Convertir la cantidad de cada ingrediente a gramos vía convertirAGramos().
 * 5b. Verificar que categoria_id, si viene informada, pertenezca al
 *     restaurante — consulta restringida por restaurante_id desde el
 *     origen (categorias_receta tiene restaurante_id propio).
 * 6. Insertar en recetas.
 * 7. Insertar en recetas_ingredientes (una fila por ingrediente).
 * 8. Insertar en recetas_pasos.
 * 9. Insertar en recetas_productos_afectados (agrupado por producto_id,
 *    sumando cantidad_gramos, ya que la tabla tiene clave compuesta
 *    receta_id + producto_id y un mismo producto puede repetirse entre
 *    ingredientes).
 * 10. Invocar supabase.rpc('recalcular_costo_receta', { receta_id }).
 * 11. Volver a consultar la receta por su id para obtener los costos
 *     actualizados por el RPC (costo_total, costo_porcion, margen_porcentaje).
 * 12. Retornar la receta actualizada con status 201.
 *
 * Decisión de arquitectura (interacción previa a esta implementación):
 * el recálculo de costo se invoca directamente vía RPC
 * ('recalcular_costo_receta'), no mediante fetch() HTTP hacia
 * /api/biblioteca/recetas/[id]/costo — esa ruta queda para una iteración
 * posterior, exclusiva para recálculo manual de una receta existente.
 *
 * No existe RPC atómica de creación (a diferencia de producción). Los pasos
 * 6-10 son inserciones/llamadas secuenciales, no una transacción. Si un paso
 * posterior a la creación de la receta falla, se registra el error y se
 * retorna 500 — sin compensación automática, mismo criterio ya aplicado en
 * mermas/route.ts y api/inventario/movimientos/route.ts.
 *
 * Convención de respuesta:
 * { data: T | null, error: string | null }
 */

import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor }           from '@/lib/supabase/servidor'

import {
  convertirAGramos,
  type UnidadEntrada,
  type DificultadReceta,
} from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────────────────────

const UNIDADES_VALIDAS: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

const DIFICULTADES_VALIDAS: readonly DificultadReceta[] = [
  'basica',
  'intermedia',
  'avanzada',
]

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface BodyIngrediente {
  producto_id:    string
  cantidad:       number
  unidad_medida:  UnidadEntrada
  es_opcional:    boolean
  orden:          number
  notas:          string | null
}

interface BodyPaso {
  numero:         number
  titulo:         string
  descripcion:    string
  duracion_min:   number | null
  temperatura_c:  number | null
  tecnica:        string | null
  punto_critico:  boolean
  foto_url:       string | null
}

interface BodyReceta {
  nombre:                 string
  descripcion:            string | null
  categoria_id:           string | null
  rendimiento_porciones:  number
  unidad_rendimiento:     string
  precio_venta:           number | null
  tiempo_preparacion:     number | null
  dificultad:             DificultadReceta | null
  en_carta:               boolean
  es_produccion:          boolean
  ingredientes:           BodyIngrediente[]
  pasos:                  BodyPaso[]
}

// ─────────────────────────────────────────────────────────────
// Helper — respuesta de error
// ─────────────────────────────────────────────────────────────

function errorJSON(mensaje: string, status: number) {
  return NextResponse.json(
    { data: null, error: mensaje },
    { status }
  )
}

// ─────────────────────────────────────────────────────────────
// POST /api/biblioteca/recetas
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = crearClienteServidor()

  // ── 1. Autenticación ───────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorJSON('No autenticado.', 401)
  }

  // ── 2. Perfil del usuario ──────────────────────────────────
  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios')
    .select('id, restaurante_id, activo')
    .eq('id', user.id)
    .eq('activo', true)
    .single()

  if (perfilError || !perfil) {
    return errorJSON('Usuario no encontrado o inactivo.', 401)
  }

  // ── 3. Parsear y validar body ──────────────────────────────
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorJSON('Body inválido — se esperaba JSON.', 400)
  }

  // Verificar que body sea un objeto no nulo antes de cualquier cast
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorJSON('El body debe ser un objeto JSON.', 400)
  }

  // Cast seguro: body ya fue verificado como objeto no nulo y no array
  const raw = body as Record<string, unknown>

  // Validar campos obligatorios de la receta
  if (
    !('nombre' in raw) ||
    !('rendimiento_porciones' in raw) ||
    !('unidad_rendimiento' in raw) ||
    !('en_carta' in raw) ||
    !('es_produccion' in raw) ||
    !('ingredientes' in raw) ||
    !('pasos' in raw)
  ) {
    return errorJSON(
      'Campos obligatorios faltantes: nombre, rendimiento_porciones, unidad_rendimiento, en_carta, es_produccion, ingredientes, pasos.',
      400
    )
  }

  if (typeof raw.nombre !== 'string' || raw.nombre.trim() === '') {
    return errorJSON('nombre debe ser un string no vacío.', 400)
  }

  if (
    typeof raw.rendimiento_porciones !== 'number' ||
    !Number.isFinite(raw.rendimiento_porciones) ||
    !Number.isInteger(raw.rendimiento_porciones) ||
    raw.rendimiento_porciones <= 0
  ) {
    return errorJSON('rendimiento_porciones debe ser un número entero mayor que 0.', 400)
  }

  if (typeof raw.unidad_rendimiento !== 'string' || raw.unidad_rendimiento.trim() === '') {
    return errorJSON('unidad_rendimiento debe ser un string no vacío.', 400)
  }

  if (typeof raw.en_carta !== 'boolean') {
    return errorJSON('en_carta debe ser un booleano.', 400)
  }

  if (typeof raw.es_produccion !== 'boolean') {
    return errorJSON('es_produccion debe ser un booleano.', 400)
  }

  // Validar campos opcionales de la receta
  if (
    'descripcion' in raw &&
    raw.descripcion !== null &&
    raw.descripcion !== undefined &&
    typeof raw.descripcion !== 'string'
  ) {
    return errorJSON('descripcion debe ser un string o null.', 400)
  }

  if (
    'categoria_id' in raw &&
    raw.categoria_id !== null &&
    raw.categoria_id !== undefined &&
    typeof raw.categoria_id !== 'string'
  ) {
    return errorJSON('categoria_id debe ser un string o null.', 400)
  }

  if (
    'precio_venta' in raw &&
    raw.precio_venta !== null &&
    raw.precio_venta !== undefined &&
    (typeof raw.precio_venta !== 'number' || !Number.isFinite(raw.precio_venta))
  ) {
    return errorJSON('precio_venta debe ser un número finito o null.', 400)
  }

  if (
    'tiempo_preparacion' in raw &&
    raw.tiempo_preparacion !== null &&
    raw.tiempo_preparacion !== undefined &&
    (typeof raw.tiempo_preparacion !== 'number' ||
      !Number.isFinite(raw.tiempo_preparacion) ||
      !Number.isInteger(raw.tiempo_preparacion))
  ) {
    return errorJSON('tiempo_preparacion debe ser un número entero o null.', 400)
  }

  if (
    'dificultad' in raw &&
    raw.dificultad !== null &&
    raw.dificultad !== undefined &&
    (typeof raw.dificultad !== 'string' || !DIFICULTADES_VALIDAS.includes(raw.dificultad as DificultadReceta))
  ) {
    return errorJSON(
      `dificultad debe ser una de: ${DIFICULTADES_VALIDAS.join(', ')}, o null.`,
      400
    )
  }

  // Validar ingredientes
  if (!Array.isArray(raw.ingredientes) || raw.ingredientes.length === 0) {
    return errorJSON('ingredientes debe ser un array con al menos un elemento.', 400)
  }

  const ingredientes: BodyIngrediente[] = []

  for (const item of raw.ingredientes) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return errorJSON('Cada ingrediente debe ser un objeto.', 400)
    }

    const ing = item as Record<string, unknown>

    if (typeof ing.producto_id !== 'string' || ing.producto_id.trim() === '') {
      return errorJSON('Cada ingrediente requiere producto_id (string no vacío).', 400)
    }

    if (typeof ing.cantidad !== 'number' || !Number.isFinite(ing.cantidad) || ing.cantidad <= 0) {
      return errorJSON('Cada ingrediente requiere cantidad (número finito mayor que 0).', 400)
    }

    if (
      typeof ing.unidad_medida !== 'string' ||
      !UNIDADES_VALIDAS.includes(ing.unidad_medida as UnidadEntrada)
    ) {
      return errorJSON(
        `Cada ingrediente requiere unidad_medida válida: ${UNIDADES_VALIDAS.join(', ')}.`,
        400
      )
    }

    if (typeof ing.es_opcional !== 'boolean') {
      return errorJSON('Cada ingrediente requiere es_opcional (booleano).', 400)
    }

    if (
      typeof ing.orden !== 'number' ||
      !Number.isFinite(ing.orden) ||
      !Number.isInteger(ing.orden)
    ) {
      return errorJSON('Cada ingrediente requiere orden (número entero).', 400)
    }

    if (
      'notas' in ing &&
      ing.notas !== null &&
      ing.notas !== undefined &&
      typeof ing.notas !== 'string'
    ) {
      return errorJSON('notas del ingrediente debe ser un string o null.', 400)
    }

    ingredientes.push({
      producto_id:    ing.producto_id.trim(),
      cantidad:       ing.cantidad,
      unidad_medida:  ing.unidad_medida as UnidadEntrada,
      es_opcional:    ing.es_opcional,
      orden:          ing.orden,
      notas:
        typeof ing.notas === 'string' && ing.notas.trim() !== ''
          ? ing.notas.trim()
          : null,
    })
  }

  // Validar pasos
  if (!Array.isArray(raw.pasos) || raw.pasos.length === 0) {
    return errorJSON('pasos debe ser un array con al menos un elemento.', 400)
  }

  const pasos: BodyPaso[] = []

  for (const item of raw.pasos) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return errorJSON('Cada paso debe ser un objeto.', 400)
    }

    const paso = item as Record<string, unknown>

    if (
      typeof paso.numero !== 'number' ||
      !Number.isFinite(paso.numero) ||
      !Number.isInteger(paso.numero) ||
      paso.numero <= 0
    ) {
      return errorJSON('Cada paso requiere numero (número entero mayor que 0).', 400)
    }

    if (typeof paso.titulo !== 'string' || paso.titulo.trim() === '') {
      return errorJSON('Cada paso requiere titulo (string no vacío).', 400)
    }

    if (typeof paso.descripcion !== 'string' || paso.descripcion.trim() === '') {
      return errorJSON('Cada paso requiere descripcion (string no vacío).', 400)
    }

    if (
      'punto_critico' in paso &&
      paso.punto_critico !== null &&
      paso.punto_critico !== undefined &&
      typeof paso.punto_critico !== 'boolean'
    ) {
      return errorJSON('punto_critico del paso debe ser un booleano.', 400)
    }

    if (
      'duracion_min' in paso &&
      paso.duracion_min !== null &&
      paso.duracion_min !== undefined &&
      (typeof paso.duracion_min !== 'number' ||
        !Number.isFinite(paso.duracion_min) ||
        !Number.isInteger(paso.duracion_min))
    ) {
      return errorJSON('duracion_min del paso debe ser un número entero o null.', 400)
    }

    if (
      'temperatura_c' in paso &&
      paso.temperatura_c !== null &&
      paso.temperatura_c !== undefined &&
      (typeof paso.temperatura_c !== 'number' ||
        !Number.isFinite(paso.temperatura_c) ||
        !Number.isInteger(paso.temperatura_c))
    ) {
      return errorJSON('temperatura_c del paso debe ser un número entero o null.', 400)
    }

    if (
      'tecnica' in paso &&
      paso.tecnica !== null &&
      paso.tecnica !== undefined &&
      typeof paso.tecnica !== 'string'
    ) {
      return errorJSON('tecnica del paso debe ser un string o null.', 400)
    }

    if (
      'foto_url' in paso &&
      paso.foto_url !== null &&
      paso.foto_url !== undefined &&
      typeof paso.foto_url !== 'string'
    ) {
      return errorJSON('foto_url del paso debe ser un string o null.', 400)
    }

    pasos.push({
      numero:         paso.numero,
      titulo:         paso.titulo.trim(),
      descripcion:    paso.descripcion.trim(),
      duracion_min:   typeof paso.duracion_min === 'number' ? paso.duracion_min : null,
      temperatura_c:  typeof paso.temperatura_c === 'number' ? paso.temperatura_c : null,
      tecnica:
        typeof paso.tecnica === 'string' && paso.tecnica.trim() !== ''
          ? paso.tecnica.trim()
          : null,
      punto_critico:  typeof paso.punto_critico === 'boolean' ? paso.punto_critico : false,
      foto_url:
        typeof paso.foto_url === 'string' && paso.foto_url.trim() !== ''
          ? paso.foto_url.trim()
          : null,
    })
  }

  // Validar que no haya numero duplicado entre los pasos —
  // recetas_pasos tiene UNIQUE (receta_id, numero)
  const numerosDePaso = pasos.map((p) => p.numero)
  if (new Set(numerosDePaso).size !== numerosDePaso.length) {
    return errorJSON('Los números de los pasos no pueden repetirse.', 400)
  }

  // Construcción del body completamente validado
  const datos: BodyReceta = {
    nombre:                raw.nombre.trim(),
    descripcion:
      typeof raw.descripcion === 'string' && raw.descripcion.trim() !== ''
        ? raw.descripcion.trim()
        : null,
    categoria_id:
      typeof raw.categoria_id === 'string' && raw.categoria_id.trim() !== ''
        ? raw.categoria_id.trim()
        : null,
    rendimiento_porciones: raw.rendimiento_porciones,
    unidad_rendimiento:    raw.unidad_rendimiento.trim(),
    precio_venta:          typeof raw.precio_venta === 'number' ? raw.precio_venta : null,
    tiempo_preparacion:    typeof raw.tiempo_preparacion === 'number' ? raw.tiempo_preparacion : null,
    dificultad:            typeof raw.dificultad === 'string' ? (raw.dificultad as DificultadReceta) : null,
    en_carta:              raw.en_carta,
    es_produccion:         raw.es_produccion,
    ingredientes,
    pasos,
  }

  // ── 4. Verificar productos de los ingredientes ──────────────
  const productoIds = [...new Set(datos.ingredientes.map((i) => i.producto_id))]

  const { data: productos, error: productosError } = await supabase
    .from('productos')
    .select('id, restaurante_id, densidad_g_por_ml, peso_unitario_gramos')
    .in('id', productoIds)

  if (productosError) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al verificar productos:', productosError.message)
    return errorJSON('Error al verificar los productos de la receta. Intenta nuevamente.', 500)
  }

  if (!productos || productos.length !== productoIds.length) {
    return errorJSON('Uno o más productos de los ingredientes no fueron encontrados.', 404)
  }

  for (const producto of productos) {
    if (producto.restaurante_id !== perfil.restaurante_id) {
      return errorJSON('Sin autorización sobre uno o más productos de los ingredientes.', 403)
    }
  }

  const productosPorId = new Map(productos.map((p) => [p.id, p]))

  // ── 5. Convertir cantidad de cada ingrediente a gramos ──────
  const ingredientesConGramos: Array<BodyIngrediente & { cantidad_gramos: number }> = []

  for (const ingrediente of datos.ingredientes) {
    const producto = productosPorId.get(ingrediente.producto_id)

    if (!producto) {
      return errorJSON('Uno o más productos de los ingredientes no fueron encontrados.', 404)
    }

    const conversion = convertirAGramos(
      ingrediente.cantidad,
      ingrediente.unidad_medida,
      producto.densidad_g_por_ml ?? undefined,
      producto.peso_unitario_gramos ?? undefined
    )

    if (conversion.gramos === null) {
      return errorJSON(
        `No fue posible convertir la cantidad del ingrediente "${ingrediente.producto_id}" a gramos. Verifica la unidad_medida o la configuración de densidad/peso unitario del producto.`,
        400
      )
    }

    ingredientesConGramos.push({
      ...ingrediente,
      cantidad_gramos: conversion.gramos,
    })
  }

  // Verificar tenancy de categoria_id, si viene informada.
  // La consulta se restringe desde el origen por restaurante_id — nunca se
  // lee una categoría de otro restaurante para luego rechazarla. Categoría
  // inexistente y categoría de otro restaurante se tratan igual (404), para
  // no facilitar enumeración de recursos entre tenants.
  if (datos.categoria_id !== null) {
    const { data: categoria, error: categoriaError } = await supabase
      .from('categorias_receta')
      .select('id')
      .eq('id', datos.categoria_id)
      .eq('restaurante_id', perfil.restaurante_id)
      .single()

    if (categoriaError || !categoria) {
      return errorJSON('La categoría indicada no fue encontrada.', 404)
    }
  }

  // ── 6. Insertar receta ───────────────────────────────────────
  const { data: receta, error: recetaError } = await supabase
    .from('recetas')
    .insert({
      restaurante_id:         perfil.restaurante_id,
      nombre:                 datos.nombre,
      descripcion:            datos.descripcion,
      categoria_id:           datos.categoria_id,
      rendimiento_porciones:  datos.rendimiento_porciones,
      unidad_rendimiento:     datos.unidad_rendimiento,
      precio_venta:           datos.precio_venta,
      tiempo_preparacion:     datos.tiempo_preparacion,
      dificultad:             datos.dificultad,
      en_carta:               datos.en_carta,
      es_produccion:          datos.es_produccion,
      activa:                 true,
      version_actual:         1,
      creado_por:             perfil.id,
    })
    .select()
    .single()

  if (recetaError || !receta) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al insertar receta:', recetaError?.message)
    return errorJSON('Error al crear la receta. Intenta nuevamente.', 500)
  }

  // ── 7. Insertar ingredientes ─────────────────────────────────
  const { error: ingredientesError } = await supabase
    .from('recetas_ingredientes')
    .insert(
      ingredientesConGramos.map((ingrediente) => ({
        receta_id:       receta.id,
        producto_id:     ingrediente.producto_id,
        cantidad:        ingrediente.cantidad,
        unidad_medida:   ingrediente.unidad_medida,
        cantidad_gramos: ingrediente.cantidad_gramos,
        es_opcional:     ingrediente.es_opcional,
        orden:           ingrediente.orden,
        notas:           ingrediente.notas,
      }))
    )

  if (ingredientesError) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al insertar ingredientes:', ingredientesError.message)
    return errorJSON('Error al crear los ingredientes de la receta. Intenta nuevamente.', 500)
  }

  // ── 8. Insertar pasos ─────────────────────────────────────────
  const { error: pasosError } = await supabase
    .from('recetas_pasos')
    .insert(
      pasos.map((paso) => ({
        receta_id:      receta.id,
        restaurante_id: perfil.restaurante_id,
        numero:         paso.numero,
        titulo:         paso.titulo,
        descripcion:    paso.descripcion,
        duracion_min:   paso.duracion_min,
        temperatura_c:  paso.temperatura_c,
        tecnica:        paso.tecnica,
        punto_critico:  paso.punto_critico,
        foto_url:       paso.foto_url,
        activo:         true,
      }))
    )

  if (pasosError) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al insertar pasos:', pasosError.message)
    return errorJSON('Error al crear los pasos de la receta. Intenta nuevamente.', 500)
  }

  // ── 9. Insertar mapa de productos afectados ──────────────────
  //
  // recetas_productos_afectados tiene clave compuesta (receta_id, producto_id):
  // un mismo producto puede aparecer en varios ingredientes de la receta, por
  // lo que se agrupa por producto_id sumando cantidad_gramos antes de insertar,
  // para producir exactamente una fila por producto_id único.
  const gramosPorProducto = new Map<string, number>()

  for (const ingrediente of ingredientesConGramos) {
    const acumulado = gramosPorProducto.get(ingrediente.producto_id) ?? 0
    gramosPorProducto.set(ingrediente.producto_id, acumulado + ingrediente.cantidad_gramos)
  }

  const { error: afectadosError } = await supabase
    .from('recetas_productos_afectados')
    .insert(
      Array.from(gramosPorProducto.entries()).map(([producto_id, cantidad_gramos]) => ({
        receta_id:       receta.id,
        producto_id:     producto_id,
        restaurante_id:  perfil.restaurante_id,
        cantidad_gramos: cantidad_gramos,
      }))
    )

  if (afectadosError) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al insertar productos afectados:', afectadosError.message)
    return errorJSON('Error al registrar los productos afectados por la receta. Intenta nuevamente.', 500)
  }

  // ── 10. Recalcular costo ──────────────────────────────────────
  const { error: costoError } = await supabase.rpc('recalcular_costo_receta', {
    receta_id: receta.id,
  })

  if (costoError) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al recalcular costo:', costoError.message)
    return errorJSON('Error al calcular el costo de la receta. Intenta nuevamente.', 500)
  }

  // ── 11. Volver a consultar la receta con los costos actualizados ──
  const { data: recetaActualizada, error: recetaActualizadaError } = await supabase
    .from('recetas')
    .select()
    .eq('id', receta.id)
    .single()

  if (recetaActualizadaError || !recetaActualizada) {
    console.error('[ChefOS/api/biblioteca/recetas] Error al recuperar la receta actualizada:', recetaActualizadaError?.message)
    return errorJSON('Error al recuperar la receta con los costos actualizados. Intenta nuevamente.', 500)
  }

  // ── 12. Respuesta exitosa ─────────────────────────────────────
  return NextResponse.json(
    { data: recetaActualizada, error: null },
    { status: 201 }
  )
}
