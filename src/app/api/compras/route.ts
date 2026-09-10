import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type UnidadEntrada } from '@/types'

function errorJSON(error: string, status: number) { return NextResponse.json({ data: null, error }, { status }) }

async function perfilActual() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, perfil: null }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo, rol').eq('id', user.id).eq('activo', true).single()
  return { supabase, perfil }
}

export async function GET(request: NextRequest) {
  const { supabase, perfil } = await perfilActual()
  if (!perfil) return errorJSON('No autenticado.', 401)
  const estado = request.nextUrl.searchParams.get('estado')
  let query = supabase.from('compras').select('*, proveedor:proveedores(*)').eq('restaurante_id', perfil.restaurante_id).order('fecha_compra', { ascending: false })
  if (estado) query = query.eq('estado', estado)
  const { data, error } = await query
  if (error) return errorJSON('No se pudieron cargar las compras.', 500)
  return NextResponse.json({ data: data ?? [], error: null })
}

export async function POST(request: NextRequest) {
  const { supabase, perfil } = await perfilActual()
  if (!perfil) return errorJSON('No autenticado.', 401)
  if (!['dueño', 'administrador', 'chef_ejecutivo'].includes(perfil.rol)) return errorJSON('No tienes permisos para registrar compras.', 403)
  let body: unknown
  try { body = await request.json() } catch { return errorJSON('Body inválido.', 400) }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return errorJSON('El body debe ser un objeto.', 400)
  const raw = body as Record<string, unknown>
  const items = raw.items
  if (!Array.isArray(items) || items.length === 0) return errorJSON('La compra debe incluir al menos un ítem.', 400)
  const validItems = items.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
  if (validItems.length !== items.length) return errorJSON('Hay ítems inválidos.', 400)
  const productIds = validItems.map((item) => item.producto_id).filter((id): id is string => typeof id === 'string')
  const { data: productos } = await supabase.from('productos').select('id, unidad_medida, densidad_g_por_ml, peso_unitario_gramos').eq('restaurante_id', perfil.restaurante_id).in('id', productIds)
  const mapa = new Map((productos ?? []).map((producto) => [producto.id, producto]))
  if (mapa.size !== new Set(productIds).size) return errorJSON('Uno o más productos no pertenecen al restaurante.', 400)
  const filas = validItems.map((item) => {
    const producto = mapa.get(item.producto_id as string)
    const cantidad = Number(item.cantidad)
    const unidad = String(item.unidad_medida ?? producto?.unidad_medida)
    const conversion = convertirAGramos(cantidad, unidad as UnidadEntrada, producto?.densidad_g_por_ml ?? undefined, producto?.peso_unitario_gramos ?? undefined)
    return { producto_id: item.producto_id, cantidad, unidad_medida: unidad, cantidad_gramos: conversion.gramos, precio_unitario: Number(item.precio_unitario ?? 0), precio_total: Number(item.precio_total ?? (Number(item.cantidad) * Number(item.precio_unitario ?? 0))), notas: typeof item.notas === 'string' ? item.notas : null }
  })
  if (filas.some((item) => !Number.isFinite(item.cantidad) || item.cantidad <= 0 || item.cantidad_gramos === null)) return errorJSON('Cantidad o unidad inválida en la compra.', 400)
  const total = filas.reduce((sum, item) => sum + item.precio_total, 0)
  const { data: compra, error: compraError } = await supabase.from('compras').insert({ restaurante_id: perfil.restaurante_id, proveedor_id: typeof raw.proveedor_id === 'string' ? raw.proveedor_id : null, fecha_compra: typeof raw.fecha_compra === 'string' ? raw.fecha_compra : new Date().toISOString().slice(0, 10), numero_factura: typeof raw.numero_factura === 'string' ? raw.numero_factura : null, total_compra: total, estado: 'confirmada', registrado_por: perfil.id, notas: typeof raw.notas === 'string' ? raw.notas : null }).select().single()
  if (compraError || !compra) return errorJSON('No se pudo crear la compra.', 500)
  const { error: itemsError } = await supabase.from('compras_items').insert(filas.map((item) => ({ ...item, compra_id: compra.id })))
  if (itemsError) return errorJSON('La compra se creó, pero sus ítems no pudieron guardarse.', 500)
  return NextResponse.json({ data: compra, error: null }, { status: 201 })
}
