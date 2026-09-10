import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ data: null, error: 'Usuario no encontrado.' }, { status: 401 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ data: null, error: 'Body inválido.' }, { status: 400 }) }
  const porciones = typeof body === 'object' && body !== null && 'porciones_objetivo' in body ? (body as { porciones_objetivo: unknown }).porciones_objetivo : null
  if (typeof porciones !== 'number' || !Number.isInteger(porciones) || porciones <= 0) return NextResponse.json({ data: null, error: 'porciones_objetivo debe ser un entero positivo.' }, { status: 400 })
  const { data: receta } = await supabase.from('recetas').select('id').eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).single()
  if (!receta) return NextResponse.json({ data: null, error: 'Receta no encontrada.' }, { status: 404 })
  const { data, error } = await supabase.rpc('escalar_receta', { p_receta_id: params.id, p_porciones_objetivo: porciones })
  if (error) return NextResponse.json({ data: null, error: 'No se pudo escalar la receta.' }, { status: 500 })
  return NextResponse.json({ data: data ?? [], error: null })
}
