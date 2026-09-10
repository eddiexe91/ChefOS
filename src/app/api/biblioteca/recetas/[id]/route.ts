import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const ROLES = ['dueño', 'chef_ejecutivo', 'chef_cocina']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !ROLES.includes(perfil.rol)) return NextResponse.json({ error: 'No tienes permisos para editar recetas.' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const rendimiento = Number(body.rendimiento_porciones)
  if (!nombre || !Number.isInteger(rendimiento) || rendimiento <= 0) return NextResponse.json({ error: 'Nombre y rendimiento válidos son obligatorios.' }, { status: 400 })
  const update = {
    nombre,
    descripcion: typeof body.descripcion === 'string' && body.descripcion.trim() ? body.descripcion.trim() : null,
    categoria_id: typeof body.categoria_id === 'string' && body.categoria_id ? body.categoria_id : null,
    rendimiento_porciones: rendimiento,
    unidad_rendimiento: typeof body.unidad_rendimiento === 'string' && body.unidad_rendimiento.trim() ? body.unidad_rendimiento.trim() : 'porción',
    precio_venta: body.precio_venta == null || body.precio_venta === '' ? null : Number(body.precio_venta),
    tiempo_preparacion: body.tiempo_preparacion == null || body.tiempo_preparacion === '' ? null : Number(body.tiempo_preparacion),
    dificultad: typeof body.dificultad === 'string' && body.dificultad ? body.dificultad : null,
    en_carta: body.en_carta !== false,
    es_produccion: body.es_produccion === true,
    cambios_descripcion_temp: typeof body.cambios_descripcion_temp === 'string' ? body.cambios_descripcion_temp.trim() || null : null,
    actualizado_en: new Date().toISOString(),
  }
  if (!Number.isFinite(update.precio_venta ?? 0) || !Number.isFinite(update.tiempo_preparacion ?? 0)) return NextResponse.json({ error: 'Precio o tiempo inválido.' }, { status: 400 })
  const { data, error } = await supabase.from('recetas').update(update).eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).select('*').single()
  if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar la receta.' }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
