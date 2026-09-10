import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const TURNOS = ['mañana', 'tarde', 'noche'] as const

function errorJSON(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status })
}

async function obtenerPerfil() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, perfil: null }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, activo').eq('id', user.id).eq('activo', true).single()
  return { supabase, perfil }
}

export async function GET() {
  const { supabase, perfil } = await obtenerPerfil()
  if (!perfil) return errorJSON('No autenticado.', 401)
  const { data, error } = await supabase.from('produccion_lotes').select('*, responsable:usuarios(id, nombre)').eq('restaurante_id', perfil.restaurante_id).order('fecha', { ascending: false }).order('turno', { ascending: true })
  if (error) return errorJSON('No se pudieron cargar los lotes.', 500)
  return NextResponse.json({ data: data ?? [], error: null })
}

export async function POST(request: NextRequest) {
  const { supabase, perfil } = await obtenerPerfil()
  if (!perfil) return errorJSON('No autenticado.', 401)
  let body: unknown
  try { body = await request.json() } catch { return errorJSON('Body inválido.', 400) }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return errorJSON('El body debe ser un objeto.', 400)
  const raw = body as Record<string, unknown>
  const turno = raw.turno
  if (typeof turno !== 'string' || !TURNOS.includes(turno as typeof TURNOS[number])) return errorJSON('turno inválido.', 400)
  const fecha = typeof raw.fecha === 'string' && raw.fecha ? raw.fecha : new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.from('produccion_lotes').upsert({ restaurante_id: perfil.restaurante_id, fecha, turno, responsable_id: perfil.id, notas: typeof raw.notas === 'string' ? raw.notas : null }, { onConflict: 'restaurante_id,fecha,turno' }).select().single()
  if (error) return errorJSON('No se pudo abrir el lote.', 409)
  return NextResponse.json({ data, error: null }, { status: 201 })
}
