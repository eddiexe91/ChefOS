import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { convertirAGramos, type UnidadEntrada } from '@/types'

const UNIDADES: readonly UnidadEntrada[] = ['g','kg','mg','oz','lb','lt','ml','cl','unidad','docena','caja','bandeja','porcion']
const ROLES = ['dueño','administrador','chef_ejecutivo','chef_cocina']
const errorJSON = (error: string, status: number) => NextResponse.json({ data: null, error }, { status })

async function contexto() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: errorJSON('No autenticado.', 401) }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return { supabase, error: errorJSON('Usuario no encontrado o inactivo.', 401) }
  if (!ROLES.includes(perfil.rol)) return { supabase, error: errorJSON('No tienes permisos para modificar productos.', 403) }
  return { supabase, user, perfil }
}

function valores(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const unidad = typeof body.unidad_medida === 'string' ? body.unidad_medida.trim().toLowerCase() : ''
  const stock = Number(body.stock ?? 0), minimo = Number(body.stock_minimo ?? 0), costo = Number(body.costo_unitario ?? 0)
  const densidad = body.densidad_g_por_ml == null ? undefined : Number(body.densidad_g_por_ml)
  const peso = body.peso_unitario_gramos == null ? undefined : Number(body.peso_unitario_gramos)
  const categoriaId = typeof body.categoria_id === 'string' && body.categoria_id.trim() !== '' ? body.categoria_id.trim() : null
  if (!nombre || !UNIDADES.includes(unidad as UnidadEntrada)) throw new Error('Nombre y unidad válida son obligatorios.')
  if (![stock,minimo,costo].every(Number.isFinite) || stock < 0 || minimo < 0 || costo < 0) throw new Error('Stock, mínimo y costo deben ser números válidos.')
  if (densidad !== undefined && (!Number.isFinite(densidad) || densidad <= 0)) throw new Error('La densidad debe ser positiva.')
  if (peso !== undefined && (!Number.isFinite(peso) || peso <= 0)) throw new Error('El peso unitario debe ser positivo.')
  const sg = convertirAGramos(stock, unidad as UnidadEntrada, densidad, peso), mg = convertirAGramos(minimo, unidad as UnidadEntrada, densidad, peso)
  if (sg.gramos === null || mg.gramos === null) throw new Error('Para unidades, cajas o bandejas debes indicar el peso unitario en gramos.')
  return { nombre, unidad, stock, minimo, costo, densidad, peso, categoriaId, stockGramos: sg.gramos, minimoGramos: mg.gramos }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await contexto(); if ('error' in ctx) return ctx.error
  const id = params.id; const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return errorJSON('Body inválido.', 400)
  try {
    const v = valores(body)
    if (v.categoriaId) {
      const { data: categoria } = await ctx.supabase.from('categorias_producto').select('id').eq('id', v.categoriaId).eq('restaurante_id', ctx.perfil.restaurante_id).eq('activa', true).maybeSingle()
      if (!categoria) return errorJSON('La categoría seleccionada no es válida.', 400)
    }
    const { data: anterior } = await ctx.supabase.from('productos').select('nombre, stock_actual, costo_unitario_actual, categoria_id').eq('id', id).eq('restaurante_id', ctx.perfil.restaurante_id).single()
    if (!anterior) return errorJSON('Producto no encontrado.', 404)
    const { data, error } = await ctx.supabase.from('productos').update({ nombre:v.nombre, nombre_normalizado:v.nombre.toLowerCase(), unidad_medida:v.unidad, unidad_compra:v.unidad, unidad_display:v.unidad, costo_unitario_actual:v.costo, stock_actual:v.stock, stock_minimo:v.minimo, cantidad_gramos:v.stockGramos, stock_minimo_gramos:v.minimoGramos, densidad_g_por_ml:v.densidad ?? null, peso_unitario_gramos:v.peso ?? null, categoria_id: v.categoriaId }).eq('id', id).eq('restaurante_id', ctx.perfil.restaurante_id).select().single()
    if (error || !data) return errorJSON('No se pudo actualizar el producto.', 500)
    await ctx.supabase.from('actividad_operativa').insert({ restaurante_id:ctx.perfil.restaurante_id, usuario_id:ctx.user.id, accion:'editar_producto', entidad_id:id, descripcion:`${ctx.user.email ?? 'Usuario'} editó el producto ${v.nombre}`, datos:{ antes: anterior, despues: v } })
    return NextResponse.json({ data, error:null })
  } catch (e) { return errorJSON(e instanceof Error ? e.message : 'Datos inválidos.', 400) }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await contexto(); if ('error' in ctx) return ctx.error
  const id = params.id
  const { data: producto } = await ctx.supabase.from('productos').select('nombre').eq('id', id).eq('restaurante_id', ctx.perfil.restaurante_id).single()
  if (!producto) return errorJSON('Producto no encontrado.', 404)
  const { error } = await ctx.supabase.from('productos').update({ activo:false }).eq('id', id).eq('restaurante_id', ctx.perfil.restaurante_id)
  if (error) return errorJSON('No se pudo eliminar el producto.', 500)
  await ctx.supabase.from('actividad_operativa').insert({ restaurante_id:ctx.perfil.restaurante_id, usuario_id:ctx.user.id, accion:'eliminar_producto', entidad_id:id, descripcion:`${ctx.user.email ?? 'Usuario'} eliminó el producto ${producto.nombre}`, datos:{ nombre: producto.nombre } })
  return NextResponse.json({ ok:true })
}
