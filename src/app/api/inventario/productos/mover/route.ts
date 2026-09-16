import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id,rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño','administrador','chef_ejecutivo','chef_cocina'].includes(perfil.rol)) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { ids?: string[]; tipo_operativo?: string } | null
  const ids = [...new Set((body?.ids ?? []).filter(Boolean))]
  if (!ids.length || !['materia_prima','insumo','elaborado'].includes(body?.tipo_operativo ?? '')) return NextResponse.json({ error: 'Selección inválida.' }, { status: 400 })
  const { data, error } = await supabase.from('productos').update({ tipo_operativo: body!.tipo_operativo }).in('id', ids).eq('restaurante_id', perfil.restaurante_id).select('id,nombre')
  if (error) return NextResponse.json({ error: 'No se pudieron mover los productos.' }, { status: 500 })
  await supabase.from('actividad_operativa').insert((data ?? []).map((producto) => ({ restaurante_id: perfil.restaurante_id, usuario_id: user.id, accion: 'editar_producto', entidad_id: producto.id, descripcion: `${user.email ?? 'Usuario'} movió ${producto.nombre} a ${body!.tipo_operativo === 'elaborado' ? 'Stock disponible' : 'Inventario'}`, datos: { tipo_operativo: body!.tipo_operativo } })))
  return NextResponse.json({ movidos: data?.length ?? 0 })
}
