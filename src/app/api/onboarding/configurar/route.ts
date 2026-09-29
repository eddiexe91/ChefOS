import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  // The RPC derives the tenant from the authenticated user and never changes roles.
  const { data, error } = await supabase.rpc('guardar_configuracion_inicial', { p_datos: body })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, estado: data }, { headers: { 'Cache-Control': 'no-store' } })
}
