import { NextResponse } from 'next/server'
import { crearClienteServidor, crearClienteAdmin } from '@/lib/supabase/servidor'

const ROLES = ['dueño', 'administrador', 'chef_ejecutivo', 'chef_cocina', 'cocinero'] as const
const ZONAS = ['America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Lima', 'America/Bogota', 'America/Mexico_City', 'Europe/Madrid'] as const

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador'].includes(perfil.rol)) return NextResponse.json({ error: 'Sin permisos para configurar el restaurante.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { nombre?: unknown; rol?: unknown; zona_horaria?: unknown } | null
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''
  const rol = typeof body?.rol === 'string' && ROLES.includes(body.rol as (typeof ROLES)[number]) ? body.rol : perfil.rol
  const zona = typeof body?.zona_horaria === 'string' && ZONAS.includes(body.zona_horaria as (typeof ZONAS)[number]) ? body.zona_horaria : 'America/Santiago'
  if (!nombre) return NextResponse.json({ error: 'El nombre del restaurante es obligatorio.' }, { status: 400 })
  const admin = crearClienteAdmin()
  const { error: restauranteError } = await admin.from('restaurantes').update({ nombre, zona_horaria: zona, onboarding_completado: true }).eq('id', perfil.restaurante_id)
  if (restauranteError) return NextResponse.json({ error: 'No se pudo guardar la identidad del restaurante.' }, { status: 500 })
  const { error: perfilError } = await admin.from('usuarios').update({ rol }).eq('id', user.id).eq('restaurante_id', perfil.restaurante_id)
  if (perfilError) return NextResponse.json({ error: 'No se pudo guardar tu cargo.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
