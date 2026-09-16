import { NextResponse } from 'next/server'

import { esErrorColumnaTipoOperativo } from '@/lib/productos'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type TipoOperativoProducto, type UnidadEntrada } from '@/types'

const UNIDADES: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb', 'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]
const TIPOS_OPERATIVOS: readonly TipoOperativoProducto[] = ['materia_prima', 'insumo', 'elaborado']

function errorJSON(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status })
}

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorJSON('No autenticado.', 401)

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id, restaurante_id, rol, activo')
    .eq('id', user.id)
    .eq('activo', true)
    .single()
  if (!perfil) return errorJSON('Usuario no encontrado o inactivo.', 401)
  if (!['dueño', 'administrador', 'chef_ejecutivo', 'chef_cocina'].includes(perfil.rol)) {
    return errorJSON('No tienes permisos para crear productos.', 403)
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return errorJSON('Body inválido.', 400)
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const unidad = typeof body.unidad_medida === 'string' ? body.unidad_medida.trim().toLowerCase() : ''
  const stock = Number(body.stock ?? 0)
  const minimo = Number(body.stock_minimo ?? 0)
  const costo = Number(body.costo_unitario ?? 0)
  const densidad = body.densidad_g_por_ml == null ? undefined : Number(body.densidad_g_por_ml)
  const peso = body.peso_unitario_gramos == null ? undefined : Number(body.peso_unitario_gramos)
  const categoriaId = typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '' ? body.categoria_id.trim() : null
  const tipoOperativo = typeof body.tipo_operativo === 'string' ? body.tipo_operativo.trim() : 'materia_prima'

  if (!nombre || !UNIDADES.includes(unidad as UnidadEntrada)) return errorJSON('Nombre y unidad válida son obligatorios.', 400)
  if (!TIPOS_OPERATIVOS.includes(tipoOperativo as TipoOperativoProducto)) return errorJSON('El tipo operativo no es válido.', 400)
  if (![stock, minimo, costo].every(Number.isFinite) || stock < 0 || minimo < 0 || costo < 0) return errorJSON('Stock, mínimo y costo deben ser números válidos.', 400)
  if (densidad !== undefined && (!Number.isFinite(densidad) || densidad <= 0)) return errorJSON('La densidad debe ser positiva.', 400)
  if (peso !== undefined && (!Number.isFinite(peso) || peso <= 0)) return errorJSON('El peso unitario debe ser positivo.', 400)
  if (categoriaId) {
    const { data: categoria } = await supabase.from('categorias_producto').select('id').eq('id', categoriaId).eq('restaurante_id', perfil.restaurante_id).eq('activa', true).maybeSingle()
    if (!categoria) return errorJSON('La categoría seleccionada no es válida.', 400)
  }

  const stockGramos = convertirAGramos(stock, unidad as UnidadEntrada, densidad, peso)
  const minimoGramos = convertirAGramos(minimo, unidad as UnidadEntrada, densidad, peso)
  if (stockGramos.gramos === null || minimoGramos.gramos === null) {
    return errorJSON('Para unidades, cajas o bandejas debes indicar el peso unitario en gramos.', 400)
  }

  const payload = {
    restaurante_id: perfil.restaurante_id,
    nombre,
    nombre_normalizado: nombre.toLowerCase(),
    tipo_operativo: tipoOperativo,
    unidad_medida: unidad,
    unidad_compra: unidad,
    unidad_display: unidad,
    costo_unitario_actual: costo,
    stock_actual: stock,
    stock_minimo: minimo,
    cantidad_gramos: stockGramos.gramos,
    stock_minimo_gramos: minimoGramos.gramos,
    densidad_g_por_ml: densidad ?? null,
    peso_unitario_gramos: peso ?? null,
    categoria_id: categoriaId,
    activo: true,
    metadata: { tipo_operativo: tipoOperativo },
  }

  let { data, error } = await supabase.from('productos').insert(payload).select().single()

  if (error && esErrorColumnaTipoOperativo(error)) {
    const fallbackPayload = { ...payload }
    delete (fallbackPayload as Record<string, unknown>).tipo_operativo
    const fallback = await supabase.from('productos').insert({
      ...fallbackPayload,
      metadata: { ...(fallbackPayload.metadata ?? {}), tipo_operativo: tipoOperativo },
    }).select().single()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) return errorJSON('No se pudo crear el producto. Intenta nuevamente.', 500)
  await supabase.from('actividad_operativa').insert({
    restaurante_id: perfil.restaurante_id,
    usuario_id: user.id,
    accion: 'crear_producto',
    entidad_id: data.id,
    descripcion: `${user.email ?? 'Usuario'} creó ${tipoOperativo === 'elaborado' ? 'el stock' : 'el producto'} ${nombre}`,
    datos: { nombre, unidad, stock, minimo, costo, tipo_operativo: tipoOperativo },
  })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
