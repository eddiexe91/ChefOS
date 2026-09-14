import { NextResponse } from 'next/server'
import { crearClienteServidor, crearClienteAdmin } from '@/lib/supabase/servidor'

const ROLES = ['administrador', 'chef_ejecutivo', 'chef_cocina', 'cocinero'] as const

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador'].includes(perfil.rol)) return NextResponse.json({ error: 'Solo el dueño o administrador puede invitar al equipo.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { email?: unknown; nombre?: unknown; rol?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''
  const rol = typeof body?.rol === 'string' && ROLES.includes(body.rol as (typeof ROLES)[number]) ? body.rol : 'cocinero'
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })
  const admin = crearClienteAdmin()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://chefos-pied.vercel.app').replace(/\/$/, '')
  const { data: invitado, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${appUrl}/auth/callback?next=/dashboard`, data: { nombre, restaurante_id: perfil.restaurante_id, rol } })
  if (inviteError || !invitado.user) return NextResponse.json({ error: 'No se pudo enviar la invitación. Revisa la configuración de correo.' }, { status: 502 })
  const id = invitado.user.id
  // El trigger de registro puede ejecutarse inmediatamente después de la invitación.
  // Dejamos el perfil asociado al restaurante actual y conservamos la membresía.
  await admin.from('usuarios').update({ restaurante_id: perfil.restaurante_id, nombre: nombre || email.split('@')[0], email, rol, activo: true }).eq('id', id)
  await admin.from('usuarios_restaurantes').upsert({ usuario_id: id, restaurante_id: perfil.restaurante_id, rol, activo: true })
  return NextResponse.json({ ok: true })
}
