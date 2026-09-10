/**
 * src/app/api/mermas/route.ts
 *
 * API Route — Registrar una merma de inventario.
 *
 * POST /api/mermas
 *
 * Flujo:
 * 1. Autenticar usuario via sesión Supabase.
 * 2. Obtener perfil del usuario (id, restaurante_id, activo).
 * 3. Validar el body de la request.
 * 4. Verificar que el producto exista y pertenezca al restaurante.
 * 5. Convertir la cantidad ingresada a gramos vía convertirAGramos().
 * 6. Insertar en mermas (trigger_costo_merma calcula costo_merma).
 * 7. Insertar en inventario_movimientos (tipo='merma'); trigger_sincronizar_stock
 *    calcula cantidad/cantidad_antes/cantidad_despues (gramos y unidad de
 *    visualización) y actualiza productos.cantidad_gramos.
 * 8. Retornar la merma creada con status 201.
 *
 * TODO:
 * Los pasos 6 y 7 son dos INSERT secuenciales, no una transacción atómica
 * (no existe RPC documentada para mermas). Reemplazar por una RPC
 * registrar_merma_completa() atómica cuando se confirme su firma exacta,
 * siguiendo el mismo criterio ya aplicado en produccion/route.ts.
 *
 * Convención de respuesta:
 * { data: T | null, error: string | null }
 */

import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor }           from '@/lib/supabase/servidor'

import {
  convertirAGramos,
  type MotivaMerma,
  type UnidadEntrada,
} from '@/types/index'

// ─────────────────────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────────────────────

const MOTIVOS_VALIDOS: readonly MotivaMerma[] = [
  'sobreproduccion',
  'error_coccion',
  'vencimiento',
  'manipulacion',
  'accidente',
  'otro',
]

const UNIDADES_VALIDAS: readonly UnidadEntrada[] = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'lt', 'ml', 'cl',
  'unidad', 'docena', 'caja', 'bandeja', 'porcion',
]

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface BodyMerma {
  producto_id:    string
  cantidad:       number
  unidad_medida:  UnidadEntrada
  motivo:         MotivaMerma
  responsable_id: string | null
  notas:          string | null
}

// ─────────────────────────────────────────────────────────────
// Helper — respuesta de error
// ─────────────────────────────────────────────────────────────

function errorJSON(mensaje: string, status: number) {
  return NextResponse.json(
    { data: null, error: mensaje },
    { status }
  )
}

