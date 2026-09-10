import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('restaurante_id, rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador'].includes(perfil.rol)) return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { receta_id?: string | null; nombre_normalizado?: string | null }
  const { data, error } = await supabase.from('ventas_items').update({ receta_id: body.receta_id ?? null, nombre_normalizado: body.nombre_normalizado ?? null, confianza_match: body.receta_id ? 1 : 0, requiere_revision: !body.receta_id }).eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).select('id, receta_id, nombre_normalizado, confianza_match, requiere_revision').single()
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la coincidencia.' }, { status: 500 })
  return NextResponse.json({ data })
}
