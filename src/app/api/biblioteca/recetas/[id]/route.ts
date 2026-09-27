import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { guardarReceta } from '@/lib/recetaGuardado'
export const PATCH = (request: Request, { params }: { params: { id: string } }) => guardarReceta(request, params.id)

async function obtenerContexto() {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: errorJSON('No autenticado.', 401) }
  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'chef_ejecutivo', 'chef_cocina'].includes(perfil.rol)) return { supabase, error: errorJSON('No tienes permisos para editar recetas.', 403) }
  return { supabase, user, perfil }
}


const errorJSON = (error: string, status: number) => NextResponse.json({ data: null, error }, { status })

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await obtenerContexto()
  if ('error' in ctx) return ctx.error

  const { data: receta } = await ctx.supabase
    .from('recetas')
    .select('id, nombre, en_carta')
    .eq('id', params.id)
    .eq('restaurante_id', ctx.perfil.restaurante_id)
    .single()
  if (!receta) return errorJSON('Receta no encontrada.', 404)

  const { error } = await ctx.supabase
    .from('recetas')
    .update({ activa: false, actualizado_en: new Date().toISOString() })
    .eq('id', params.id)
    .eq('restaurante_id', ctx.perfil.restaurante_id)
  if (error) return errorJSON('No se pudo archivar la receta.', 500)

  await ctx.supabase.from('actividad_operativa').insert({
    restaurante_id: ctx.perfil.restaurante_id,
    usuario_id: ctx.user.id,
    accion: receta.en_carta ? 'archivar_carta' : 'archivar_receta',
    entidad_tipo: receta.en_carta ? 'carta' : 'receta',
    entidad_id: params.id,
    descripcion: `${ctx.user.email ?? 'Usuario'} archivó ${receta.en_carta ? 'el plato' : 'la receta'} ${receta.nombre}`,
    datos: { receta_id: params.id, nombre: receta.nombre },
  })

  return NextResponse.json({ ok: true })
}