// ─────────────────────────────────────────────────────────────
// POST /api/mermas
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = crearClienteServidor()

  // ── 1. Autenticación ───────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorJSON('No autenticado.', 401)
  }

  // ── 2. Perfil del usuario ──────────────────────────────────
  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios')
    .select('id, restaurante_id, activo')
    .eq('id', user.id)
    .eq('activo', true)
    .single()

  if (perfilError || !perfil) {
    return errorJSON('Usuario no encontrado o inactivo.', 401)
  }

  // ── 3. Parsear y validar body ──────────────────────────────
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorJSON('Body inválido — se esperaba JSON.', 400)
  }

  // Verificar que body sea un objeto no nulo antes de cualquier cast
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorJSON('El body debe ser un objeto JSON.', 400)
  }

  // Cast seguro: body ya fue verificado como objeto no nulo y no array
  const raw = body as Record<string, unknown>

  // Validar campos obligatorios
  if (!('producto_id' in raw) || !('cantidad' in raw) || !('unidad_medida' in raw) || !('motivo' in raw)) {
    return errorJSON(
      'Campos obligatorios faltantes: producto_id, cantidad, unidad_medida, motivo.',
      400
    )
  }

  if (typeof raw.producto_id !== 'string' || raw.producto_id.trim() === '') {
    return errorJSON('producto_id debe ser un string no vacío.', 400)
  }

  if (typeof raw.cantidad !== 'number' || raw.cantidad <= 0) {
    return errorJSON('cantidad debe ser un número mayor que 0.', 400)
  }

  if (
    typeof raw.unidad_medida !== 'string' ||
    !UNIDADES_VALIDAS.includes(raw.unidad_medida as UnidadEntrada)
  ) {
    return errorJSON(
      `unidad_medida debe ser una de: ${UNIDADES_VALIDAS.join(', ')}.`,
      400
    )
  }

  if (
    typeof raw.motivo !== 'string' ||
    !MOTIVOS_VALIDOS.includes(raw.motivo as MotivaMerma)
  ) {
    return errorJSON(
      `motivo debe ser uno de: ${MOTIVOS_VALIDOS.join(', ')}.`,
      400
    )
  }

  // Validar campos opcionales si están presentes
  if (
    'responsable_id' in raw &&
    raw.responsable_id !== null &&
    raw.responsable_id !== undefined &&
    typeof raw.responsable_id !== 'string'
  ) {
    return errorJSON('responsable_id debe ser un string o null.', 400)
  }

  if (
    'notas' in raw &&
    raw.notas !== null &&
    raw.notas !== undefined &&
    typeof raw.notas !== 'string'
  ) {
    return errorJSON('notas debe ser un string o null.', 400)
  }

  // Construcción del body completamente validado
  const datos: BodyMerma = {
    producto_id:    raw.producto_id.trim(),
    cantidad:       raw.cantidad,
    unidad_medida:  raw.unidad_medida as UnidadEntrada,
    motivo:         raw.motivo as MotivaMerma,
    responsable_id:
      typeof raw.responsable_id === 'string' && raw.responsable_id.trim() !== ''
        ? raw.responsable_id.trim()
        : null,
    notas:
      typeof raw.notas === 'string' && raw.notas.trim() !== ''
        ? raw.notas.trim()
        : null,
  }

  // ── 4. Verificar producto ───────────────────────────────────
  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('id, restaurante_id, costo_unitario_actual, costo_por_gramo, densidad_g_por_ml, peso_unitario_gramos')
    .eq('id', datos.producto_id)
    .single()

  if (productoError || !producto) {
    return errorJSON('Producto no encontrado.', 404)
  }

  // Verificación explícita de tenant — defensa en profundidad sobre RLS
  if (producto.restaurante_id !== perfil.restaurante_id) {
    return errorJSON('Sin autorización para registrar mermas sobre este producto.', 403)
  }

  // ── 5. Convertir cantidad a gramos ──────────────────────────
  const conversion = convertirAGramos(
    datos.cantidad,
    datos.unidad_medida,
    producto.densidad_g_por_ml ?? undefined,
    producto.peso_unitario_gramos ?? undefined
  )

  const gramos: number | null = conversion.gramos

  if (gramos === null) {
    return errorJSON(
      'No fue posible convertir la cantidad a gramos. Verifica la unidad_medida o la configuración de densidad/peso unitario del producto.',
      400
    )
  }

  // ── 6. Registrar merma y movimiento de forma atómica ───────
  const { data: mermaRPC, error: mermaError } = await supabase.rpc('registrar_merma_completa', {
    p_restaurante_id: perfil.restaurante_id,
    p_producto_id: datos.producto_id,
    p_cantidad: datos.cantidad,
    p_unidad_medida: datos.unidad_medida,
    p_motivo: datos.motivo,
    p_responsable_id: datos.responsable_id ?? perfil.id,
    p_notas: datos.notas,
  })
  const merma = Array.isArray(mermaRPC) ? mermaRPC[0] : mermaRPC
  if (mermaError || !merma) {
    console.error('[ChefOS/api/mermas] Error al registrar merma:', mermaError?.message)
    return errorJSON('Error al registrar la merma. Intenta nuevamente.', 500)
  }

  // ── 7. Respuesta exitosa ────────────────────────────────────
  return NextResponse.json(
    { data: merma, error: null },
    { status: 201 }
  )
}
