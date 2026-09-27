import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

// One transaction owns validation, children, costs and audit. No partial fallback.
export async function guardarReceta(request: Request, recetaId: string | null) {
  const db = crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  const fail = (error: string, status: number) => NextResponse.json({ data: null, error }, { status })
  if (!user) return fail('No autenticado.', 401)
  const { data: perfil } = await db.from('usuarios').select('restaurante_id,rol').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'chef_ejecutivo', 'chef_cocina'].includes(perfil.rol)) return fail('No tienes permisos para guardar recetas.', 403)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Datos inválidos.', 400)
  if (typeof body.nombre !== 'string' || !body.nombre.trim() || !Number.isInteger(body.rendimiento_porciones) || body.rendimiento_porciones <= 0) return fail('Completa el nombre y un rendimiento positivo.', 400)
  if (!Array.isArray(body.ingredientes) || !body.ingredientes.length || !Array.isArray(body.pasos)) return fail('Completa ingredientes y elaboración.', 400)
  if (!/^[0-9a-f-]{36}$/i.test(body.solicitud_id ?? '')) return fail('Falta el identificador de guardado. Vuelve a abrir el editor.', 400)
  const { data, error } = await db.rpc('guardar_receta_atomica', {
    p_restaurante_id: perfil.restaurante_id, p_usuario_id: user.id,
    p_receta_id: recetaId, p_datos: body,
  })
  if (error) {
    console.error('[guardar-receta]', error.code, error.message)
    if (error.code === 'PGRST202' || error.code === '42883') return fail('El guardado seguro necesita activar la migración 016. No se guardó ningún cambio.', 503)
    if (error.code === 'P0001') return fail(error.message, 400)
    return fail('No se pudo confirmar el guardado. Conserva el formulario y revisa la receta antes de repetir. Reintentar sin cambios mantiene el mismo identificador.', 500)
  }
  return NextResponse.json({ data: Array.isArray(data) ? data[0] : data, error: null }, { status: recetaId ? 200 : 201 })
}
