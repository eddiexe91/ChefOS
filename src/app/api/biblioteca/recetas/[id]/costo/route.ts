import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ data: null, error: 'Usuario no encontrado.' }, { status: 401 })
  const { data: receta } = await supabase.from('recetas').select('id').eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).single()
  if (!receta) return NextResponse.json({ data: null, error: 'Receta no encontrada.' }, { status: 404 })
  const { data, error } = await supabase.rpc('recalcular_costo_receta', { p_receta_id: params.id })
  if (error) return NextResponse.json({ data: null, error: 'No se pudo recalcular el costo.' }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
