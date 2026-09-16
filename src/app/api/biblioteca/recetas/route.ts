import { NextResponse, type NextRequest } from 'next/server'

import { esErrorColumnaTipoOperativo, normalizarTipoOperativoProducto } from '@/lib/productos'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type DificultadReceta, type UnidadEntrada } from '@/types'

const UNIDADES_VALIDAS: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

const DIFICULTADES_VALIDAS: readonly DificultadReceta[] = ['basica', 'intermedia', 'avanzada']

interface BodyIngrediente {
  producto_id: string
  cantidad: number
  unidad_medida: UnidadEntrada
  es_opcional: boolean
  orden: number
  notas: string | null
}

interface BodyPaso {
  numero: number
  titulo: string
  descripcion: string
  duracion_min: number | null
  temperatura_c: number | null
  tecnica: string | null
  punto_critico: boolean
  foto_url: string | null
}

interface BodyReceta {
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
  ingredientes: BodyIngrediente[]
  pasos: BodyPaso[]
}

function errorJSON(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status })
}

function leerNumero(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function leerEnteroPositivo(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) && Number.isInteger(valor) && valor > 0 ? valor : null
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
        tipo_operativo: normalizarTipoOperativoProducto(producto),
      })),
      error: null,
    }
  }

  if (resultado.error) return resultado

  return {
    data: (resultado.data ?? []).map((producto) => ({
      ...producto,
      tipo_operativo: normalizarTipoOperativoProducto(producto),
    })),
    error: null,
  }
}

