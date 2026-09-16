import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(request: Request) {
  const db = crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
  const { data: perfil } = await db.from('usuarios').select('restaurante_id,rol').eq('id',user.id).eq('activo',true).single()
  if (!perfil || !['dueño','administrador','chef_ejecutivo'].includes(perfil.rol)) return NextResponse.json({ error: 'Solo la dirección de la cocina puede crear claves.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const roles = perfil.rol === 'chef_ejecutivo' ? ['chef_cocina','cocinero'] : ['administrador','chef_ejecutivo','chef_cocina','cocinero']
  if (!roles.includes(body?.rol)) return NextResponse.json({ error: 'Selecciona un rol permitido.' }, { status: 400 })
  const { data: clave, error } = await db.rpc('crear_clave_equipo', { p_rol: body.rol })
  if (error) return NextResponse.json({ error: 'No se pudo crear la clave de equipo.' }, { status: 500 })
  return NextResponse.json({ clave }, { headers: { 'Cache-Control': 'no-store' } })
}
