import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo, rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador', 'chef_ejecutivo'].includes(perfil.rol)) return NextResponse.json({ data: null, error: 'Sin permisos.' }, { status: 403 })
  const { data: compra, error } = await supabase.rpc('recibir_compra_completa', { p_compra_id: params.id, p_usuario_id: perfil.id })
  if (error || !compra) return NextResponse.json({ data: null, error: 'No se pudo recibir la compra ni actualizar el inventario.' }, { status: 500 })
  return NextResponse.json({ data: Array.isArray(compra) ? compra[0] : compra, error: null })
}