function parsearBody(raw: Record<string, unknown>): BodyReceta {
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : ''
  const unidadRendimiento = typeof raw.unidad_rendimiento === 'string' ? raw.unidad_rendimiento.trim() : ''
  const rendimiento = leerEnteroPositivo(raw.rendimiento_porciones)
  const enCarta = raw.en_carta
  const esProduccion = raw.es_produccion

  if (!nombre) throw new Error('nombre debe ser un string no vacío.')
  if (rendimiento === null) throw new Error('rendimiento_porciones debe ser un número entero mayor que 0.')
  if (!unidadRendimiento) throw new Error('unidad_rendimiento debe ser un string no vacío.')
  if (typeof enCarta !== 'boolean') throw new Error('en_carta debe ser un booleano.')
  if (typeof esProduccion !== 'boolean') throw new Error('es_produccion debe ser un booleano.')

  if (raw.precio_venta !== undefined && raw.precio_venta !== null && leerNumero(raw.precio_venta) === null) {
    throw new Error('precio_venta debe ser un número finito o null.')
  }
  if (raw.tiempo_preparacion !== undefined && raw.tiempo_preparacion !== null && (typeof raw.tiempo_preparacion !== 'number' || !Number.isInteger(raw.tiempo_preparacion))) {
    throw new Error('tiempo_preparacion debe ser un número entero o null.')
  }
  if (raw.dificultad !== undefined && raw.dificultad !== null && (typeof raw.dificultad !== 'string' || !DIFICULTADES_VALIDAS.includes(raw.dificultad as DificultadReceta))) {
    throw new Error(`dificultad debe ser una de: ${DIFICULTADES_VALIDAS.join(', ')}.`)
  }

  if (!Array.isArray(raw.ingredientes) || raw.ingredientes.length === 0) {
    throw new Error('ingredientes debe ser un array con al menos un elemento.')
  }
  const ingredientes: BodyIngrediente[] = raw.ingredientes.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new Error('Cada ingrediente debe ser un objeto.')
    const ing = item as Record<string, unknown>
    const productoId = typeof ing.producto_id === 'string' ? ing.producto_id.trim() : ''
    const cantidad = leerNumero(ing.cantidad)
    const unidad = typeof ing.unidad_medida === 'string' ? ing.unidad_medida : ''
    if (!productoId) throw new Error('Cada ingrediente requiere producto_id.')
    if (cantidad === null || cantidad <= 0) throw new Error('Cada ingrediente requiere cantidad válida.')
    if (!UNIDADES_VALIDAS.includes(unidad as UnidadEntrada)) throw new Error('Cada ingrediente requiere unidad_medida válida.')
    return {
      producto_id: productoId,
      cantidad,
      unidad_medida: unidad as UnidadEntrada,
      es_opcional: ing.es_opcional === true,
      orden: typeof ing.orden === 'number' && Number.isInteger(ing.orden) ? ing.orden : index,
      notas: typeof ing.notas === 'string' && ing.notas.trim() !== '' ? ing.notas.trim() : null,
    }
  })

  const pasosRaw = Array.isArray(raw.pasos) ? raw.pasos : []
  const pasos: BodyPaso[] = pasosRaw.length > 0
    ? pasosRaw.map((item, index) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new Error('Cada paso debe ser un objeto.')
        const paso = item as Record<string, unknown>
        const numero = typeof paso.numero === 'number' && Number.isInteger(paso.numero) && paso.numero > 0 ? paso.numero : index + 1
        const titulo = typeof paso.titulo === 'string' ? paso.titulo.trim() : ''
        const descripcion = typeof paso.descripcion === 'string' ? paso.descripcion.trim() : ''
        if (!titulo) throw new Error('Cada paso requiere titulo.')
        if (!descripcion) throw new Error('Cada paso requiere descripcion.')
        return {
          numero,
          titulo,
          descripcion,
          duracion_min: typeof paso.duracion_min === 'number' && Number.isInteger(paso.duracion_min) ? paso.duracion_min : null,
          temperatura_c: typeof paso.temperatura_c === 'number' && Number.isFinite(paso.temperatura_c) ? paso.temperatura_c : null,
          tecnica: typeof paso.tecnica === 'string' && paso.tecnica.trim() !== '' ? paso.tecnica.trim() : null,
          punto_critico: paso.punto_critico === true,
          foto_url: typeof paso.foto_url === 'string' && paso.foto_url.trim() !== '' ? paso.foto_url.trim() : null,
        }
      })
    : [{
        numero: 1,
        titulo: enCarta ? 'Elaboración del plato' : 'Preparación base',
        descripcion: enCarta ? 'Completa los pasos de elaboración del plato.' : 'Completa los pasos de preparación de la receta.',
        duracion_min: null,
        temperatura_c: null,
        tecnica: null,
        punto_critico: false,
        foto_url: null,
      }]

  if (new Set(pasos.map((paso) => paso.numero)).size !== pasos.length) {
    throw new Error('Los números de los pasos no pueden repetirse.')
  }

  if (new Set(pasos.map((paso) => paso.numero)).size !== pasos.length) {
    throw new Error('Los números de los pasos no pueden repetirse.')
  }

  const productoSalidaId = typeof raw.producto_salida_id === 'string' && raw.producto_salida_id.trim() !== '' ? raw.producto_salida_id.trim() : null
  const cantidadSalida = raw.cantidad_salida == null || raw.cantidad_salida === '' ? null : leerNumero(raw.cantidad_salida)
  const unidadSalida = typeof raw.unidad_salida === 'string' && raw.unidad_salida.trim() !== '' ? raw.unidad_salida.trim() : null
  if ((productoSalidaId || cantidadSalida !== null || unidadSalida) && (!productoSalidaId || cantidadSalida === null || !unidadSalida)) {
    throw new Error('La salida de producción requiere producto, cantidad y unidad.')
  }
  if (unidadSalida && !UNIDADES_VALIDAS.includes(unidadSalida as UnidadEntrada)) {
    throw new Error('La unidad de salida no es válida.')
  }

  return {
    nombre,
    descripcion: typeof raw.descripcion === 'string' && raw.descripcion.trim() !== '' ? raw.descripcion.trim() : null,
    categoria_id: typeof raw.categoria_id === 'string' && raw.categoria_id.trim() !== '' ? raw.categoria_id.trim() : null,
    rendimiento_porciones: rendimiento,
    unidad_rendimiento: unidadRendimiento,
    precio_venta: leerNumero(raw.precio_venta),
    tiempo_preparacion: typeof raw.tiempo_preparacion === 'number' && Number.isInteger(raw.tiempo_preparacion) ? raw.tiempo_preparacion : null,
    dificultad: typeof raw.dificultad === 'string' ? raw.dificultad as DificultadReceta : null,
    en_carta: enCarta,
    es_produccion: esProduccion,
    producto_salida_id: productoSalidaId,
    cantidad_salida: cantidadSalida,
    unidad_salida: unidadSalida,
    origen_editor: raw.origen_editor === 'carta' ? 'carta' : 'receta',
    ingredientes,
    pasos,
  }
}

