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
  const factor = typeof body === 'object' && body !== null && 'factor' in body ? (body as { factor: unknown }).factor : null
  if (factor !== null && (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0 || factor > 1000)) return NextResponse.json({ error: 'Indica un factor mayor que 0 y hasta 1000.' }, { status: 400 })
  if (factor === null && (typeof porciones !== 'number' || !Number.isInteger(porciones) || porciones <= 0)) return NextResponse.json({ data: null, error: 'Indica un factor o rendimiento objetivo válido.' }, { status: 400 })
  const { data: receta } = await supabase.from('recetas').select('id,rendimiento_porciones,unidad_rendimiento').eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).single()
  if (!receta) return NextResponse.json({ data: null, error: 'Receta no encontrada.' }, { status: 404 })
  if (typeof factor === 'number') {
    // Read-only scaling. Existing RLS guards ingredient/product tenant access.
    const { data: ingredientes, error } = await supabase.from('recetas_ingredientes').select('cantidad,unidad_medida,producto:productos(nombre)').eq('receta_id', receta.id).order('orden')
    if (error) return NextResponse.json({ error: 'No se pudieron cargar los ingredientes.' }, { status: 500 })
    return NextResponse.json({ data: (ingredientes ?? []).map(i => ({ nombre: (Array.isArray(i.producto) ? i.producto[0] : i.producto)?.nombre ?? 'Producto no disponible', cantidad: Number(i.cantidad) * factor, unidad_medida: i.unidad_medida })), rendimiento: Number(receta.rendimiento_porciones) * factor, unidad: receta.unidad_rendimiento, factor })
  }
  const { data, error } = await supabase.rpc('escalar_receta', { p_receta_id: params.id, p_porciones_objetivo: porciones })
  if (error) return NextResponse.json({ data: null, error: 'No se pudo escalar la receta.' }, { status: 500 })
  return NextResponse.json({ data: data ?? [], error: null })
}
