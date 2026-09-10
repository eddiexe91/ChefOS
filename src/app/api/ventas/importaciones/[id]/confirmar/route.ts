import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ data: null, error: 'Usuario no encontrado.' }, { status: 401 })
  const { data: importacion } = await supabase.from('ventas_importaciones').select('id').eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).single()
  if (!importacion) return NextResponse.json({ data: null, error: 'Importación no encontrada.' }, { status: 404 })
  const { data, error } = await supabase.rpc('descontar_inventario_por_ventas', { p_importacion_id: params.id, p_usuario_id: perfil.id })
  if (error) return NextResponse.json({ data: null, error: 'No se pudo descontar el inventario.' }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
