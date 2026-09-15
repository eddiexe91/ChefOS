import { NextResponse } from 'next/server'

import { crearClienteAdmin, crearClienteServidor } from '@/lib/supabase/servidor'

const ROLES = ['dueño', 'administrador', 'chef_ejecutivo', 'chef_cocina', 'cocinero'] as const
const ZONAS = ['America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Lima', 'America/Bogota', 'America/Mexico_City', 'Europe/Madrid'] as const

export async function POST(request: Request) {
  const supabase = crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('id, restaurante_id, rol, activo').eq('id', user.id).eq('activo', true).single()
  if (!perfil || !['dueño', 'administrador'].includes(perfil.rol)) {
    return NextResponse.json({ error: 'Sin permisos para configurar el restaurante.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    nombre?: unknown
    rol?: unknown
    zona_horaria?: unknown
    paso_actual?: unknown
    inventario_confirmado?: unknown
    stock_confirmado?: unknown
    completar?: unknown
    confirmar_incompleto?: unknown
  } | null

  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''
  const rol = typeof body?.rol === 'string' && ROLES.includes(body.rol as (typeof ROLES)[number]) ? body.rol : perfil.rol
  const zona = typeof body?.zona_horaria === 'string' && ZONAS.includes(body.zona_horaria as (typeof ZONAS)[number]) ? body.zona_horaria : 'America/Santiago'
  const pasoActual = typeof body?.paso_actual === 'number' && Number.isInteger(body.paso_actual) ? Math.max(0, body.paso_actual) : 0
  const inventarioConfirmado = body?.inventario_confirmado === true
  const stockConfirmado = body?.stock_confirmado === true
  const completar = body?.completar === true
  const confirmarIncompleto = body?.confirmar_incompleto === true
  if (!nombre) return NextResponse.json({ error: 'El nombre del restaurante es obligatorio.' }, { status: 400 })

  const admin = crearClienteAdmin()
  const { data: restaurante } = await admin.from('restaurantes').select('config, onboarding_completado').eq('id', perfil.restaurante_id).single()
  const { data: productos } = await admin.from('productos').select('tipo_operativo').eq('restaurante_id', perfil.restaurante_id).eq('activo', true)

  const cantidadInventario = (productos ?? []).filter((producto) => producto.tipo_operativo === 'materia_prima' || producto.tipo_operativo === 'insumo').length
  const cantidadStock = (productos ?? []).filter((producto) => producto.tipo_operativo === 'elaborado').length
  const tieneInventario = cantidadInventario > 0
  const tieneStock = cantidadStock > 0

  if (completar && !confirmarIncompleto && (!tieneInventario || !tieneStock)) {
    return NextResponse.json({
      error: 'No puedes completar el onboarding sin Inventario y Stock disponible. Puedes confirmar explícitamente si deseas continuar.',
      estado: {
        cantidadInventario,
        cantidadStock,
        onboarding_completo: false,
      },
    }, { status: 409 })
  }

  const configActual = typeof restaurante?.config === 'object' && restaurante.config !== null ? restaurante.config as Record<string, unknown> : {}
  const onboardingActual = typeof configActual.onboarding === 'object' && configActual.onboarding !== null
    ? configActual.onboarding as Record<string, unknown>
    : {}

  const onboarding = {
    ...onboardingActual,
    paso_actual: pasoActual,
    inventario_confirmado: inventarioConfirmado || tieneInventario,
    stock_confirmado: stockConfirmado || tieneStock,
    completo: completar ? (tieneInventario && tieneStock) || confirmarIncompleto : Boolean(onboardingActual.completo),
    confirmacion_incompleta: completar ? confirmarIncompleto : Boolean(onboardingActual.confirmacion_incompleta),
    cantidades: {
      inventario: cantidadInventario,
      stock_disponible: cantidadStock,
    },
    actualizado_en: new Date().toISOString(),
  }

  const { error: restauranteError } = await admin
    .from('restaurantes')
    .update({
      nombre,
      zona_horaria: zona,
      onboarding_completado: onboarding.completo,
      config: {
        ...configActual,
        onboarding,
      },
    })
    .eq('id', perfil.restaurante_id)

  if (restauranteError) return NextResponse.json({ error: 'No se pudo guardar la configuración del restaurante.' }, { status: 500 })

  const { error: perfilError } = await admin.from('usuarios').update({ rol }).eq('id', user.id).eq('restaurante_id', perfil.restaurante_id)
  if (perfilError) return NextResponse.json({ error: 'No se pudo guardar tu cargo.' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    estado: {
      cantidadInventario,
      cantidadStock,
      onboarding,
    },
  })
}
