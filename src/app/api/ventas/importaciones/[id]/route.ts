import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 })
  const { data: importacion } = await supabase.from('ventas_importaciones').select('*').eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).single()
  if (!importacion) return NextResponse.json({ error: 'Importación no encontrada.' }, { status: 404 })
  const [{ data: items }, { data: recetas }] = await Promise.all([
    supabase.from('ventas_items').select('id,nombre_original,nombre_normalizado,confianza_match,requiere_revision,cantidad_vendida,total,receta_id').eq('importacion_id', params.id).eq('restaurante_id', perfil.restaurante_id).order('nombre_original'),
    supabase.from('recetas').select('id,nombre').eq('restaurante_id', perfil.restaurante_id).eq('activa', true).order('nombre'),
  ])
  return NextResponse.json({ data: { importacion, items: items ?? [], recetas: recetas ?? [] } })
}
