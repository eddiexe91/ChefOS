import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id,restaurante_id,rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño','administrador','chef_ejecutivo'].includes(perfil.rol)) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { ids?: string[]; accion?: 'sumar' | 'omitir' } | null
  const ids = [...new Set(body?.ids ?? [])]
  if (ids.length < 2 || !['sumar','omitir'].includes(body?.accion ?? '')) return NextResponse.json({ error: 'Grupo duplicado inválido.' }, { status: 400 })
  const { data: productos } = await supabase.from('productos').select('id,nombre,stock_actual,cantidad_gramos').in('id', ids).eq('restaurante_id', perfil.restaurante_id).eq('activo', true).order('creado_en', { ascending: true })
  if (!productos || productos.length < 2) return NextResponse.json({ error: 'No se encontraron duplicados activos.' }, { status: 404 })
  const principal = productos[0]
  const copias = productos.slice(1)
  if (body!.accion === 'sumar') {
    await supabase.from('productos').update({ stock_actual: productos.reduce((suma, item) => suma + Number(item.stock_actual ?? 0), 0), cantidad_gramos: productos.reduce((suma, item) => suma + Number(item.cantidad_gramos ?? 0), 0) }).eq('id', principal.id).eq('restaurante_id', perfil.restaurante_id)
  }
  const { error } = await supabase.from('productos').update({ activo: false }).in('id', copias.map((item) => item.id)).eq('restaurante_id', perfil.restaurante_id)
  if (error) return NextResponse.json({ error: 'No se pudieron resolver los duplicados.' }, { status: 500 })
  await supabase.from('actividad_operativa').insert({ restaurante_id: perfil.restaurante_id, usuario_id: user.id, accion: 'editar_producto', entidad_id: principal.id, descripcion: `${user.email ?? 'Usuario'} resolvió ${productos.length} duplicados de ${principal.nombre}`, datos: { accion: body!.accion, archivados: copias.length } })
  return NextResponse.json({ principal: principal.id, archivados: copias.length })
}