export async function POST(request: NextRequest) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorJSON('No autenticado.', 401)

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id, restaurante_id, activo, rol')
    .eq('id', user.id)
    .eq('activo', true)
    .single()
  if (!perfil) return errorJSON('Usuario no encontrado o inactivo.', 401)
  if (!['dueño', 'chef_ejecutivo', 'chef_cocina'].includes(perfil.rol)) {
    return errorJSON('No tienes permisos para crear recetas.', 403)
  }

  const body = await request.json().catch(() => null)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return errorJSON('El body debe ser un objeto JSON.', 400)

  let datos: BodyReceta
  try {
    datos = parsearBody(body as Record<string, unknown>)
  } catch (error) {
    return errorJSON(error instanceof Error ? error.message : 'Body inválido.', 400)
  }

  const productoIds = [...new Set([
    ...datos.ingredientes.map((ingrediente) => ingrediente.producto_id),
    ...(datos.producto_salida_id ? [datos.producto_salida_id] : []),
  ])]

  const { data: productos, error: productosError } = await cargarProductosReceta(supabase, productoIds)

  if (productosError) return errorJSON('Error al verificar los productos de la receta.', 500)
  if (!productos || productos.length !== productoIds.length) return errorJSON('Uno o más productos de la receta no fueron encontrados.', 404)

  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))
  for (const producto of productos) {
    if (producto.restaurante_id !== perfil.restaurante_id || producto.activo === false) {
      return errorJSON('Sin autorización sobre uno o más productos de la receta.', 403)
    }
  }

  if (datos.producto_salida_id) {
    const salida = productosPorId.get(datos.producto_salida_id)
    if (!salida || salida.tipo_operativo !== 'elaborado') {
      return errorJSON('El producto de salida debe existir y pertenecer a Stock disponible.', 400)
    }
  }

  for (const ingrediente of datos.ingredientes) {
    const producto = productosPorId.get(ingrediente.producto_id)
    const conversion = convertirAGramos(
      ingrediente.cantidad,
      ingrediente.unidad_medida,
      producto?.densidad_g_por_ml ?? undefined,
      producto?.peso_unitario_gramos ?? undefined
    )
    if (conversion.gramos === null) {
      return errorJSON(`No fue posible convertir la cantidad del ingrediente "${producto?.nombre ?? ingrediente.producto_id}" a gramos.`, 400)
    }
  }

  if (datos.categoria_id) {
    const { data: categoria } = await supabase
      .from('categorias_receta')
      .select('id')
      .eq('id', datos.categoria_id)
      .eq('restaurante_id', perfil.restaurante_id)
      .single()
    if (!categoria) return errorJSON('La categoría indicada no fue encontrada.', 404)
  }

  const { data: recetaCreadaRPC, error: recetaError } = await supabase.rpc('crear_receta_completa', {
    p_restaurante_id: perfil.restaurante_id,
    p_creado_por: perfil.id,
    p_datos: datos,
  })
  const recetaCreada = Array.isArray(recetaCreadaRPC) ? recetaCreadaRPC[0] : recetaCreadaRPC
  if (recetaError || !recetaCreada) return errorJSON('No se pudo crear la receta completa.', 500)

  await supabase.from('actividad_operativa').insert({
    restaurante_id: perfil.restaurante_id,
    usuario_id: user.id,
    accion: datos.origen_editor === 'carta' ? 'crear_carta' : 'crear_receta',
    entidad_tipo: datos.origen_editor === 'carta' ? 'carta' : 'receta',
    entidad_id: recetaCreada.id,
    descripcion: `${user.email ?? 'Usuario'} creó ${datos.origen_editor === 'carta' ? 'el plato' : 'la receta'} ${datos.nombre}`,
    datos: {
      receta_id: recetaCreada.id,
      en_carta: datos.en_carta,
      es_produccion: datos.es_produccion,
      producto_salida_id: datos.producto_salida_id,
      cantidad_salida: datos.cantidad_salida,
      unidad_salida: datos.unidad_salida,
    },
  })

  return NextResponse.json({ data: recetaCreada, error: null }, { status: 201 })
}
