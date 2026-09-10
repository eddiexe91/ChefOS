import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil) return NextResponse.json({ data: null, error: 'Usuario no encontrado.' }, { status: 401 })
  const { data, error } = await supabase.from('produccion_lotes').update({ estado: 'completado', completado_en: new Date().toISOString() }).eq('id', params.id).eq('restaurante_id', perfil.restaurante_id).eq('estado', 'en_progreso').select().single()
  if (error || !data) return NextResponse.json({ data: null, error: 'El lote no existe o ya está cerrado.' }, { status: 409 })
  return NextResponse.json({ data, error: null })
}
